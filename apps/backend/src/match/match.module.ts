import { Module } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { MatchGateway } from './match.gateway';

@Module({
  providers: [MatchService, MatchGateway],
  controllers: [MatchController],
  exports: [MatchGateway],
})
export class MatchModule {}
