import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'O nome deve ser um texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'A senha atual deve ser um texto' })
  @IsOptional()
  currentPassword?: string;

  @IsString({ message: 'A nova senha deve ser um texto' })
  @IsOptional()
  @MinLength(6, { message: 'A nova senha deve ter pelo menos 6 caracteres' })
  newPassword?: string;
}
