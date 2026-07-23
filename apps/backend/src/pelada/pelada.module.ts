import { Module } from '@nestjs/common';
import { PeladaService } from './pelada.service';
import { PeladaController } from './pelada.controller';

@Module({
  providers: [PeladaService],
  controllers: [PeladaController]
})
export class PeladaModule {}
