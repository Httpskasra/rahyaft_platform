import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateDepartmentRelationDto } from './dto/create-department-relation.dto';
import { OrganizationChartResponse } from './interfaces/organization-chart.interface';
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

  async create(dto: CreateDepartmentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: {
          id: dto.parentId,
        },
        select: {
          id: true,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async update(departmentId: string, dto: UpdateDepartmentDto) {
    await this.findOne(departmentId);

    if (dto.parentId !== undefined) {
      await this.ensureValidDepartmentParent(departmentId, dto.parentId);
    }

    return this.prisma.department.update({
      where: {
        id: departmentId,
      },
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
  async getOrganizationChart(): Promise<OrganizationChartResponse> {
    const [departments, users, departmentRelations] = await Promise.all([
      this.prisma.department.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),

      this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          employeeCode: true,
          departmentId: true,
          managerId: true,

          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          _count: {
            select: {
              subordinates: true,
            },
          },
        },

        orderBy: [
          {
            departmentId: 'asc',
          },
          {
            name: 'asc',
          },
        ],
      }),

      this.prisma.departmentRelation.findMany({
        select: {
          id: true,
          fromDepartmentId: true,
          toDepartmentId: true,
          type: true,
        },
      }),
    ]);

    const usersByDepartment = new Map<string, Array<(typeof users)[number]>>();

    for (const user of users) {
      const currentUsers = usersByDepartment.get(user.departmentId) ?? [];
      currentUsers.push(user);
      usersByDepartment.set(user.departmentId, currentUsers);
    }

    const chartDepartments = departments.map((department) => {
      const departmentUsers = usersByDepartment.get(department.id) ?? [];

      return {
        id: department.id,
        name: department.name,
        parentId: department.parentId,

        // فعلاً هر دو برابر هستند.
        // در صورت نیاز employeeCount را بعداً می‌توانیم شامل زیرمجموعه‌ها کنیم.
        employeeCount: departmentUsers.length,
        directEmployeeCount: departmentUsers.length,

        employees: departmentUsers.map((user) => ({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          employeeCode: user.employeeCode,
          departmentId: user.departmentId,
          managerId: user.managerId,

          roles: user.roles.map(({ role }) => ({
            id: role.id,
            name: role.name,
          })),

          subordinateCount: user._count.subordinates,
        })),
      };
    });

    const employeeRelations = users
      .filter((user) => user.managerId !== null)
      .map((user) => ({
        sourceUserId: user.managerId as string,
        targetUserId: user.id,
        type: 'MANAGES' as const,
      }));

    return {
      departments: chartDepartments,

      relations: {
        departments: departmentRelations.map((relation) => ({
          id: relation.id,
          sourceDepartmentId: relation.fromDepartmentId,
          targetDepartmentId: relation.toDepartmentId,
          type: relation.type,
        })),

        employees: employeeRelations,
      },

      statistics: {
        totalDepartments: departments.length,
        totalEmployees: users.length,
        rootDepartments: departments.filter(
          (department) => department.parentId === null,
        ).length,
        employeesWithoutManager: users.filter((user) => user.managerId === null)
          .length,
      },

      generatedAt: new Date().toISOString(),
    };
  }
  private async ensureValidDepartmentParent(
    departmentId: string,
    parentId: string | null | undefined,
  ): Promise<void> {
    if (!parentId) return;

    if (departmentId === parentId) {
      throw new ConflictException('Department cannot be its own parent');
    }

    const parent = await this.prisma.department.findUnique({
      where: {
        id: parentId,
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent department not found');
    }

    let currentParentId: string | null = parent.parentId;

    while (currentParentId) {
      if (currentParentId === departmentId) {
        throw new ConflictException(
          'Department hierarchy cycle is not allowed',
        );
      }

      const currentParent = await this.prisma.department.findUnique({
        where: {
          id: currentParentId,
        },
        select: {
          parentId: true,
        },
      });

      currentParentId = currentParent?.parentId ?? null;
    }
  }
}
