import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { MatchService } from './match.service';
import { GenerateTeamsDto } from './dto/generate-teams.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MatchGateway } from './match.gateway';

@Controller('match')
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly matchGateway: MatchGateway,
  ) {}

  @Get('state/:eventId')
  getEventState(@Param('eventId') eventId: string) {
    return this.matchService.getEventState(eventId);
  }

  @Get('stats/:eventId')
  getEventStats(@Param('eventId') eventId: string) {
    return this.matchService.getEventStats(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-teams')
  async generateTeams(@CurrentUser() user: any, @Body() generateTeamsDto: GenerateTeamsDto) {
    const state = await this.matchService.generateTeams(user.id, generateTeamsDto);
    this.matchGateway.sendStateUpdate(generateTeamsDto.eventId, state);
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Post('start')
  async startMatch(@CurrentUser() user: any, @Body('eventId') eventId: string) {
    await this.matchService.startMatch(user.id, eventId);
    const state = await this.matchService.getEventState(eventId);
    this.matchGateway.sendStateUpdate(eventId, state);
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Post('goal')
  async recordGoal(
    @CurrentUser() user: any,
    @Body('matchId') matchId: string,
    @Body('teamId') teamId: string,
    @Body('scorerId') scorerId: string,
    @Body('assistantId') assistantId?: string,
  ) {
    const match = await this.matchService.recordGoal(user.id, matchId, teamId, scorerId, assistantId);
    const state = await this.matchService.getEventState(match.eventId);
    this.matchGateway.sendStateUpdate(match.eventId, state);
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Post('end')
  async endMatch(
    @CurrentUser() user: any,
    @Body('matchId') matchId: string,
    @Body('drawWinnerTeamId') drawWinnerTeamId?: string,
  ) {
    const match = await this.matchService.endMatch(user.id, matchId, drawWinnerTeamId);
    const state = await this.matchService.getEventState(match.eventId);
    this.matchGateway.sendStateUpdate(match.eventId, state);
    return state;
  }
}
