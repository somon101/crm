import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { InteractionsService } from './interactions/interactions.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, InteractionsService],
  exports: [LeadsService],
})
export class LeadsModule {}
