import { IsString, IsInt, IsBoolean, Min, Max, IsOptional } from 'class-validator';

export class UpdatePeladaDto {
  @IsString({ message: 'Nome deve ser texto' })
  @IsOptional()
  name?: string;

  @IsInt({ message: 'Número de jogadores de linha deve ser um número inteiro' })
  @Min(2, { message: 'Pelo menos 2 jogadores de linha por time' })
  @Max(11, { message: 'No máximo 11 jogadores de linha por time' })
  @IsOptional()
  playersPerTeam?: number;

  @IsBoolean({ message: 'Uso de goleiros fixos deve ser verdadeiro ou falso' })
  @IsOptional()
  useGoalkeepers?: boolean;

  @IsInt({ message: 'Tempo da partida deve ser um número inteiro' })
  @Min(1, { message: 'Tempo de partida mínimo de 1 minuto' })
  @IsOptional()
  matchTimeMinutes?: number;

  @IsInt({ message: 'Limite de gols deve ser um número inteiro' })
  @Min(1, { message: 'Limite de gols mínimo de 1 gol' })
  @IsOptional()
  matchGolLimit?: number;

  @IsString({ message: 'Regra de empate deve ser texto' })
  @IsOptional()
  drawRule?: string;
}
