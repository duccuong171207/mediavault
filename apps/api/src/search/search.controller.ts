import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService, SearchQuery } from './search.service';
import { Public } from '../common/decorators/auth.decorators';

@Controller('search')
export class SearchController {
  constructor(private search: SearchService) {}

  @Public()
  @Get()
  query(
    @Query('q') q?: string,
    @Query('type') type?: 'photo' | 'video',
    @Query('date') date?: 'day' | 'week' | 'month' | 'year',
    @Query('resolution') resolution?: 'hd' | 'fhd' | '4k',
    @Query('sort') sort?: SearchQuery['sort'],
    @Query('page') page = '1',
  ) {
    return this.search.query({ q, type, date, resolution, sort, page: Number(page) });
  }
}
