import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MusicService } from './music.service';

@ApiTags('Music')
@Controller('music')
export class MusicController {
  constructor(private readonly music: MusicService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for music tracks' })
  search(@Query('q') query: string) {
    return this.music.search(query);
  }

  @Post('download/:id')
  @ApiOperation({ summary: 'Download a track by ID' })
  download(@Param('id') id: string) {
    return this.music.download(id);
  }
}
