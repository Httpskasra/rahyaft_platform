import { Module } from '@nestjs/common';
import { RecruitmentAdminController } from './recruitment-admin.controller';
import { RecruitmentController } from './recruitment.controller';
import { PublicRecruitmentController } from './public-recruitment.controller';
import { RecruitmentSchemaService } from './recruitment-schema.service';
import { RecruitmentService } from './recruitment.service';
@Module({controllers:[PublicRecruitmentController,RecruitmentController,RecruitmentAdminController],providers:[RecruitmentService,RecruitmentSchemaService]})
export class RecruitmentModule {}
