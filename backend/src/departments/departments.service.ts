import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateDepartmentRelationDto } from './dto/create-department-relation.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      include: {
        children: { select: { id: true, name: true } },
        outgoingRelations: {
          include: { toDepartment: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(departmentId: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        users: { select: { id: true, name: true, phoneNumber: true } },
        outgoingRelations: {
          include: { toDepartment: { select: { id: true, name: true } } },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async update(departmentId: string, dto: UpdateDepartmentDto) {
    await this.findOne(departmentId);
    return this.prisma.department.update({
      where: { id: departmentId },
      data: dto,
    });
  }

  async remove(departmentId: string) {
    await this.findOne(departmentId);
    await this.prisma.department.delete({ where: { id: departmentId } });
  }

  async createRelation(dto: CreateDepartmentRelationDto) {
    try {
      return await this.prisma.departmentRelation.create({ data: dto });
    } catch {
      throw new ConflictException('This relation already exists');
    }
  }

  async removeRelation(relationId: string) {
    const rel = await this.prisma.departmentRelation.findUnique({
      where: { id: relationId },
    });
    if (!rel) throw new NotFoundException('Relation not found');
    await this.prisma.departmentRelation.delete({ where: { id: relationId } });
  }
}
