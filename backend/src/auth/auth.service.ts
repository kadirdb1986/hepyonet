import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const supabase = this.supabaseService.getClient();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseId: authData.user.id,
          email: dto.email,
          name: dto.name,
        },
      });

      let restaurantId: string | null = null;
      if (dto.restaurantName) {
        const slug = this.generateSlug(dto.restaurantName);
        const restaurant = await tx.restaurant.create({
          data: {
            name: dto.restaurantName,
            slug,
            status: 'PENDING',
          },
        });

        await tx.restaurantMember.create({
          data: {
            userId: user.id,
            restaurantId: restaurant.id,
            role: 'OWNER',
          },
        });

        restaurantId = restaurant.id;
      }

      return { user, restaurantId };
    });

    return {
      message: dto.restaurantName
        ? 'Registration successful. Your restaurant is pending approval.'
        : 'Registration successful.',
      userId: result.user.id,
      restaurantId: result.restaurantId,
    };
  }

  async login(dto: LoginDto) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { supabaseId: data.user.id },
      include: {
        memberships: {
          where: { isActive: true },
          include: { restaurant: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
      user: this.formatUserResponse(user),
    };
  }

  async refreshToken(refreshToken: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    };
  }

  async forgotPassword(email: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Password reset email sent' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { restaurant: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUserResponse(user);
  }

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
      memberships: (user.memberships || []).map((m: any) => ({
        restaurantId: m.restaurant.id,
        restaurantName: m.restaurant.name,
        restaurantSlug: m.restaurant.slug,
        restaurantStatus: m.restaurant.status,
        role: m.role,
      })),
    };
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
