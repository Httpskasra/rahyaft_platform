/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class FormSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async create(dto: CreateSubmissionDto, userId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: dto.formId, isActive: true },
    });
    if (!form) throw new NotFoundException('Form not found');

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        userId,
        data: dto.data,
      },
    });

    // Publish to RabbitMQ for async analytics processing
    // This is fire-and-forget — analytics failure won't break submission
    this.rabbit
      .publish({
        id: submission.id,
        formId: submission.formId,
        formVersion: submission.formVersion,
        userId: submission.userId ?? undefined,
        data: submission.data as Record<string, unknown>,
        createdAt: submission.createdAt.toISOString(),
      })
      .catch((err) =>
        console.error('RabbitMQ publish error (non-fatal):', err),
      );

    return submission;
  }

  async findByForm(formId: string) {
    return this.prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.formSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        form: { select: { id: true, name: true } },
      },
    });
  }
}
