import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types';
import { LossReasonsService } from './loss-reasons.service';
import { CreateLossReasonDto } from './dto/create-loss-reason.dto';
import { UpdateLossReasonDto } from './dto/update-loss-reason.dto';

@Controller('loss-reasons')
export class LossReasonsController {
  constructor(private readonly service: LossReasonsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateLossReasonDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLossReasonDto,
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
