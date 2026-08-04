import { BadRequestException, Injectable } from '@nestjs/common';

type Field = { key: string; type: string; required?: boolean; min?: number; max?: number; options?: Array<{value:string}> };
type Schema = { sections?: Array<{ fields?: Field[] }> };
@Injectable()
export class RecruitmentSchemaService {
  validate(schema: unknown, answers: Record<string, unknown>): void {
    if (!schema || typeof schema !== 'object') throw new BadRequestException('Invalid form schema');
    const fields = ((schema as Schema).sections ?? []).flatMap((s) => s.fields ?? []);
    const keys = new Set<string>();
    for (const field of fields) {
      if (!field.key || keys.has(field.key)) throw new BadRequestException('Invalid or duplicate field key');
      keys.add(field.key);
      const value = answers[field.key];
      if (field.required && (value === undefined || value === null || value === '')) throw new BadRequestException(`Field '${field.key}' is required`);
      if (value === undefined || value === null || value === '') continue;
      if (field.type === 'number' || field.type === 'rating') {
        const n=Number(value); if (!Number.isFinite(n)) throw new BadRequestException(`Field '${field.key}' must be numeric`);
        if (field.min != null && n < field.min) throw new BadRequestException(`Field '${field.key}' is below minimum`);
        if (field.max != null && n > field.max) throw new BadRequestException(`Field '${field.key}' is above maximum`);
      }
      if (field.type === 'select' && field.options?.length && !field.options.some(o=>o.value===value)) throw new BadRequestException(`Invalid option for '${field.key}'`);
    }
    for (const key of Object.keys(answers)) if (!keys.has(key)) throw new BadRequestException(`Unknown field '${key}'`);
  }
}
