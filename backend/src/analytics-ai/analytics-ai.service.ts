import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AiAnalyticsSource = 'forms-overview' | 'form' | 'repairs';

export interface AiAnalyticsResult {
  available: boolean;
  provider: 'openai-compatible' | 'ollama' | 'none';
  model: string | null;
  generatedAt: string;
  summary: string;
  findings: Array<{ title: string; detail: string; severity: 'info' | 'warning' | 'critical' | 'positive' }>;
  recommendations: Array<{ title: string; detail: string; priority: 'low' | 'medium' | 'high' }>;
  answer?: string;
  groundedMetrics: string[];
  disclaimer?: string;
}

@Injectable()
export class AnalyticsAiService {
  constructor(private readonly config: ConfigService) {}

  async summarize(source: AiAnalyticsSource, rawContext: unknown): Promise<AiAnalyticsResult> {
    const context = this.sanitizeContext(source, rawContext);
    return this.callModel(source, context, undefined);
  }

  async ask(source: AiAnalyticsSource, question: string, rawContext: unknown): Promise<AiAnalyticsResult> {
    const context = this.sanitizeContext(source, rawContext);
    return this.callModel(source, context, question.trim());
  }

  private providerConfig() {
    const baseUrl = (this.config.get<string>('AI_ANALYTICS_BASE_URL') || '').replace(/\/$/, '');
    const apiKey = this.config.get<string>('AI_ANALYTICS_API_KEY') || '';
    const model = this.config.get<string>('AI_ANALYTICS_MODEL') || '';
    if (baseUrl && model) return { provider: 'openai-compatible' as const, baseUrl, apiKey, model };

    const ollamaBase = (this.config.get<string>('OLLAMA_BASE_URL') || '').replace(/\/$/, '');
    const ollamaModel = this.config.get<string>('OLLAMA_MODEL') || '';
    if (ollamaBase && ollamaModel) return { provider: 'ollama' as const, baseUrl: ollamaBase, apiKey: '', model: ollamaModel };

    return { provider: 'none' as const, baseUrl: '', apiKey: '', model: '' };
  }

  private async callModel(source: AiAnalyticsSource, context: unknown, question?: string): Promise<AiAnalyticsResult> {
    const cfg = this.providerConfig();
    if (cfg.provider === 'none') return this.unavailable('AI Analytics provider is not configured.');

    const language = this.config.get<string>('AI_ANALYTICS_LANGUAGE') || 'fa';
    const system = [
      'You are an enterprise analytics assistant.',
      'Use ONLY the supplied aggregated analytics context. Never invent database facts, causes, people, or percentages.',
      'Separate observed facts from hypotheses. If evidence is insufficient, explicitly say so.',
      'Do not claim causal relationships merely from correlation.',
      'Recommendations must be operational and tied to supplied evidence.',
      language === 'fa' ? 'Write all user-facing text in Persian.' : `Write user-facing text in ${language}.`,
      'Return JSON that matches the supplied schema. Do not add markdown or prose outside JSON.',
      'Keep the response concise: at most 5 findings, 5 recommendations, and 8 grounded metrics. Each detail should be at most 2 short sentences.',
    ].join('\n');
    const user = JSON.stringify({ source, question: question || null, analyticsContext: context });

    try {
      const text = cfg.provider === 'ollama'
        ? await this.callOllama(cfg.baseUrl, cfg.model, system, user)
        : await this.callOpenAiCompatible(cfg.baseUrl, cfg.apiKey, cfg.model, system, user);
      const parsed = this.parseJson(text);
      return {
        available: true,
        provider: cfg.provider,
        model: cfg.model,
        generatedAt: new Date().toISOString(),
        summary: this.asText(parsed.summary, 'تحلیل هوش مصنوعی آماده شد.'),
        findings: this.normalizeFindings(parsed.findings),
        recommendations: this.normalizeRecommendations(parsed.recommendations),
        answer: question ? this.asText(parsed.answer, this.asText(parsed.summary, '')) : undefined,
        groundedMetrics: Array.isArray(parsed.groundedMetrics) ? parsed.groundedMetrics.slice(0, 12).map(String) : [],
        disclaimer: 'این تحلیل فقط بر اساس KPIها و داده‌های تجمیعی ارسال‌شده به مدل تولید شده است.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI provider error';
      return this.unavailable(message, cfg.provider, cfg.model);
    }
  }

  private analyticsSchema() {
    return {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        findings: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              severity: { type: 'string', enum: ['info', 'warning', 'critical', 'positive'] },
            },
            required: ['title', 'detail', 'severity'],
            additionalProperties: false,
          },
        },
        recommendations: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['title', 'detail', 'priority'],
            additionalProperties: false,
          },
        },
        answer: { type: 'string' },
        groundedMetrics: { type: 'array', maxItems: 8, items: { type: 'string' } },
      },
      required: ['summary', 'findings', 'recommendations', 'answer', 'groundedMetrics'],
      additionalProperties: false,
    };
  }

  private async callOpenAiCompatible(baseUrl: string, apiKey: string, model: string, system: string, user: string) {
    // AvalAI currently recommends the Responses API for new structured-output integrations.
    // We try /responses first, then fall back to Chat Completions JSON mode for models/routes
    // that do not fully support Responses structured output.
    const style = (this.config.get<string>('AI_ANALYTICS_API_STYLE') || 'auto').toLowerCase();
    // Cloudflare models exposed by AvalAI are most reliable through Chat Completions.
    // Do not waste a request on /responses when auto mode is used with cf.* models.
    const isCloudflareModel = model.startsWith('cf.');
    const preferResponses = style === 'responses' || (style === 'auto' && baseUrl.includes('avalai.ir') && !isCloudflareModel);

    if (preferResponses) {
      try {
        return await this.callResponsesApi(baseUrl, apiKey, model, system, user);
      } catch (error) {
        if (style === 'responses') throw error;
        // Fall through only when auto mode selected a route that this model does not support.
      }
    }

    try {
      return await this.callChatCompletions(baseUrl, apiKey, model, system, user, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A truncated response, rate limit, auth error, timeout, etc. must not trigger
      // a second expensive request. Only retry when structured response_format itself
      // appears unsupported by the provider/model.
      const responseFormatUnsupported = /response_format|json_schema|structured output|unsupported|not supported/i.test(message)
        && !/finish_reason=length|429|401|403|timeout|aborted/i.test(message);
      if (!responseFormatUnsupported) throw error;
      return await this.callChatCompletions(baseUrl, apiKey, model, system, user, false);
    }
  }

  private async callResponsesApi(baseUrl: string, apiKey: string, model: string, system: string, user: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(this.config.get('AI_ANALYTICS_TIMEOUT_MS') || 45000));
    try {
      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({
          model,
          instructions: system,
          input: user,
          max_output_tokens: this.maxOutputTokens(),
          text: {
            format: {
              type: 'json_schema',
              name: 'analytics_result_v1',
              strict: true,
              schema: this.analyticsSchema(),
            },
          },
        }),
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`AI /responses returned ${response.status}: ${raw.slice(0, 500)}`);
      const json = JSON.parse(raw) as any;
      if (json?.status === 'incomplete') {
        throw new Error(`AI response incomplete: ${json?.incomplete_details?.reason || 'unknown reason'}`);
      }
      const refusal = this.extractResponsesRefusal(json?.output);
      if (refusal) throw new Error(`AI model refused: ${refusal}`);
      const outputText = typeof json?.output_text === 'string' ? json.output_text : this.extractResponsesText(json?.output);
      if (!outputText) throw new Error('AI /responses returned no output_text');
      return outputText;
    } finally { clearTimeout(timeout); }
  }

  private async callChatCompletions(baseUrl: string, apiKey: string, model: string, system: string, user: string, strictSchema: boolean) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(this.config.get('AI_ANALYTICS_TIMEOUT_MS') || 45000));
    try {
      const responseFormat = strictSchema
        ? { type: 'json_schema', json_schema: { name: 'analytics_result_v1', strict: true, schema: this.analyticsSchema() } }
        : { type: 'json_object' };
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          max_completion_tokens: this.maxOutputTokens(),
          response_format: responseFormat,
        }),
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`AI /chat/completions returned ${response.status}: ${raw.slice(0, 500)}`);
      const json = JSON.parse(raw) as any;
      const choice = json?.choices?.[0];
      if (choice?.message?.refusal) throw new Error(`AI model refused: ${choice.message.refusal}`);
      if (choice?.finish_reason && !['stop', 'tool_calls'].includes(choice.finish_reason)) {
        throw new Error(`AI response ended with finish_reason=${choice.finish_reason}`);
      }
      const content = choice?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('AI chat response had no text content');
      return content;
    } finally { clearTimeout(timeout); }
  }


  private maxOutputTokens(): number {
    const configured = Number(this.config.get('AI_ANALYTICS_MAX_OUTPUT_TOKENS') || 8192);
    if (!Number.isFinite(configured)) return 8192;
    return Math.max(1024, Math.min(Math.trunc(configured), 32768));
  }

  private extractResponsesText(output: any): string {
    if (!Array.isArray(output)) return '';
    const chunks: string[] = [];
    for (const item of output) {
      if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
      for (const part of item.content) {
        if (part?.type === 'output_text' && typeof part?.text === 'string') chunks.push(part.text);
      }
    }
    return chunks.join('\n');
  }

  private extractResponsesRefusal(output: any): string {
    if (!Array.isArray(output)) return '';
    for (const item of output) {
      if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
      for (const part of item.content) {
        if (part?.type === 'refusal') return String(part?.refusal || 'refused');
      }
    }
    return '';
  }

  private async callOllama(baseUrl: string, model: string, system: string, user: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(this.config.get('AI_ANALYTICS_TIMEOUT_MS') || 45000));
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ model, stream: false, format: 'json', options: { temperature: 0.15 }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const json = await response.json() as any;
      return String(json?.message?.content || '');
    } finally { clearTimeout(timeout); }
  }

  private sanitizeContext(source: AiAnalyticsSource, raw: any) {
    const includeIdentifiers = String(this.config.get('AI_ANALYTICS_INCLUDE_IDENTIFIERS') || 'false').toLowerCase() === 'true';
    if (!raw || typeof raw !== 'object') return {};
    if (source === 'repairs') {
      return {
        range: raw.range,
        kpis: raw.kpis,
        comparison: raw.comparison,
        trend: raw.trend,
        sla: raw.sla ? { ...raw.sla, breaches: (raw.sla.breaches || []).slice(0, 10).map((x: any) => ({
          type: x.type, status: x.status, targetHours: x.targetHours, overdueHours: x.overdueHours, atRisk: x.atRisk,
          ...(includeIdentifiers ? { caseNumber: x.caseNumber, technician: x.technician } : {}),
        })) } : undefined,
        aging: raw.aging,
        statusDuration: raw.statusDuration,
        visits: raw.visits,
        technicians: (raw.technicians || []).map((x: any, i: number) => ({
          label: includeIdentifiers ? x.name : `Technician ${i + 1}`,
          assigned: x.assigned, open: x.open, completed: x.completed, mttrDays: x.mttrDays,
          visits: x.visits, firstVisitFixRate: x.firstVisitFixRate, secondVisitRate: x.secondVisitRate,
        })),
        insights: (raw.insights || []).slice(0, 10),
        anomalies: (raw.anomalies || []).slice(0, 10),
      };
    }
    if (source === 'form') {
      return {
        range: raw.range,
        form: { name: raw.form?.name, customId: raw.form?.customId },
        kpis: raw.kpis,
        comparison: raw.comparison,
        trend: raw.trend,
        statusDistribution: raw.statusDistribution,
        approvalFunnel: raw.approvalFunnel,
        bottleneck: raw.bottleneck,
        fieldAnalytics: (raw.fieldAnalytics || []).slice(0, 20).map((x: any) => ({
          label: x.label, type: x.type, required: x.required, fillRate: x.fillRate, numeric: x.numeric,
          distribution: x.distribution?.slice?.(0, 6), dateDistribution: x.dateDistribution, text: x.text,
        })),
        sla: raw.sla ? { ...raw.sla, breaches: (raw.sla.breaches || []).slice(0, 10).map((x: any) => ({ status: x.status, targetHours: x.targetHours, overdueHours: x.overdueHours })) } : undefined,
        insights: (raw.insights || []).slice(0, 10),
        anomalies: (raw.anomalies || []).slice(0, 10),
      };
    }
    return { range: raw.range, kpis: raw.kpis, trend: raw.trend, forms: raw.forms, insights: raw.insights, anomalies: raw.anomalies };
  }

  private parseJson(text: string): any {
    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(cleaned); } catch {
      const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
      throw new Error('AI response was not valid JSON');
    }
  }

  private normalizeFindings(value: any) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 8).map((x: any) => ({
      title: this.asText(x?.title, 'یافته'), detail: this.asText(x?.detail, ''),
      severity: ['info', 'warning', 'critical', 'positive'].includes(x?.severity) ? x.severity : 'info',
    }));
  }
  private normalizeRecommendations(value: any) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 8).map((x: any) => ({
      title: this.asText(x?.title, 'پیشنهاد'), detail: this.asText(x?.detail, ''),
      priority: ['low', 'medium', 'high'].includes(x?.priority) ? x.priority : 'medium',
    }));
  }
  private asText(value: any, fallback: string) { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
  private unavailable(reason: string, provider: AiAnalyticsResult['provider'] = 'none', model: string | null = null): AiAnalyticsResult {
    return { available: false, provider, model, generatedAt: new Date().toISOString(), summary: 'سرویس AI Analytics در دسترس نیست.', findings: [], recommendations: [], groundedMetrics: [], disclaimer: reason };
  }
}
