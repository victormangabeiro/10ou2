import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'ID da pelada é obrigatório' })
  peladaId: string;

  @IsString({ message: 'Nome do evento deve ser texto' })
  @IsNotEmpty({ message: 'Nome do evento é obrigatório' })
  name: string;

  @IsDateString({}, { message: 'Data do evento deve ser uma data válida' })
  @IsNotEmpty({ message: 'Data do evento é obrigatória' })
  date: string;

  @IsString({ message: 'Horário do evento deve ser texto' })
  @IsNotEmpty({ message: 'Horário do evento é obrigatório' })
  time: string;

  @IsString({ message: 'Local do evento deve ser texto' })
  @IsNotEmpty({ message: 'Local do evento é obrigatório' })
  location: string;

  @IsString({ message: 'Chave Pix deve ser texto' })
  @IsOptional()
  pixKey?: string;

  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor não pode ser negativo' })
  @IsOptional()
  pixValue?: number;
}
