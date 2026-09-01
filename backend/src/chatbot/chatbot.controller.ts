import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../entities/user.entity';
import { ChatbotService } from './chatbot.service';
import { AskTutorDto } from './dto/ask-tutor.dto';

@Controller('courses/:courseId/tutor')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('quota')
  getQuota(
    @GetUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.chatbotService.getQuota(user, courseId);
  }

  @Get('history')
  getHistory(
    @GetUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.chatbotService.getHistory(user, courseId);
  }

  @Post('chat')
  askTutor(
    @GetUser() user: User,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: AskTutorDto,
  ) {
    return this.chatbotService.askTutor(user, courseId, dto.question);
  }
}
