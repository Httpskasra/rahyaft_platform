import { Global, Module } from '@nestjs/common';
import { AnalyticsAiService } from './analytics-ai.service';

@Global()
@Module({ providers: [AnalyticsAiService], exports: [AnalyticsAiService] })
export class AnalyticsAiModule {}
