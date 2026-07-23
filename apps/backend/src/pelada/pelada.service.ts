import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeladaDto } from './dto/create-pelada.dto';
import { UpdatePeladaDto } from './dto/update-pelada.dto';

@Injectable()
export class PeladaService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPeladaDto: CreatePeladaDto) {
    return this.prisma.pelada.create({
      data: {
        ...createPeladaDto,
        ownerId: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.pelada.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            admins: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        admins: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const pelada = await this.prisma.pelada.findUnique({
      where: { id },
      include: {
        admins: true,
      },
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

  async update(userId: string, id: string, updatePeladaDto: UpdatePeladaDto) {
    const pelada = await this.findOne(userId, id);

    const isOwner = pelada.ownerId === userId;
    const adminConfig = pelada.admins.find((admin) => admin.userId === userId);
    const canManage = isOwner || (adminConfig && adminConfig.canManage);

    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para alterar as configurações desta pelada.');
    }

    return this.prisma.pelada.update({
      where: { id },
      data: updatePeladaDto,
    });
  }

  async remove(userId: string, id: string) {
    const pelada = await this.findOne(userId, id);

    if (pelada.ownerId !== userId) {
      throw new ForbiddenException('Apenas o proprietário pode excluir esta pelada.');
    }

    return this.prisma.pelada.delete({
      where: { id },
    });
  }
}
