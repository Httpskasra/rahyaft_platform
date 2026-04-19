import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormDto, ownerId: string) {
    return this.prisma.form.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        schema: dto.schema,
        version: 1,
      },
    });
  }

  async findAll(ownerId?: string) {
    return this.prisma.form.findMany({
      where: ownerId ? { ownerId, isActive: true } : { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
  }

  async findById(id: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        stats: true,
        analysis: true,
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async getStats(formId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    const [stats, analysis, submissionCount] = await Promise.all([
      this.prisma.formStat.findMany({ where: { formId } }),
      this.prisma.formAnalysis.findMany({
        where: { formId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.formSubmission.count({ where: { formId } }),
    ]);

    return { formId, submissionCount, stats, analysis };
  }

  /**
   * GET /forms/:id/deep-analysis
   *
   * Single round-trip that returns everything the frontend needs:
   *   - Form metadata + schema
   *   - All raw submissions with user info
   *   - All analytics results from the worker, keyed by metric name:
   *       riskAssessment, anomalyDetection, formCategory,
   *       domainClassification, domainInsights,
   *       completionHealth, trendAnalysis, predictions,
   *       submissionHistory
   *   - Per-field rolling stats  (statsByField[fieldId])
   *   - Per-field NLP corpus     (nlpByField[fieldId])
   */
  async getDeepAnalysis(formId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: {
        stats: true,
        analysis: true,
        _count: { select: { submissions: true } },
      },
    });
    if (!form) throw new NotFoundException('Form not found');

    const submissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
    });

    // ── Analytics lookup maps ──────────────────────────────────

    // Form-level metrics (fieldId IS NULL)
    const formLevelMetrics: Record<string, unknown> = {};
    // Per-field rolling stats
    const statsByField: Record<string, unknown> = {};
    // Per-field NLP corpus
    const nlpByField: Record<string, unknown> = {};

    for (const row of form.analysis) {
      if (!row.fieldId) {
        formLevelMetrics[row.metric] = row.value;
      } else if (row.metric === 'nlp_corpus') {
        nlpByField[row.fieldId] = row.value;
      }
    }

    for (const row of form.stats) {
      if (row.metric === 'rolling_stats') {
        statsByField[row.fieldId] = row.value;
      }
    }

    return {
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        schema: form.schema,
        version: form.version,
        isActive: form.isActive,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
      submissionCount: form._count.submissions,
      submissions,
      analytics: {
        riskAssessment:      formLevelMetrics['risk_assessment']      ?? null,
        anomalyDetection:    formLevelMetrics['anomaly_detection']     ?? null,
        formCategory:        formLevelMetrics['form_category']         ?? null,
        domainClassification:formLevelMetrics['domain_classification'] ?? null,
        domainInsights:      formLevelMetrics['domain_insights']       ?? null,
        completionHealth:    formLevelMetrics['completion_health']     ?? null,
        trendAnalysis:       formLevelMetrics['trend_analysis']        ?? null,
        predictions:         formLevelMetrics['predictions']           ?? null,
        submissionHistory:   formLevelMetrics['submission_history']    ?? null,
      },
      statsByField,
      nlpByField,
    };
  }

  async update(id: string, dto: UpdateFormDto, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== ownerId) throw new ForbiddenException();

    return this.prisma.form.update({
      where: { id },
      data: { ...dto, version: dto.schema ? form.version + 1 : form.version },
    });
  }

  async remove(id: string, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== ownerId) throw new ForbiddenException();

    await this.prisma.form.update({ where: { id }, data: { isActive: false } });
    return { message: 'Form deactivated' };
  }
}
