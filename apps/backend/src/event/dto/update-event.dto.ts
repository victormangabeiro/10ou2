import { IsString, IsOptional, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  pixKey?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pixValue?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['DRAFT', 'PRE_LIST', 'ACTIVE', 'FINISHED'])
  status?: string;
}
