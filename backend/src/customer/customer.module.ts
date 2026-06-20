import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService], // برای استفاده در ماژول repair-case
})
export class CustomerModule {}
