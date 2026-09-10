import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/types';
import { LeadsService } from '../leads.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  async create(leadId: string, dto: CreateInteractionDto, user: AuthenticatedUser) {
    // Ownership + existence check reused from LeadsService — the single source of
    // truth for "can this user touch this lead" (see LeadsService.findOneOrThrow).
    await this.leadsService.findOneOrThrow(leadId, user);

    return this.prisma.interaction.create({
      data: {
        leadId,
        authorUserId: user.id,
        type: dto.type,
        comment: dto.comment,
        occurredAt: dto.occurredAt ?? new Date(),
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
