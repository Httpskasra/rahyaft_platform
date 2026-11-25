import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../../common/shared/access.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EvaluationType, SupplierKind } from '../../generated/prisma/enums';
import { computeScore, labelForScore } from '../common/scoring';
import { supplierDisplayName } from '../suppliers/suppliers.service';
import { PreviewEvaluationDto, SaveTemplateDto, ScoreSettingDto, SubmitEvaluationDto } from './dto/evaluation.dto';

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class EvaluationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvaluationService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── periodic reminder (no purchase → every 3 months) ──
  onModuleInit() {
    const every = Number(process.env.SUPPLIER_REMINDER_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
    if (every <= 0) return;
    this.timer = setInterval(() => {
      this.runReminders().catch((e) => this.logger.error(`reminder run failed: ${(e as Error).message}`));
    }, every);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Notifies evaluators about suppliers whose last evaluation (or creation) is older than 3 months. */
  async runReminders() {
    const threshold = new Date(Date.now() - THREE_MONTHS_MS);
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ lastEvaluatedAt: { lt: threshold } }, { lastEvaluatedAt: null, createdAt: { lt: threshold } }] },
          { OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: threshold } }] },
        ],
      },
    });
    if (!suppliers.length) return { reminded: 0 };
    const evaluators = await this.access.userIdsWithPermission('supplier-evaluations', 'create');
    for (const s of suppliers) {
      await this.notifications.notifyUsers(evaluators, {
        type: 'SUPPLIER_PERIODIC_EVALUATION_DUE',
        category: 'COMMERCE',
        title: 'یادآوری ارزیابی دوره‌ای تامین‌کننده',
        body: `بیش از ۳ ماه از آخرین ارزیابی «${supplierDisplayName(s)}» گذشته است.`,
        entityType: 'Supplier',
        entityId: s.id,
      });
      await this.prisma.supplier.update({ where: { id: s.id }, data: { lastReminderAt: new Date() } });
    }
    return { reminded: suppliers.length };
  }

  // ── settings ──
  async getSettings() {
    const row = await this.prisma.supplierScoreSetting.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} });
    return { whiteMin: Number(row.whiteMin), grayMin: Number(row.grayMin), updatedAt: row.updatedAt };
  }

  async saveSettings(dto: ScoreSettingDto, userId: string) {
    if (dto.grayMin >= dto.whiteMin) throw new BadRequestException('حد خاکستری باید کمتر از حد سفید باشد');
    await this.prisma.supplierScoreSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', whiteMin: dto.whiteMin, grayMin: dto.grayMin, updatedById: userId },
      update: { whiteMin: dto.whiteMin, grayMin: dto.grayMin, updatedById: userId },
    });
    return this.getSettings();
  }

  // ── templates (form builder) ──
  async listTemplates(supplierKind?: SupplierKind, type?: EvaluationType) {
    return this.prisma.evaluationTemplate.findMany({
      where: { isActive: true, ...(supplierKind ? { supplierKind } : {}), ...(type ? { type } : {}) },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: [{ supplierKind: 'asc' }, { type: 'asc' }],
    });
  }

  async templateHistory(supplierKind: SupplierKind, type: EvaluationType) {
    return this.prisma.evaluationTemplate.findMany({
      where: { supplierKind, type },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: { version: 'desc' },
    });
  }

  /** Saving always creates a NEW version so past evaluations keep their original questions. */
  async saveTemplate(supplierKind: SupplierKind, type: EvaluationType, dto: SaveTemplateDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.evaluationTemplate.findFirst({ where: { supplierKind, type }, orderBy: { version: 'desc' } });
      await tx.evaluationTemplate.updateMany({ where: { supplierKind, type, isActive: true }, data: { isActive: false } });
      return tx.evaluationTemplate.create({
        data: {
          supplierKind, type, version: (last?.version ?? 0) + 1, isActive: true,
          title: dto.title, description: dto.description, createdById: userId,
          questions: {
            create: dto.questions.map((q, i) => ({
              order: i + 1, text: q.text, weight: q.weight,
              guide: { '0': q.guide['0'], '1': q.guide['1'], '2': q.guide['2'], '3': q.guide['3'] },
            })),
          },
        },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    });
  }

  private async activeTemplate(supplierKind: SupplierKind, type: EvaluationType) {
    const t = await this.prisma.evaluationTemplate.findFirst({
      where: { supplierKind, type, isActive: true },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!t) throw new NotFoundException('هنوز فرم ارزیابی برای این نوع تامین‌کننده تعریف نشده است');
    return t;
  }

  private scoreAnswers(template: { questions: any[] }, answers: { questionId: string; score: number }[]) {
    const byId = new Map(answers.map((a) => [a.questionId, a.score]));
    if (byId.size !== answers.length) throw new BadRequestException('پاسخ تکراری برای یک سوال ارسال شده است');
    const unknown = answers.filter((a) => !template.questions.some((q) => q.id === a.questionId));
    if (unknown.length) throw new BadRequestException('سوال نامعتبر در پاسخ‌ها وجود دارد');
    const missing = template.questions.filter((q) => !byId.has(q.id));
    if (missing.length) throw new BadRequestException(`به ${missing.length} سوال پاسخ داده نشده است`);
    const rows = template.questions.map((q) => ({
      questionId: q.id as string, questionText: q.text as string, weight: Number(q.weight), score: byId.get(q.id)!,
    }));
    return { rows, score: computeScore(rows) };
  }

  async preview(dto: PreviewEvaluationDto) {
    const template = await this.activeTemplate(dto.supplierKind, dto.type);
    const { score } = this.scoreAnswers(template, dto.answers);
    const setting = await this.getSettings();
    return { score, label: labelForScore(score, setting) };
  }

  async submit(supplierId: string, dto: SubmitEvaluationDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('تامین‌کننده یافت نشد');
    const template = await this.activeTemplate(supplier.kind, dto.type);
    const { rows, score } = this.scoreAnswers(template, dto.answers);
    const setting = await this.getSettings();
    const label = labelForScore(score, setting);

    return this.prisma.$transaction(async (tx) => {
      const evaluation = await tx.supplierEvaluation.create({
        data: {
          supplierId, templateId: template.id, type: dto.type, score, label, notes: dto.notes, evaluatedById: userId,
          answers: { create: rows },
        },
        include: { answers: true },
      });
      await tx.supplier.update({
        where: { id: supplierId },
        data: { score, label, lastEvaluatedAt: new Date(), ...(dto.type === EvaluationType.PERIODIC ? { periodicDueAt: null } : {}) },
      });
      return evaluation;
    });
  }

  async listForSupplier(supplierId: string) {
    return this.prisma.supplierEvaluation.findMany({
      where: { supplierId },
      include: { answers: true, template: { select: { id: true, title: true, version: true } } },
      orderBy: { evaluatedAt: 'desc' },
    });
  }
}
