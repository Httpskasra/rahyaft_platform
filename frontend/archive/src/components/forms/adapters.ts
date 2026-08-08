import type { SharedFormField, SharedFormSchema } from './schema';

/** Converts the existing internal-form schema to the shared renderer contract. */
export function internalFormSchemaToShared(input: unknown): SharedFormSchema {
  const raw = input as { title?: string; description?: string; fields?: Array<Record<string, unknown>> };
  return {
    title: raw.title,
    description: raw.description,
    sections: [{
      fields: (raw.fields ?? [])
        .filter((field) => typeof field.id === 'string' && typeof field.label === 'string')
        .map((field) => ({
          key: String(field.id),
          label: String(field.label),
          type: normalizeType(String(field.type ?? 'text')),
          required: Boolean(field.required),
          placeholder: typeof field.placeholder === 'string' ? field.placeholder : undefined,
          min: typeof field.min === 'number' ? field.min : undefined,
          max: typeof field.max === 'number' ? field.max : undefined,
          options: Array.isArray(field.options)
            ? field.options.map((option) => typeof option === 'string'
              ? { label: option, value: option }
              : { label: String((option as Record<string, unknown>).label ?? ''), value: String((option as Record<string, unknown>).value ?? '') })
            : undefined,
        })),
    }],
  };
}

function normalizeType(type: string): SharedFormField['type'] {
  if (['textarea','number','email','tel','date','select','checkbox','rating'].includes(type)) return type as SharedFormField['type'];
  return 'text';
}
