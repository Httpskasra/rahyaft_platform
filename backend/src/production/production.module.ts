import { Module } from '@nestjs/common';
import { FormSubmissionsModule } from '../form-submissions/form-submissions.module';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [FormSubmissionsModule],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
