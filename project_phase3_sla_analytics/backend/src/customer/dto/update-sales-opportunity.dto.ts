import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesOpportunityDto } from './create-sales-opportunity.dto';

export class UpdateSalesOpportunityDto extends PartialType(
  CreateSalesOpportunityDto,
) {}
