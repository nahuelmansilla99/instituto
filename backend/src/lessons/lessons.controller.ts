import { Controller, Get, Param, UseGuards, Res, Patch, Body } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.lessonsService.findOne(id, user);
  }

  @Get('downloads/technical-sheets/:filename')
  downloadTechnicalSheet(@Param('filename') filename: string, @Res() res) {
    return this.lessonsService.downloadTechnicalSheet(filename, res);
  }

  @Get('downloads/lesson-documents/:filename')
  downloadLessonDocument(@Param('filename') filename: string, @Res() res) {
    return this.lessonsService.downloadLessonDocument(filename, res);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() dto: { hasViewedContent?: boolean; hasViewedSheets?: boolean; hasViewedDocs?: boolean }
  ) {
    return this.lessonsService.updateProgress(id, user, dto);
  }
}
