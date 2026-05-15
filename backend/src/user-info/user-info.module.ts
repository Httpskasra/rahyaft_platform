import { Module } from '@nestjs/common';
import { UserInfoService } from './user-info.service';
import { UserInfoController } from './user-info.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserInfoController],
  providers: [UserInfoService],
})
export class UserInfoModule {}