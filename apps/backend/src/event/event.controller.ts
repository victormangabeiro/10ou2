import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.eventService.findOnePublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() createEventDto: CreateEventDto) {
    return this.eventService.create(user.id, createEventDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pelada/:peladaId')
  findAll(
    @CurrentUser() user: any,
    @Param('peladaId') peladaId: string,
  ) {
    return this.eventService.findAll(user.id, peladaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventService.findOne(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(user.id, id, updateEventDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.eventService.remove(user.id, id);
  }
}
