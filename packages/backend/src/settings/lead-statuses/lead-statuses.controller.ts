import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types';
import { LeadStatusesService } from './lead-statuses.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@Controller('lead-statuses')
export class LeadStatusesController {
  constructor(private readonly service: LeadStatusesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateLeadStatusDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.deactivate(id, actor.id);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.activate(id, actor.id);
  }
}
