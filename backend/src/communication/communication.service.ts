import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthenticatedUser,
  PermissionEntry,
} from '../common/interfaces/auth.interface';
import {
  DepartmentRelationType,
  ScopeType,
  ThreadActivityType,
  ThreadParticipantRole,
  ThreadStatus,
} from '../generated/prisma/enums';
import {
  AddParticipantDto,
  AssignThreadDto,
  CreateMessageDto,
  CreateThreadDto,
  QueryMessagesDto,
  QueryThreadsDto,
  UpdateThreadDto,
} from './dto/communication.dto';

const userSummary = {
  id: true,
  name: true,
  departmentId: true,
} as const;

const detailMessageLimit = 30;

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  listPeople() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createThread(dto: CreateThreadDto, user: AuthenticatedUser) {
    const participantIds = [...new Set(dto.participantIds ?? [])].filter(
      (id) => id !== user.id,
    );
    const assigneeIds = [...new Set(dto.assigneeIds ?? [])].filter(
      (id) => id !== user.id,
    );
    await this.assertUsersExist([...new Set([...participantIds, ...assigneeIds])]);

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { id: true },
      });
      if (!department) throw new NotFoundException('Department not found');
    }

    const threadId = await this.prisma.$transaction(async (tx) => {
      const thread = await tx.thread.create({
        data: {
          title: dto.title.trim(),
          type: dto.type,
          priority: dto.priority,
          departmentId: dto.departmentId ?? user.departmentId ?? undefined,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          creatorId: user.id,
          participants: {
            create: [
              { userId: user.id, role: ThreadParticipantRole.OWNER },
              ...participantIds.map((userId) => ({
                userId,
                role: assigneeIds.includes(userId)
                  ? ThreadParticipantRole.ASSIGNEE
                  : ThreadParticipantRole.PARTICIPANT,
              })),
              ...assigneeIds
                .filter((id) => !participantIds.includes(id))
                .map((userId) => ({
                  userId,
                  role: ThreadParticipantRole.ASSIGNEE,
                })),
            ],
          },
          assignments: {
            create: assigneeIds.map((userId) => ({
              userId,
              assignedById: user.id,
            })),
          },
        },
      });

      await tx.threadActivity.create({
        data: {
          threadId: thread.id,
          actorId: user.id,
          type: ThreadActivityType.THREAD_CREATED,
        },
      });
      if (dto.initialMessage?.trim()) {
        await tx.threadMessage.create({
          data: {
            threadId: thread.id,
            senderId: user.id,
            body: dto.initialMessage.trim(),
          },
        });
        await tx.threadActivity.create({
          data: {
            threadId: thread.id,
            actorId: user.id,
            type: ThreadActivityType.MESSAGE_SENT,
          },
        });
      }
      return thread.id;
    });
    return this.getThreadInternal(threadId);
  }

  async listThreads(
    query: QueryThreadsDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const access = await this.buildThreadScopeWhere(user, permission);
    const where: Record<string, unknown> = { AND: [access] };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        {
          messages: {
            some: { body: { contains: query.search, mode: 'insensitive' } },
          },
        },
      ];
    }
    if (query.view === 'assigned') {
      where.assignments = { some: { userId: user.id, completedAt: null } };
    } else if (query.view === 'created') {
      where.creatorId = user.id;
    } else if (query.view === 'waiting') {
      where.status = ThreadStatus.WAITING;
    } else if (query.view === 'resolved') {
      where.status = { in: [ThreadStatus.RESOLVED, ThreadStatus.CLOSED] };
    }

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.thread.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          creator: { select: userSummary },
          participants: {
            where: { userId: user.id, leftAt: null },
            select: { lastReadAt: true },
          },
          assignments: {
            where: { completedAt: null },
            include: { assignee: { select: userSummary } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            include: { sender: { select: userSummary } },
          },
          _count: { select: { messages: true, participants: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    const items = rows.map((thread) => {
      const lastMessage = thread.messages[0] ?? null;
      const membership = thread.participants[0] ?? null;
      const lastReadAt = membership?.lastReadAt ?? null;
      return {
        ...thread,
        lastMessage,
        unread:
          !!membership &&
          !!lastMessage &&
          lastMessage.senderId !== user.id &&
          (!lastReadAt || lastMessage.createdAt > lastReadAt),
        messages: undefined,
        participants: undefined,
      };
    });
    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getInbox(user: AuthenticatedUser, permission: PermissionEntry) {
    const access = await this.buildThreadScopeWhere(user, permission);
    const membership = { participants: { some: { userId: user.id, leftAt: null } } };
    const [assigned, waiting, resolved, total, rows] = await Promise.all([
      this.prisma.thread.count({
        where: { AND: [access, membership], assignments: { some: { userId: user.id, completedAt: null } } },
      }),
      this.prisma.thread.count({ where: { AND: [access, membership], status: ThreadStatus.WAITING } }),
      this.prisma.thread.count({
        where: { AND: [access, membership], status: { in: [ThreadStatus.RESOLVED, ThreadStatus.CLOSED] } },
      }),
      this.prisma.thread.count({ where: { AND: [access, membership] } }),
      this.prisma.thread.findMany({
        where: { AND: [access, membership] },
        select: {
          participants: { where: { userId: user.id, leftAt: null }, select: { lastReadAt: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { createdAt: true, senderId: true },
          },
        },
      }),
    ]);
    const unread = rows.filter((row) => {
      const message = row.messages[0];
      const readAt = row.participants[0]?.lastReadAt;
      return message && message.senderId !== user.id && (!readAt || message.createdAt > readAt);
    }).length;
    return { total, assigned, waiting, resolved, unread };
  }

  async getThread(id: string, user: AuthenticatedUser, permission: PermissionEntry) {
    await this.assertAccess(id, user, permission);
    return this.getThreadInternal(id);
  }

  async listMessages(
    id: string,
    query: QueryMessagesDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const rows = await this.prisma.threadMessage.findMany({
      where: { threadId: id, deletedAt: null },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { sender: { select: userSummary } },
    });
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: [...pageRows].reverse(),
      pageInfo: {
        hasMore,
        nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null,
      },
    };
  }

  async updateThread(
    id: string,
    dto: UpdateThreadDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const before = await this.assertAccess(id, user, permission);
    const data = {
      title: dto.title?.trim(),
      status: dto.status,
      priority: dto.priority,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.thread.update({ where: { id }, data });
      const activities: { type: ThreadActivityType; metadata?: object }[] = [];
      if (dto.status && dto.status !== before.status) {
        activities.push({ type: ThreadActivityType.STATUS_CHANGED, metadata: { from: before.status, to: dto.status } });
      }
      if (dto.priority && dto.priority !== before.priority) {
        activities.push({ type: ThreadActivityType.PRIORITY_CHANGED, metadata: { from: before.priority, to: dto.priority } });
      }
      if (dto.dueAt) activities.push({ type: ThreadActivityType.DUE_DATE_CHANGED });
      if (dto.title) activities.push({ type: ThreadActivityType.THREAD_UPDATED });
      if (activities.length) {
        await tx.threadActivity.createMany({
          data: activities.map((activity) => ({
            threadId: id,
            actorId: user.id,
            type: activity.type,
            metadata: activity.metadata,
          })),
        });
      }
    });
    return this.getThreadInternal(id);
  }

  async addMessage(
    id: string,
    dto: CreateMessageDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission, true);
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.threadMessage.create({
        data: { threadId: id, senderId: user.id, body: dto.body.trim() },
        include: { sender: { select: userSummary } },
      });
      await tx.thread.update({ where: { id }, data: { updatedAt: new Date() } });
      await tx.threadParticipant.updateMany({
        where: { threadId: id, userId: user.id, leftAt: null },
        data: { lastReadAt: new Date() },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.MESSAGE_SENT },
      });
      return message;
    });
  }

  async addParticipant(
    id: string,
    dto: AddParticipantDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    await this.assertUsersExist([dto.userId]);
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: dto.role ?? ThreadParticipantRole.PARTICIPANT, joinedAt: new Date() },
        create: { threadId: id, userId: dto.userId, role: dto.role },
      });
      await tx.threadActivity.create({
        data: {
          threadId: id,
          actorId: user.id,
          type: ThreadActivityType.USER_ADDED,
          metadata: { userId: dto.userId },
        },
      });
    });
    return this.getThreadInternal(id);
  }

  async removeParticipant(
    id: string,
    participantId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    const thread = await this.assertAccess(id, user, permission);
    if (participantId === thread.creatorId) {
      throw new ForbiddenException('Thread owner cannot be removed');
    }
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: id, userId: participantId } },
      select: { leftAt: true },
    });
    if (!participant || participant.leftAt) throw new NotFoundException('Active participant not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.update({
        where: { threadId_userId: { threadId: id, userId: participantId } },
        data: { leftAt: new Date() },
      });
      await tx.threadAssignment.updateMany({
        where: { threadId: id, userId: participantId, completedAt: null },
        data: { completedAt: new Date() },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.USER_REMOVED, metadata: { userId: participantId } },
      });
    });
    return this.getThreadInternal(id);
  }

  async assign(
    id: string,
    dto: AssignThreadDto,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    await this.assertUsersExist([dto.userId]);
    const active = await this.prisma.threadAssignment.findFirst({
      where: { threadId: id, userId: dto.userId, completedAt: null },
      select: { id: true },
    });
    if (active) return this.getThreadInternal(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: ThreadParticipantRole.ASSIGNEE, joinedAt: new Date() },
        create: { threadId: id, userId: dto.userId, role: ThreadParticipantRole.ASSIGNEE },
      });
      await tx.threadAssignment.create({
        data: { threadId: id, userId: dto.userId, assignedById: user.id },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.ASSIGNEE_ADDED, metadata: { userId: dto.userId } },
      });
    });
    return this.getThreadInternal(id);
  }

  async unassign(
    id: string,
    assigneeId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const active = await this.prisma.threadAssignment.findFirst({
      where: { threadId: id, userId: assigneeId, completedAt: null },
      select: { id: true },
    });
    if (!active) throw new NotFoundException('Active assignment not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.threadAssignment.update({
        where: { id: active.id },
        data: { completedAt: new Date() },
      });
      await tx.threadParticipant.updateMany({
        where: { threadId: id, userId: assigneeId, role: ThreadParticipantRole.ASSIGNEE },
        data: { role: ThreadParticipantRole.PARTICIPANT },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.ASSIGNEE_REMOVED, metadata: { userId: assigneeId } },
      });
    });
    return this.getThreadInternal(id);
  }

  async markRead(
    id: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
  ) {
    await this.assertAccess(id, user, permission);
    const participant = await this.prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      select: { id: true, leftAt: true },
    });
    if (!participant || participant.leftAt) {
      return { lastReadAt: null, tracked: false };
    }
    const updated = await this.prisma.threadParticipant.update({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
      select: { lastReadAt: true },
    });
    return { ...updated, tracked: true };
  }

  private async assertUsersExist(ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new NotFoundException('One or more users were not found');
  }

  private async assertAccess(
    threadId: string,
    user: AuthenticatedUser,
    permission: PermissionEntry,
    requireMembership = false,
  ) {
    const scopeWhere = requireMembership
      ? { participants: { some: { userId: user.id, leftAt: null } } }
      : await this.buildThreadScopeWhere(user, permission);
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, AND: [scopeWhere] },
      select: {
        id: true,
        creatorId: true,
        status: true,
        priority: true,
        departmentId: true,
      },
    });
    if (!thread) {
      const exists = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Thread not found');
      throw new ForbiddenException(
        requireMembership
          ? 'Only active thread participants can send messages'
          : 'Permission scope does not cover this thread',
      );
    }
    return thread;
  }

  private async buildThreadScopeWhere(user: AuthenticatedUser, permission: PermissionEntry) {
    const membership = { participants: { some: { userId: user.id, leftAt: null } } };
    switch (permission.scope) {
      case ScopeType.ORG_WIDE:
        return {};
      case ScopeType.SELF:
        return membership;
      case ScopeType.TEAM:
        return { OR: [membership, { creator: { managerId: user.id } }] };
      case ScopeType.DEPARTMENT:
        return {
          OR: [
            membership,
            { departmentId: user.departmentId },
            { departmentId: null, creator: { departmentId: user.departmentId } },
          ],
        };
      case ScopeType.DEPARTMENT_SUBTREE: {
        const ids = [...(await this.getDepartmentSubtree(user.departmentId))];
        return {
          OR: [
            membership,
            { departmentId: { in: ids } },
            { departmentId: null, creator: { departmentId: { in: ids } } },
          ],
        };
      }
      case ScopeType.RELATED_DEPARTMENTS: {
        const ids = [...(await this.getRelatedDepartments(user.departmentId, permission.relationType))];
        return {
          OR: [
            membership,
            { departmentId: { in: ids } },
            { departmentId: null, creator: { departmentId: { in: ids } } },
          ],
        };
      }
      default:
        return membership;
    }
  }

  private async getDepartmentSubtree(departmentId: string) {
    const ids = new Set<string>();
    const queue = [departmentId];
    while (queue.length) {
      const current = queue.shift()!;
      if (ids.has(current)) continue;
      ids.add(current);
      const children = await this.prisma.department.findMany({
        where: { parentId: current },
        select: { id: true },
      });
      queue.push(...children.map((child) => child.id));
    }
    return ids;
  }

  private async getRelatedDepartments(
    departmentId: string,
    relationType: DepartmentRelationType | null,
  ) {
    const relations = await this.prisma.departmentRelation.findMany({
      where: {
        fromDepartmentId: departmentId,
        ...(relationType ? { type: relationType } : {}),
      },
      select: { toDepartmentId: true },
    });
    return new Set(relations.map((item) => item.toDepartmentId));
  }

  private async getThreadInternal(id: string) {
    const thread = await this.prisma.thread.findUniqueOrThrow({
      where: { id },
      include: {
        creator: { select: userSummary },
        department: { select: { id: true, name: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: userSummary } },
          orderBy: { joinedAt: 'asc' },
        },
        assignments: {
          where: { completedAt: null },
          include: {
            assignee: { select: userSummary },
            assignedBy: { select: userSummary },
          },
          orderBy: { assignedAt: 'asc' },
        },
        messages: {
          where: { deletedAt: null },
          include: { sender: { select: userSummary } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: detailMessageLimit + 1,
        },
        activities: {
          include: { actor: { select: userSummary } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const hasMoreMessages = thread.messages.length > detailMessageLimit;
    const pageMessages = hasMoreMessages
      ? thread.messages.slice(0, detailMessageLimit)
      : thread.messages;
    return {
      ...thread,
      messages: [...pageMessages].reverse(),
      messagePage: {
        hasMore: hasMoreMessages,
        nextCursor: hasMoreMessages ? pageMessages[pageMessages.length - 1]?.id ?? null : null,
      },
    };
  }
}
