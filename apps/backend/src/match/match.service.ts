import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateTeamsDto } from './dto/generate-teams.dto';

@Injectable()
export class MatchService {
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

  async generateTeams(userId: string, generateTeamsDto: GenerateTeamsDto) {
    const { eventId, method } = generateTeamsDto;
    const event = await this.verifyEventAccess(userId, eventId);

    // 1. Limpar times, partidas e gols anteriores deste evento
    await this.prisma.goal.deleteMany({
      where: { match: { eventId } },
    });
    await this.prisma.match.deleteMany({
      where: { eventId },
    });
    await this.prisma.team.deleteMany({
      where: { eventId },
    });

    // 2. Buscar todos os jogadores confirmados presentes
    const presentPlayers = await this.prisma.attendance.findMany({
      where: {
        eventId,
        status: 'PRESENT',
      },
      orderBy: { updatedAt: 'asc' }, // Ordem de chegada padrão
    });

    if (presentPlayers.length === 0) {
      throw new ConflictException('Nenhum jogador confirmado presente neste evento.');
    }

    // Separar linhas e goleiros
    let lines = presentPlayers.filter((p) => p.role === 'LINE');
    let goalkeepers = presentPlayers.filter((p) => p.role === 'GOALKEEPER');

    // 3. Aplicar sorteio (RANDOM) se solicitado
    if (method === 'RANDOM') {
      lines = this.shuffleArray(lines);
      goalkeepers = this.shuffleArray(goalkeepers);
    }

    const playersPerTeam = event.pelada.playersPerTeam;
    const useGoalkeepers = event.pelada.useGoalkeepers;

    // Calcular quantos times podemos formar
    const numTeams = Math.floor(lines.length / playersPerTeam);

    if (numTeams === 0) {
      throw new ConflictException(`Jogadores de linha insuficientes para formar ao menos 1 time de ${playersPerTeam} jogadores.`);
    }

    const teamsData = [];
    const colors = ['Azul', 'Vermelho', 'Verde', 'Branco', 'Preto', 'Amarelo', 'Cinza', 'Laranja'];

    // 4. Criar os times e associar jogadores
    for (let i = 0; i < numTeams; i++) {
      const teamName = `Time ${colors[i] || i + 1}`;
      const color = colors[i] || '#808080';
      
      // Os dois primeiros times começam jogando (PLAYING), os demais entram na fila (WAITING)
      const status = i < 2 ? 'PLAYING' : 'WAITING';

      // Criar time no banco
      const team = await this.prisma.team.create({
        data: {
          eventId,
          name: teamName,
          color,
          orderIndex: i,
          status,
        },
      });

      // Pegar fatias de jogadores de linha
      const teamLines = lines.slice(i * playersPerTeam, (i + 1) * playersPerTeam);
      
      // Associar linhas ao time
      for (const line of teamLines) {
        await this.prisma.attendance.update({
          where: { id: line.id },
          data: { teamId: team.id },
        });
      }

      // Se usa goleiro fixo e houver goleiro disponível para este time
      if (useGoalkeepers && goalkeepers[i]) {
        await this.prisma.attendance.update({
          where: { id: goalkeepers[i].id },
          data: { teamId: team.id },
        });
      }

      teamsData.push(team);
    }

    // Resetar o teamId dos jogadores restantes (que ficaram na reserva/banco)
    const usedLineCount = numTeams * playersPerTeam;
    const benchLines = lines.slice(usedLineCount);
    const benchGoalkeepers = useGoalkeepers ? goalkeepers.slice(numTeams) : goalkeepers;

    const benchPlayers = [...benchLines, ...benchGoalkeepers];
    for (const player of benchPlayers) {
      await this.prisma.attendance.update({
        where: { id: player.id },
        data: { teamId: null },
      });
    }

    return this.getEventState(eventId);
  }

  async getEventState(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        pelada: true,
        teams: {
          include: {
            players: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        matches: {
          orderBy: { orderIndex: 'desc' },
          take: 5, // Últimas 5 partidas
          include: {
            homeTeam: true,
            awayTeam: true,
            goals: {
              include: {
                scorer: true,
                assistant: true,
              },
            },
          },
        },
        attendances: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }

    const playingTeams = event.teams.filter((t) => t.status === 'PLAYING');
    const waitingQueue = event.teams.filter((t) => t.status === 'WAITING');
    const activeMatch = event.matches.find((m) => m.status === 'PLAYING');
    const benchPlayers = event.attendances.filter((a) => a.status === 'PRESENT' && a.teamId === null);

    return {
      eventId: event.id,
      name: event.name,
      status: event.status,
      pixKey: event.pixKey,
      pixValue: event.pixValue,
      configs: {
        playersPerTeam: event.pelada.playersPerTeam,
        useGoalkeepers: event.pelada.useGoalkeepers,
        matchTimeMinutes: event.pelada.matchTimeMinutes,
        matchGolLimit: event.pelada.matchGolLimit,
        drawRule: event.pelada.drawRule,
      },
      playingTeams,
      waitingQueue,
      activeMatch,
      benchPlayers,
      attendances: event.attendances,
      recentMatches: event.matches,
    };
  }

  async startMatch(userId: string, eventId: string) {
    await this.verifyEventAccess(userId, eventId);

    // Buscar se já tem partida ativa
    const activeMatch = await this.prisma.match.findFirst({
      where: { eventId, status: 'PLAYING' },
    });

    if (activeMatch) {
      throw new ConflictException('Já existe uma partida em andamento.');
    }

    // Buscar os dois times com status PLAYING
    const playingTeams = await this.prisma.team.findMany({
      where: { eventId, status: 'PLAYING' },
    });

    if (playingTeams.length < 2) {
      throw new ConflictException('Não há 2 times prontos em campo para iniciar a partida.');
    }

    // Determinar a ordem da partida
    const matchCount = await this.prisma.match.count({ where: { eventId } });

    // Criar a nova partida
    return this.prisma.match.create({
      data: {
        eventId,
        homeTeamId: playingTeams[0].id,
        awayTeamId: playingTeams[1].id,
        status: 'PLAYING',
        orderIndex: matchCount + 1,
        startedAt: new Date(),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });
  }

  async recordGoal(userId: string, matchId: string, teamId: string, scorerId: string, assistantId?: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        event: {
          include: { pelada: true },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }
    if (match.status !== 'PLAYING') {
      throw new ConflictException('Partida já finalizada ou ainda não iniciada.');
    }

    // Registrar o gol
    const goal = await this.prisma.goal.create({
      data: {
        matchId,
        teamId,
        scorerId,
        assistantId: assistantId || null,
      },
    });

    // Atualizar placar
    const isHome = match.homeTeamId === teamId;
    const updateData = isHome 
      ? { homeScore: match.homeScore + 1 }
      : { awayScore: match.awayScore + 1 };

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: updateData,
    });

    // Verificar se atingiu limite de gols da pelada
    const currentScore = isHome ? updatedMatch.homeScore : updatedMatch.awayScore;
    const golLimit = match.event.pelada.matchGolLimit;

    if (golLimit && currentScore >= golLimit) {
      // Finaliza a partida automaticamente por limite de gols
      return this.endMatch(userId, matchId);
    }

    return updatedMatch;
  }

  async endMatch(userId: string, matchId: string, drawWinnerTeamId?: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        event: {
          include: {
            pelada: true,
            teams: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Partida não encontrada.');
    }
    if (match.status !== 'PLAYING') {
      return match; // Já finalizada
    }

    const { eventId } = match;
    await this.verifyEventAccess(userId, eventId);

    // 1. Atualizar status da partida para FINISHED
    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt.getTime() - (match.startedAt?.getTime() || endedAt.getTime())) / 1000);

    const finishedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'FINISHED',
        endedAt,
        durationSeconds,
      },
    });

    // 2. Determinar Vencedor e Perdedor
    let winnerId: string | null = null;
    let loserId: string | null = null;
    let isDraw = false;

    if (finishedMatch.homeScore > finishedMatch.awayScore) {
      winnerId = finishedMatch.homeTeamId;
      loserId = finishedMatch.awayTeamId;
    } else if (finishedMatch.awayScore > finishedMatch.homeScore) {
      winnerId = finishedMatch.awayTeamId;
      loserId = finishedMatch.homeTeamId;
    } else {
      isDraw = true;
    }

    const drawRule = match.event.pelada.drawRule;

    // Buscar todas as equipes para calcular ordem da fila
    const allTeams = await this.prisma.team.findMany({
      where: { eventId },
      orderBy: { orderIndex: 'asc' },
    });

    const maxOrderIndex = allTeams.reduce((max, t) => t.orderIndex > max ? t.orderIndex : max, 0);

    if (!isDraw) {
      // Caso COM vencedor:
      // - Vendedor continua em campo (status PLAYING)
      // - Perdedor vai para o fim da fila (status WAITING, orderIndex = max + 1)
      await this.prisma.team.update({
        where: { id: loserId! },
        data: {
          status: 'WAITING',
          orderIndex: maxOrderIndex + 1,
        },
      });

      // - Puxar o próximo da fila para o campo
      const nextTeam = await this.prisma.team.findFirst({
        where: { eventId, status: 'WAITING' },
        orderBy: { orderIndex: 'asc' },
      });

      if (nextTeam) {
        await this.prisma.team.update({
          where: { id: nextTeam.id },
          data: { status: 'PLAYING' },
        });
      }
    } else {
      // Caso de EMPATE:
      if (drawWinnerTeamId) {
        // Se o admin resolveu por tie-break manual (pênaltis)
        winnerId = drawWinnerTeamId;
        loserId = drawWinnerTeamId === finishedMatch.homeTeamId ? finishedMatch.awayTeamId : finishedMatch.homeTeamId;

        await this.prisma.team.update({
          where: { id: loserId },
          data: {
            status: 'WAITING',
            orderIndex: maxOrderIndex + 1,
          },
        });

        const nextTeam = await this.prisma.team.findFirst({
          where: { eventId, status: 'WAITING' },
          orderBy: { orderIndex: 'asc' },
        });

        if (nextTeam) {
          await this.prisma.team.update({
            where: { id: nextTeam.id },
            data: { status: 'PLAYING' },
          });
        }
      } else if (drawRule === 'BOTH_OUT') {
        // Regra padrão comum de peladas: Empate tira os dois times se houver fila
        const waitingTeams = allTeams.filter((t) => t.status === 'WAITING');

        // Só tira os dois se existirem pelo menos 2 times na fila esperando
        if (waitingTeams.length >= 2) {
          // Ambos saem para o fim da fila
          await this.prisma.team.update({
            where: { id: finishedMatch.homeTeamId },
            data: {
              status: 'WAITING',
              orderIndex: maxOrderIndex + 1,
            },
          });

          await this.prisma.team.update({
            where: { id: finishedMatch.awayTeamId },
            data: {
              status: 'WAITING',
              orderIndex: maxOrderIndex + 2,
            },
          });

          // Os dois primeiros da fila entram jogando
          await this.prisma.team.update({
            where: { id: waitingTeams[0].id },
            data: { status: 'PLAYING' },
          });
          await this.prisma.team.update({
            where: { id: waitingTeams[1].id },
            data: { status: 'PLAYING' },
          });
        } else {
          // Se não houver fila suficiente, mantém o time anterior como "vencedor" ou joga par/ímpar
          // Vamos manter a regra de: se não há 2 times na fila, faz disputa rápida ou o "mandante" (home) fica.
          // Para evitar travar o fluxo, assumiremos que um deles fica (vamos deixar o homeTeam no campo por padrão)
          // e o outro sai.
          await this.prisma.team.update({
            where: { id: finishedMatch.awayTeamId },
            data: {
              status: 'WAITING',
              orderIndex: maxOrderIndex + 1,
            },
          });

          const nextTeam = await this.prisma.team.findFirst({
            where: { eventId, status: 'WAITING' },
            orderBy: { orderIndex: 'asc' },
          });

          if (nextTeam) {
            await this.prisma.team.update({
              where: { id: nextTeam.id },
              data: { status: 'PLAYING' },
            });
          }
        }
      } else {
        // Qualquer outra regra (ex: PREVIOUS_WINNER) - por padrão Home fica
        await this.prisma.team.update({
          where: { id: finishedMatch.awayTeamId },
          data: {
            status: 'WAITING',
            orderIndex: maxOrderIndex + 1,
          },
        });

        const nextTeam = await this.prisma.team.findFirst({
          where: { eventId, status: 'WAITING' },
          orderBy: { orderIndex: 'asc' },
        });

        if (nextTeam) {
          await this.prisma.team.update({
            where: { id: nextTeam.id },
            data: { status: 'PLAYING' },
          });
        }
      }
    }

    return finishedMatch;
  }

  async getEventStats(eventId: string) {
    const matches = await this.prisma.match.findMany({
      where: { eventId, status: 'FINISHED' },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        goals: true,
      },
    });

    const totalMatches = matches.length;
    const totalGoals = matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0);

    const scorersMap = new Map<string, { id: string; name: string; goals: number }>();
    const assistantsMap = new Map<string, { id: string; name: string; assists: number }>();
    const winsMap = new Map<string, { id: string; name: string; wins: number; matchesPlayed: number }>();

    const allAttendances = await this.prisma.attendance.findMany({
      where: { eventId, status: 'PRESENT' },
    });

    for (const att of allAttendances) {
      scorersMap.set(att.id, { id: att.id, name: att.name, goals: 0 });
      assistantsMap.set(att.id, { id: att.id, name: att.name, assists: 0 });
      winsMap.set(att.id, { id: att.id, name: att.name, wins: 0, matchesPlayed: 0 });
    }

    const allGoals = await this.prisma.goal.findMany({
      where: { match: { eventId, status: 'FINISHED' } },
      include: { scorer: true, assistant: true },
    });

    for (const g of allGoals) {
      const scorer = scorersMap.get(g.scorerId);
      if (scorer) {
        scorer.goals += 1;
      }
      if (g.assistantId) {
        const assistant = assistantsMap.get(g.assistantId);
        if (assistant) {
          assistant.assists += 1;
        }
      }
    }

    for (const m of matches) {
      const homePlayers = m.homeTeam.players;
      const awayPlayers = m.awayTeam.players;
      const allPlayersInMatch = [...homePlayers, ...awayPlayers];

      for (const p of allPlayersInMatch) {
        const stats = winsMap.get(p.id);
        if (stats) {
          stats.matchesPlayed += 1;
        }
      }

      let winnerTeamId: string | null = null;
      if (m.homeScore > m.awayScore) {
        winnerTeamId = m.homeTeamId;
      } else if (m.awayScore > m.homeScore) {
        winnerTeamId = m.awayTeamId;
      }

      if (winnerTeamId) {
        const winnerPlayers = winnerTeamId === m.homeTeamId ? homePlayers : awayPlayers;
        for (const p of winnerPlayers) {
          const stats = winsMap.get(p.id);
          if (stats) {
            stats.wins += 1;
          }
        }
      }
    }

    const scorers = Array.from(scorersMap.values()).sort((a, b) => b.goals - a.goals);
    const assistants = Array.from(assistantsMap.values()).sort((a, b) => b.assists - a.assists);
    const wins = Array.from(winsMap.values()).sort((a, b) => b.wins - a.wins);

    return {
      totalMatches,
      totalGoals,
      leaderboards: {
        scorers: scorers.filter((s) => s.goals > 0),
        assistants: assistants.filter((a) => a.assists > 0),
        wins: wins.filter((w) => w.matchesPlayed > 0),
      },
    };
  }

  // Métodos auxiliares
  private shuffleArray(array: any[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
