import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { RecruitmentAction, RecruitmentStage } from '../generated/prisma/enums';
import { AssignInterviewerDto, FinalApproveDto, ReviewDto, SubmitStageFormDto, TechnicalInterviewDto } from './dto/recruitment.dto';
import { RecruitmentService } from './recruitment.service';
@Controller('recruitment/applications')
export class RecruitmentController {
 constructor(private readonly service:RecruitmentService){}
 @Get() @RequirePermission({action:'read',resource:'recruitment-applications'}) list(){return this.service.listApplications()}
 @Get(':id') @RequirePermission({action:'read',resource:'recruitment-applications'}) one(@Param('id') id:string){return this.service.getApplication(id)}
 @Post(':id/approve-initial') @RequirePermission({action:'review-initial',resource:'recruitment-applications'}) approve(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:ReviewDto){return this.service.approveInitial(id,u.id,d)}
 @Post(':id/reject-initial') @RequirePermission({action:'review-initial',resource:'recruitment-applications'}) rejectInitial(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:ReviewDto){return this.service.reject(id,u.id,RecruitmentStage.INITIAL_REVIEW,RecruitmentAction.REJECT_INITIAL_REVIEW,d)}
 @Post(':id/initial-interview') @RequirePermission({action:'conduct-initial-interview',resource:'recruitment-applications'}) initial(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:SubmitStageFormDto){return this.service.submitInitial(id,u.id,d)}
 @Post(':id/assign-technical-interviewer') @RequirePermission({action:'assign-technical-interviewer',resource:'recruitment-applications'}) assign(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:AssignInterviewerDto){return this.service.assignInterviewer(id,u.id,d)}
 @Post(':id/technical-interview') @RequirePermission({action:'conduct-technical-interview',resource:'recruitment-interviews'}) technical(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:TechnicalInterviewDto){return this.service.submitTechnical(id,u.id,d)}
 @Post(':id/final-approve') @RequirePermission({action:'final-approve',resource:'recruitment-applications'}) final(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() d:FinalApproveDto){return this.service.finalApprove(id,u.id,d)}
}
