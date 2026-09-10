import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  findAll() {
    return this.tariffsService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTariffDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tariffsService.create(dto, actor.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTariffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tariffsService.update(id, dto, actor.id);
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tariffsService.deactivate(id, actor.id);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tariffsService.activate(id, actor.id);
  }
}
