import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';
import { InteractionsService } from './interactions/interactions.service';
import { CreateInteractionDto } from './interactions/dto/create-interaction.dto';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly interactionsService: InteractionsService,
  ) {}

  @Get()
  findAll(@Query() query: QueryLeadsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findAll(user, query);
  }

  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findOneOrThrow(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.leadsService.softDelete(id, user.id);
    return { success: true };
  }

  @Post(':id/reassign')
  @Roles(Role.ADMIN)
  reassign(
    @Param('id') id: string,
    @Body() dto: ReassignLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.reassign(id, dto, user.id);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.getTimeline(id, user);
  }

  @Post(':id/interactions')
  addInteraction(
    @Param('id') id: string,
    @Body() dto: CreateInteractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.interactionsService.create(id, dto, user);
  }
}
