import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvaluationKind } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateTotalScore, labelForScore } from '../common/scoring';
import {
  CreateQuestionDto,
  SubmitEvaluationDto,
  UpdateQuestionDto,
  UpdateTemplateDto,
} from './dto/evaluation.dto';

const DEFAULT_TITLES: Record<EvaluationKind, string> = {
  INITIAL: 'چک لیست ارزیابی اولیه تامین کننده',
  PERIODIC: 'چک لیست ارزیابی دوره ای تامین کننده',
};

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── فرم‌ها (قالب) ───────────────

  /** هر دو فرم همیشه وجود دارند؛ اگر نبودند ساخته می‌شوند */
  private async ensureTemplate(kind: EvaluationKind) {
    return this.prisma.evaluationTemplate.upsert({
      where: { kind },
      update: {},
      create: { kind, title: DEFAULT_TITLES[kind] },
    });
  }

  async getTemplate(kind: EvaluationKind) {
    await this.ensureTemplate(kind);
    return this.prisma.evaluationTemplate.findUniqueOrThrow({
      where: { kind },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async listTemplates() {
    return Promise.all(
      (Object.values(EvaluationKind) as EvaluationKind[]).map((k) =>
        this.getTemplate(k),
      ),
    );
  }

  async updateTemplate(kind: EvaluationKind, dto: UpdateTemplateDto) {
    const current = await this.ensureTemplate(kind);
    const white = dto.whiteMinScore ?? current.whiteMinScore;
    const gray = dto.grayMinScore ?? current.grayMinScore;
    if (gray > white) {
      throw new BadRequestException(
        'حد خاکستری نمی‌تواند بیشتر از حد سفید باشد',
      );
    }
    await this.prisma.evaluationTemplate.update({
      where: { kind },
      data: dto,
    });
    return this.getTemplate(kind);
  }

  // ─────────────── سوال‌ها ───────────────

  async addQuestion(kind: EvaluationKind, dto: CreateQuestionDto) {
    const tpl = await this.ensureTemplate(kind);
    const last = await this.prisma.evaluationQuestion.findFirst({
      where: { templateId: tpl.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.evaluationQuestion.create({
      data: { ...dto, templateId: tpl.id, order: (last?.order ?? -1) + 1 },
    });
  }

  private async findQuestion(kind: EvaluationKind, id: string) {
    const q = await this.prisma.evaluationQuestion.findFirst({
      where: { id, template: { kind } },
    });
    if (!q) throw new NotFoundException('سوال یافت نشد');
    return q;
  }

  async updateQuestion(kind: EvaluationKind, id: string, dto: UpdateQuestionDto) {
    await this.findQuestion(kind, id);
    return this.prisma.evaluationQuestion.update({ where: { id }, data: dto });
  }

  /** پاسخ‌های قبلی snapshot دارند؛ حذف سوال به ارزیابی‌های گذشته آسیب نمی‌زند */
  async removeQuestion(kind: EvaluationKind, id: string) {
    await this.findQuestion(kind, id);
    await this.prisma.evaluationQuestion.delete({ where: { id } });
    return { deleted: true };
  }

  async reorderQuestions(kind: EvaluationKind, questionIds: string[]) {
    const tpl = await this.ensureTemplate(kind);
    const existing = await this.prisma.evaluationQuestion.findMany({
      where: { templateId: tpl.id },
      select: { id: true },
    });
    const ids = new Set(existing.map((q) => q.id));
    if (
      questionIds.length !== ids.size ||
      questionIds.some((id) => !ids.has(id))
    ) {
      throw new BadRequestException('لیست سوال‌ها با سوال‌های فرم مطابقت ندارد');
    }
    await this.prisma.$transaction(
      questionIds.map((id, order) =>
        this.prisma.evaluationQuestion.update({ where: { id }, data: { order } }),
      ),
    );
    return this.getTemplate(kind);
  }

  // ─────────────── ثبت ارزیابی ───────────────

  async submit(
    supplierId: string,
    kind: EvaluationKind,
    dto: SubmitEvaluationDto,
    evaluatorId?: string,
  ) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('تامین‌کننده یافت نشد');

    const tpl = await this.getTemplate(kind);
    const questions = tpl.questions.filter((q) => q.isActive);
    if (!questions.length) {
      throw new BadRequestException('این فرم هنوز سوالی ندارد');
    }

    const byId = new Map(dto.answers.map((a) => [a.questionId, a]));
    if (byId.size !== dto.answers.length) {
      throw new BadRequestException('برای یک سوال بیش از یک پاسخ ارسال شده است');
    }
    const unknown = dto.answers.filter(
      (a) => !questions.some((q) => q.id === a.questionId),
    );
    if (unknown.length) {
      throw new BadRequestException('پاسخ برای سوال نامعتبر ارسال شده است');
    }
    const missing = questions.filter((q) => !byId.has(q.id));
    if (missing.length) {
      throw new BadRequestException(
        `به این سوال‌ها پاسخ داده نشده است: ${missing.map((q) => q.title).join('، ')}`,
      );
    }

    const rows = questions.map((q) => {
      const a = byId.get(q.id)!;
      return {
        questionId: q.id,
        questionTitle: q.title,
        weight: q.weight,
        score: a.score,
        note: a.note,
      };
    });

    const totalScore = calculateTotalScore(rows);
    const label = labelForScore(totalScore, tpl.whiteMinScore, tpl.grayMinScore);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const evaluation = await tx.supplierEvaluation.create({
        data: {
          supplierId,
          templateId: tpl.id,
          kind,
          totalScore,
          label,
          note: dto.note,
          evaluatorId,
          evaluatedAt: now,
          answers: { create: rows },
        },
        include: { answers: true },
      });
      await tx.supplier.update({
        where: { id: supplierId },
        data: { score: totalScore, label, lastEvaluatedAt: now },
      });
      return evaluation;
    });
  }

  async listForSupplier(supplierId: string, kind?: EvaluationKind) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('تامین‌کننده یافت نشد');
    return this.prisma.supplierEvaluation.findMany({
      where: { supplierId, ...(kind ? { kind } : {}) },
      orderBy: { evaluatedAt: 'desc' },
      include: { answers: true },
    });
  }
}
