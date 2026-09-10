import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('manager')
  getManagerDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getManagerDashboard(user.id);
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  @Get('admin/managers/:id')
  @Roles(Role.ADMIN)
  getManagerDrilldown(@Param('id') id: string) {
    return this.dashboardService.getManagerDashboard(id);
  }
}
