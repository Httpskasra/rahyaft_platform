import { IsObject, IsUUID } from 'class-validator';
import type { JsOutputValue } from '@prisma/client/runtime/client';

export class CreateSubmissionDto {
  @IsUUID()
  formId: string;

  @IsObject()
  // data: Record<string, unknown>;
  data: JsOutputValue | null;
}
