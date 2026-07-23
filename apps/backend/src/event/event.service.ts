import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  private async checkPeladaPermission(userId: string, peladaId: string) {
    const pelada = await this.prisma.pelada.findUnique({
      where: { id: peladaId },
      include: { admins: true },
    });

    if (!pelada) {
      throw new NotFoundException('Pelada não encontrada.');
    }

    const isOwner = pelada.ownerId === userId;
    const isAuxAdmin = pelada.admins.some((admin) => admin.userId === userId);

    if (!isOwner && !isAuxAdmin) {
      throw new ForbiddenException('Você não tem acesso a esta pelada.');
    }

    return pelada;
  }

  async create(userId: string, createEventDto: CreateEventDto) {
    const { peladaId, ...eventData } = createEventDto;
    await this.checkPeladaPermission(userId, peladaId);

    return this.prisma.event.create({
      data: {
        ...eventData,
        peladaId,
        date: new Date(createEventDto.date),
      },
    });
  }

  async findAll(userId: string, peladaId: string) {
    await this.checkPeladaPermission(userId, peladaId);

    return this.prisma.event.findMany({
      where: { peladaId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        pelada: {
          include: { admins: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }

    const isOwner = event.pelada.ownerId === userId;
    const isAuxAdmin = event.pelada.admins.some((admin) => admin.userId === userId);

    if (!isOwner && !isAuxAdmin) {
      throw new ForbiddenException('Você não tem acesso a este evento.');
    }

    return event;
  }

  async findOnePublic(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        attendances: {
          orderBy: { createdAt: 'asc' },
        },
        pelada: {
          select: {
            name: true,
            playersPerTeam: true,
            useGoalkeepers: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }

    return event;
  }

  async update(userId: string, id: string, updateEventDto: UpdateEventDto) {
    const event = await this.findOne(userId, id);
    const { date, ...data } = updateEventDto;

    return this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        date: date ? new Date(date) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.event.delete({
      where: { id },
    });
  }
}
