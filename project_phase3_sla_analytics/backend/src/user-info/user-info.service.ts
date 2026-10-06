import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInfoDto } from './dto/create-user-info.dto';
import { UpdateUserInfoDto } from './dto/update-user-info.dto';

@Injectable()
export class UserInfoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateUserInfoDto) {
    const { relatives, ...infoData } = dto;

    return this.prisma.userInfo.create({
      data: {
        userId,
        ...infoData,
        relatives: relatives ? { create: relatives } : undefined,
      },
      include: { relatives: true },
    });
  }

  async findMine(userId: string) {
    const info = await this.prisma.userInfo.findUnique({
      where: { userId },
      include: { relatives: true },
    });

    if (!info) throw new NotFoundException('اطلاعاتی ثبت نشده است');
    return info;
  }

  async update(userId: string, dto: UpdateUserInfoDto) {
    const existing = await this.prisma.userInfo.findUnique({
      where: { userId },
    });

    if (!existing) throw new NotFoundException('اطلاعاتی ثبت نشده است');

    const { relatives, ...infoData } = dto;

    return this.prisma.userInfo.update({
      where: { userId },
      data: {
        ...infoData,
        relatives: relatives
          ? {
              deleteMany: {}, // حذف بستگان قبلی
              create: relatives, // ثبت بستگان جدید
            }
          : undefined,
      },
      include: { relatives: true },
    });
  }

  async remove(userId: string) {
    const existing = await this.prisma.userInfo.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException('اطلاعاتی ثبت نشده است');

    return this.prisma.userInfo.delete({ where: { userId } });
  }
}
