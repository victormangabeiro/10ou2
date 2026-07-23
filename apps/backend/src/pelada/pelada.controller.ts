import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { PeladaService } from './pelada.service';
import { CreatePeladaDto } from './dto/create-pelada.dto';
import { UpdatePeladaDto } from './dto/update-pelada.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pelada')
export class PeladaController {
  constructor(private readonly peladaService: PeladaService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createPeladaDto: CreatePeladaDto) {
    return this.peladaService.create(user.id, createPeladaDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.peladaService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.peladaService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updatePeladaDto: UpdatePeladaDto,
  ) {
    return this.peladaService.update(user.id, id, updatePeladaDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.peladaService.remove(user.id, id);
  }
}
