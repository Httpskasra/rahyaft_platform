import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsPhoneNumber, IsString, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { InterviewRecommendation, RecruitmentFormType } from '../../generated/prisma/enums';

export class CreateRecruitmentFormTemplateDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(RecruitmentFormType) type: RecruitmentFormType;
  @IsObject() schema: Record<string, unknown>;
}
export class CreateRecruitmentFormVersionDto { @IsObject() schema: Record<string, unknown>; }
export class CreateJobOpeningDto {
  @IsString() @MinLength(2) title: string;
  @IsString() @MinLength(2) slug: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsUUID() preInterviewFormId: string;
  @IsOptional() @IsUUID() initialInterviewFormId?: string;
  @IsOptional() @IsUUID() technicalInterviewFormId?: string;
  @IsOptional() @IsUUID() initialReviewerRoleId?: string;
}
export class PublicCreateApplicationDto {
  @IsString() @MinLength(3) fullName: string;
  @IsString() @MinLength(10) phoneNumber: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() nationalCode?: string;
  @IsUUID() formVersionId: string;
  @IsObject() answers: Record<string, unknown>;
}
export class ReviewDto {
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() publicMessage?: string;
}
export class SubmitStageFormDto {
  @IsUUID() formVersionId: string;
  @IsObject() answers: Record<string, unknown>;
}
export class AssignInterviewerDto { @IsUUID() interviewerId: string; }
export class TechnicalInterviewDto extends SubmitStageFormDto {
  @IsInt() @Min(0) @Max(100) overallScore: number;
  @IsEnum(InterviewRecommendation) recommendation: InterviewRecommendation;
  @IsString() @MinLength(3) internalSummary: string;
}
export class FinalApproveDto {
  @IsUUID() departmentId: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsString() employeeCode?: string;
}
