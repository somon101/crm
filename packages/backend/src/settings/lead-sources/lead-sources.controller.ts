import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types';
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Controller('lead-sources')
export class LeadSourcesController {
  constructor(private readonly service: LeadSourcesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateLeadSourceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadSourceDto,
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
