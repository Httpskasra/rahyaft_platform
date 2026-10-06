import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreateJobOpeningDto, CreateRecruitmentFormTemplateDto, CreateRecruitmentFormVersionDto, UpdateJobOpeningDto } from './dto/recruitment.dto';
import { RecruitmentService } from './recruitment.service';
@Controller('recruitment/admin')
@RequirePermission({action:'manage',resource:'recruitment-settings'})
export class RecruitmentAdminController {
 constructor(private readonly service:RecruitmentService){}
 @Get('forms') forms(){return this.service.listTemplates()}
 @Post('forms') createForm(@Body() dto:CreateRecruitmentFormTemplateDto){return this.service.createTemplate(dto)}
 @Post('forms/:templateId/versions') createVersion(@Param('templateId') templateId:string,@Body() dto:CreateRecruitmentFormVersionDto){return this.service.createTemplateVersion(templateId,dto)}
 @Post('forms/versions/:id/publish') publish(@Param('id') id:string){return this.service.publishVersion(id)}
 @Get('jobs') jobs(){return this.service.listJobs()}
 @Post('jobs') createJob(@Body() dto:CreateJobOpeningDto){return this.service.createJob(dto)}
 @Patch('jobs/:id') updateJob(@Param('id') id:string,@Body() dto:UpdateJobOpeningDto){return this.service.updateJob(id,dto)}
}
