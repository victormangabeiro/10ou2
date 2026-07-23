import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty({ message: 'ID do evento é obrigatório' })
  eventId: string;

  @IsString({ message: 'Nome deve ser texto' })
  @IsNotEmpty({ message: 'Nome do jogador é obrigatório' })
  name: string;

  @IsEnum(['LINE', 'GOALKEEPER'], { message: 'Função inválida. Escolha entre LINE (Linha) ou GOALKEEPER (Goleiro)' })
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  playerId?: string;

  @IsEnum(['PRE_LIST', 'PRESENT', 'CANCELED', 'CUT'])
  @IsOptional()
  status?: string;
}
