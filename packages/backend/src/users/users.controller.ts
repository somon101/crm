import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findByIdOrThrow(id);
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Post(':id/block')
  block(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.block(id, actor.id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.activate(id, actor.id);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(id, dto.newPassword, actor.id);
  }
}
