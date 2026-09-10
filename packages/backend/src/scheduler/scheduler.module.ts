import { Module } from '@nestjs/common';
import { ReminderSchedulerService } from './reminder-scheduler.service';

@Module({
  providers: [ReminderSchedulerService],
  exports: [ReminderSchedulerService],
})
export class SchedulerModule {}
