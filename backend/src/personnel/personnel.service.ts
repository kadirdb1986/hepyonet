import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: string, dto: CreatePersonnelDto) {
    return this.prisma.personnel.create({
      data: {
        restaurantId,
        name: dto.name,
        surname: dto.surname,
        phone: dto.phone,
        tcNo: dto.tcNo,
        positionId: dto.positionId || null,
        startDate: new Date(dto.startDate),
        salary: new Prisma.Decimal(dto.salary),
      },
    });
  }

  async findAll(restaurantId: string) {
    return this.prisma.personnel.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: { positionConfig: true },
    });
  }

  async findById(id: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
      include: {
        positionConfig: true,
        leaveRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return personnel;
  }

  async update(id: string, restaurantId: string, dto: UpdatePersonnelDto) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.surname !== undefined) data.surname = dto.surname;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.tcNo !== undefined) data.tcNo = dto.tcNo;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.salary !== undefined) data.salary = new Prisma.Decimal(dto.salary);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if ('positionId' in dto) data.positionId = dto.positionId || null;

    return this.prisma.personnel.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return this.prisma.personnel.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async permanentDelete(id: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    if (personnel.isActive) {
      throw new BadRequestException('Aktif personel silinemez. Once pasife alin.');
    }

    await this.prisma.leaveRecord.deleteMany({
      where: { personnelId: id },
    });

    return this.prisma.personnel.delete({
      where: { id },
    });
  }

  // --- Leave Management ---

  async createLeave(personnelId: string, restaurantId: string, dto: CreateLeaveDto) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('Bitis tarihi baslangic tarihinden once olamaz');
    }

    const overlapping = await this.prisma.leaveRecord.findFirst({
      where: {
        personnelId,
        status: { not: 'REJECTED' },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Bu tarih araliginda zaten bir izin kaydi mevcut');
    }

    return this.prisma.leaveRecord.create({
      data: {
        restaurantId,
        personnelId,
        startDate,
        endDate,
        type: dto.type,
        notes: dto.notes,
      },
    });
  }

  async getLeaves(personnelId: string, restaurantId: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    return this.prisma.leaveRecord.findMany({
      where: { personnelId, restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLeaveStatus(
    personnelId: string,
    leaveId: string,
    restaurantId: string,
    dto: UpdateLeaveStatusDto,
  ) {
    const leave = await this.prisma.leaveRecord.findFirst({
      where: { id: leaveId, personnelId, restaurantId },
    });

    if (!leave) {
      throw new NotFoundException('Izin kaydi bulunamadi');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Sadece bekleyen izinler guncellenebilir');
    }

    return this.prisma.leaveRecord.update({
      where: { id: leaveId },
      data: { status: dto.status },
    });
  }

  // --- Work Days Tracking ---

  async getWorkDays(personnelId: string, restaurantId: string, month?: string) {
    const personnel = await this.prisma.personnel.findFirst({
      where: { id: personnelId, restaurantId },
    });

    if (!personnel) {
      throw new NotFoundException('Personel bulunamadi');
    }

    let startOfMonth: Date;
    let endOfMonth: Date;

    if (month) {
      const [year, m] = month.split('-').map(Number);
      startOfMonth = new Date(year, m - 1, 1);
      endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const approvedLeaves = await this.prisma.leaveRecord.findMany({
      where: {
        personnelId,
        status: 'APPROVED',
        OR: [
          {
            startDate: { lte: endOfMonth },
            endDate: { gte: startOfMonth },
          },
        ],
      },
    });

    let leaveDays = 0;
    for (const leave of approvedLeaves) {
      const leaveStart = leave.startDate > startOfMonth ? leave.startDate : startOfMonth;
      const leaveEnd = leave.endDate < endOfMonth ? leave.endDate : endOfMonth;
      const diffTime = leaveEnd.getTime() - leaveStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      leaveDays += diffDays;
    }

    const totalDaysInMonth = endOfMonth.getDate();

    let weekends = 0;
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) {
        weekends++;
      }
    }

    const businessDays = totalDaysInMonth - weekends;
    const workDays = Math.max(0, businessDays - leaveDays);

    return {
      personnelId,
      month: month || `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      totalDaysInMonth,
      weekends,
      businessDays,
      leaveDays,
      workDays,
      approvedLeaves: approvedLeaves.map((l) => ({
        id: l.id,
        startDate: l.startDate,
        endDate: l.endDate,
        type: l.type,
      })),
    };
  }
}
