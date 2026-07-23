import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export class GenerateTeamsDto {
  @IsString()
  @IsNotEmpty({ message: 'ID do evento é obrigatório' })
  eventId: string;

  @IsEnum(['ARRIVAL_ORDER', 'RANDOM'], { message: 'Método inválido. Escolha entre ARRIVAL_ORDER (Ordem de chegada) ou RANDOM (Sorteio)' })
  method: 'ARRIVAL_ORDER' | 'RANDOM';
}
