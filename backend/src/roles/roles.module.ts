import { Module } from '@nestjs/common';
import { RoleAdvisorService } from './role-advisor.service';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RoleAdvisorService],
  exports: [RolesService],
})
export class RolesModule {}
