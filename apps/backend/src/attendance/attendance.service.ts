import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async verifyEventAccess(userId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
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
      throw new ForbiddenException('Você não tem permissão para gerenciar este evento.');
    }

    return event;
  }

  async signUpPublic(createAttendanceDto: CreateAttendanceDto) {
    const { eventId, name, role, playerId } = createAttendanceDto;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }
    if (event.status === 'FINISHED') {
      throw new ConflictException('Este evento já foi encerrado.');
    }

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        eventId,
        name: {
          equals: name.trim(),
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Um jogador com este nome já está na lista deste evento.');
    }

    return this.prisma.attendance.create({
      data: {
        eventId,
        name: name.trim(),
        role: role || 'LINE',
        playerId,
        status: 'PRE_LIST',
      },
    });
  }

  async create(userId: string, createAttendanceDto: CreateAttendanceDto) {
    await this.verifyEventAccess(userId, createAttendanceDto.eventId);

    const { eventId, name, role, playerId, status } = createAttendanceDto;

    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        eventId,
        name: {
          equals: name.trim(),
        },
      },
    });

    if (existingAttendance) {
      throw new ConflictException('Um jogador com este nome já está na lista.');
    }

    return this.prisma.attendance.create({
      data: {
        eventId,
        name: name.trim(),
        role: role || 'LINE',
        playerId,
        status: status || 'PRESENT',
      },
    });
  }

  async update(userId: string, id: string, updateAttendanceDto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            pelada: {
              include: { admins: true },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Presença não encontrada.');
    }

    const isOwner = attendance.event.pelada.ownerId === userId;
    const isAuxAdmin = attendance.event.pelada.admins.some((admin) => admin.userId === userId);
    if (!isOwner && !isAuxAdmin) {
      throw new ForbiddenException('Você não tem permissão para gerenciar esta lista.');
    }

    return this.prisma.attendance.update({
      where: { id },
      data: updateAttendanceDto,
    });
  }

  async remove(userId: string, id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            pelada: {
              include: { admins: true },
            },
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Presença não encontrada.');
    }

    const isOwner = attendance.event.pelada.ownerId === userId;
    const isAuxAdmin = attendance.event.pelada.admins.some((admin) => admin.userId === userId);
    if (!isOwner && !isAuxAdmin) {
      throw new ForbiddenException('Você não tem permissão para alterar esta lista.');
    }

    return this.prisma.attendance.delete({
      where: { id },
    });
  }
}
