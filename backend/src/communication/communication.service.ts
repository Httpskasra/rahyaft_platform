import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import {
  ThreadActivityType,
  ThreadParticipantRole,
  ThreadStatus,
} from '../generated/prisma/enums';
import {
  AddParticipantDto,
  AssignThreadDto,
  CreateMessageDto,
  CreateThreadDto,
  QueryThreadsDto,
  UpdateThreadDto,
} from './dto/communication.dto';

const userSummary = {
  id: true,
  name: true,
  departmentId: true,
} as const;

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
          departmentId: dto.departmentId,
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

  async listThreads(query: QueryThreadsDto, user: AuthenticatedUser) {
    const access = {
      participants: { some: { userId: user.id, leftAt: null } },
    };
    const where: Record<string, unknown> = { ...access };
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
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: { select: userSummary },
          participants: {
            where: { userId: user.id },
            select: { lastReadAt: true },
          },
          assignments: {
            where: { completedAt: null },
            include: { assignee: { select: userSummary } },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
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
      const lastReadAt = thread.participants[0]?.lastReadAt ?? null;
      return {
        ...thread,
        lastMessage,
        unread:
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

  async getInbox(user: AuthenticatedUser) {
    const membership = { participants: { some: { userId: user.id, leftAt: null } } };
    const [assigned, waiting, resolved, total, rows] = await Promise.all([
      this.prisma.thread.count({
        where: { ...membership, assignments: { some: { userId: user.id, completedAt: null } } },
      }),
      this.prisma.thread.count({ where: { ...membership, status: ThreadStatus.WAITING } }),
      this.prisma.thread.count({
        where: { ...membership, status: { in: [ThreadStatus.RESOLVED, ThreadStatus.CLOSED] } },
      }),
      this.prisma.thread.count({ where: membership }),
      this.prisma.thread.findMany({
        where: membership,
        select: {
          participants: { where: { userId: user.id }, select: { lastReadAt: true } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
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

  async getThread(id: string, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    return this.getThreadInternal(id);
  }

  async updateThread(id: string, dto: UpdateThreadDto, user: AuthenticatedUser) {
    const before = await this.assertAccess(id, user.id);
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

  async addMessage(id: string, dto: CreateMessageDto, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.threadMessage.create({
        data: { threadId: id, senderId: user.id, body: dto.body.trim() },
        include: { sender: { select: userSummary } },
      });
      await tx.thread.update({ where: { id }, data: { updatedAt: new Date() } });
      await tx.threadParticipant.update({
        where: { threadId_userId: { threadId: id, userId: user.id } },
        data: { lastReadAt: new Date() },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.MESSAGE_SENT },
      });
      return message;
    });
  }

  async addParticipant(id: string, dto: AddParticipantDto, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    await this.assertUsersExist([dto.userId]);
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: dto.role ?? ThreadParticipantRole.PARTICIPANT },
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

  async removeParticipant(id: string, participantId: string, user: AuthenticatedUser) {
    const thread = await this.assertAccess(id, user.id);
    if (participantId === thread.creatorId) {
      throw new ForbiddenException('Thread owner cannot be removed');
    }
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

  async assign(id: string, dto: AssignThreadDto, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    await this.assertUsersExist([dto.userId]);
    await this.prisma.$transaction(async (tx) => {
      await tx.threadParticipant.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { leftAt: null, role: ThreadParticipantRole.ASSIGNEE },
        create: { threadId: id, userId: dto.userId, role: ThreadParticipantRole.ASSIGNEE },
      });
      await tx.threadAssignment.upsert({
        where: { threadId_userId: { threadId: id, userId: dto.userId } },
        update: { completedAt: null, assignedAt: new Date(), assignedById: user.id },
        create: { threadId: id, userId: dto.userId, assignedById: user.id },
      });
      await tx.threadActivity.create({
        data: { threadId: id, actorId: user.id, type: ThreadActivityType.ASSIGNEE_ADDED, metadata: { userId: dto.userId } },
      });
    });
    return this.getThreadInternal(id);
  }

  async unassign(id: string, assigneeId: string, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.threadAssignment.update({
        where: { threadId_userId: { threadId: id, userId: assigneeId } },
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

  async markRead(id: string, user: AuthenticatedUser) {
    await this.assertAccess(id, user.id);
    const participant = await this.prisma.threadParticipant.update({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      data: { lastReadAt: new Date() },
      select: { lastReadAt: true },
    });
    return participant;
  }

  private async assertUsersExist(ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new NotFoundException('One or more users were not found');
  }

  private async assertAccess(threadId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        priority: true,
        participants: { where: { userId, leftAt: null }, select: { id: true } },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participants.length) throw new ForbiddenException('You are not a member of this thread');
    return thread;
  }

  private async getThreadInternal(id: string) {
    return this.prisma.thread.findUniqueOrThrow({
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
        },
        messages: {
          where: { deletedAt: null },
          include: { sender: { select: userSummary } },
          orderBy: { createdAt: 'asc' },
        },
        activities: {
          include: { actor: { select: userSummary } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
