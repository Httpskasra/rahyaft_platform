/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ApprovalsService } from 'src/approvals/approvals.service';

@Injectable()
export class FormSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMQService,
    private readonly approvalsService: ApprovalsService,
  ) {}
  private validateJalaliFields(
    schema: { fields: Array<{ id: string; type: string; required?: boolean }> },
    data: Record<string, unknown>,
  ) {
    // فرمت معتبر: 1403/05/21
    const jalaliRegex = /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;

    for (const field of schema.fields ?? []) {
      if (field.type !== 'jalali_date') continue;

      const value = data[field.id];

      if (field.required && !value) {
        throw new BadRequestException(`فیلد تاریخ "${field.id}" اجباری است`);
      }

      if (value && !jalaliRegex.test(String(value))) {
        throw new BadRequestException(
          `فرمت تاریخ شمسی برای فیلد "${field.id}" نامعتبر است (باید YYYY/MM/DD باشد)`,
        );
      }
    }
  }
  async create(dto: CreateSubmissionDto, userId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: dto.formId, isActive: true },
    });
    if (!form) throw new NotFoundException('Form not found');
    this.validateJalaliFields(
      form.schema as any,
      dto.data as Record<string, unknown>,
    );

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        formVersion: form.version,
        userId,
        data: dto.data,
      },
    });
    await this.approvalsService.createApprovalInstance(submission.id, form.id);

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
