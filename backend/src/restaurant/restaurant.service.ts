import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto, UpdateRestaurantSettingsDto } from './dto/update-restaurant.dto';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async update(id: string, dto: UpdateRestaurantDto) {
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }

  async updateSettings(id: string, dto: UpdateRestaurantSettingsDto) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    const currentSettings = (restaurant?.settings as Record<string, any>) || {};
    const mergedSettings = { ...currentSettings, ...dto.settings };
    return this.prisma.restaurant.update({
      where: { id },
      data: { settings: mergedSettings },
    });
  }

  async create(userId: string, dto: CreateRestaurantDto) {
    const slug = this.generateSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.name,
          slug,
          status: 'PENDING',
        },
      });

      await tx.restaurantMember.create({
        data: {
          userId,
          restaurantId: restaurant.id,
          role: 'OWNER',
        },
      });

      return restaurant;
    });
  }

  async getMyRestaurants(userId: string) {
    const memberships = await this.prisma.restaurantMember.findMany({
      where: { userId, isActive: true },
      include: { restaurant: true },
    });

    return memberships.map((m) => ({
      restaurantId: m.restaurant.id,
      restaurantName: m.restaurant.name,
      restaurantSlug: m.restaurant.slug,
      restaurantStatus: m.restaurant.status,
      role: m.role,
    }));
  }

  async getMembers(restaurantId: string) {
    const members = await this.prisma.restaurantMember.findMany({
      where: { restaurantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  }

  async addMember(restaurantId: string, dto: AddMemberDto) {
    if (dto.role === 'OWNER') {
      throw new BadRequestException('Cannot assign OWNER role directly. Use transfer-ownership.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!targetUser) {
      throw new BadRequestException('Bu kullanici sistemde bulunamadi.');
    }

    const existing = await this.prisma.restaurantMember.findUnique({
      where: {
        userId_restaurantId: {
          userId: targetUser.id,
          restaurantId,
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Bu kullanici zaten bu restoranda kayitli.');
      }
      // Re-activate deactivated member
      return this.prisma.restaurantMember.update({
        where: { id: existing.id },
        data: { isActive: true, role: dto.role },
      });
    }

    return this.prisma.restaurantMember.create({
      data: {
        userId: targetUser.id,
        restaurantId,
        role: dto.role,
      },
    });
  }

  async updateMemberRole(restaurantId: string, userId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change OWNER role. Use transfer-ownership.');
    }

    if (dto.role === 'OWNER') {
      throw new BadRequestException('Cannot assign OWNER role directly. Use transfer-ownership.');
    }

    return this.prisma.restaurantMember.update({
      where: { id: membership.id },
      data: { role: dto.role },
    });
  }

  async deactivateMember(restaurantId: string, userId: string) {
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot deactivate OWNER. Transfer ownership first.');
    }

    return this.prisma.restaurantMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    });
  }

  async removeMember(restaurantId: string, userId: string) {
    const membership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove OWNER. Transfer ownership first.');
    }

    if (membership.isActive) {
      throw new BadRequestException('Aktif kullanici silinemez. Once pasife alin.');
    }

    return this.prisma.restaurantMember.delete({
      where: { id: membership.id },
    });
  }

  async transferOwnership(restaurantId: string, currentUserId: string, dto: TransferOwnershipDto) {
    const currentMembership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: currentUserId, restaurantId } },
    });

    if (!currentMembership || currentMembership.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    const targetMembership = await this.prisma.restaurantMember.findUnique({
      where: { userId_restaurantId: { userId: dto.targetUserId, restaurantId } },
    });

    if (!targetMembership || !targetMembership.isActive) {
      throw new BadRequestException('Target user is not an active member of this restaurant');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.restaurantMember.update({
        where: { id: targetMembership.id },
        data: { role: 'OWNER' },
      });

      await tx.restaurantMember.update({
        where: { id: currentMembership.id },
        data: { role: 'ADMIN' },
      });

      return { message: 'Ownership transferred successfully' };
    });
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
