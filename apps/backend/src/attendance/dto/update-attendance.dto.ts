import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsEnum(['LINE', 'GOALKEEPER'])
  @IsOptional()
  role?: string;

  @IsEnum(['PRE_LIST', 'PRESENT', 'CANCELED', 'CUT'])
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  paid?: boolean;

  @IsString()
  @IsOptional()
  teamId?: string;
}
