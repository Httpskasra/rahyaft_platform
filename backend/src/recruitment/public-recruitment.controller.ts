import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PublicCreateApplicationDto } from './dto/recruitment.dto';
import { RecruitmentService } from './recruitment.service';
@Controller('public/recruitment') @Public()
export class PublicRecruitmentController {
 constructor(private readonly service:RecruitmentService){}
 @Get('jobs') jobs(){return this.service.listPublicJobs()}
 @Get('jobs/:slug') job(@Param('slug') slug:string){return this.service.publicJob(slug)}
 @Post('jobs/:slug/applications') create(@Param('slug') slug:string,@Body() dto:PublicCreateApplicationDto){return this.service.createPublicApplication(slug,dto)}
 @Get('applications/:trackingCode/:token') status(@Param('trackingCode') code:string,@Param('token') token:string){return this.service.publicStatus(code,token)}
}
