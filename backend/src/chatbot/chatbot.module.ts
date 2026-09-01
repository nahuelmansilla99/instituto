import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { AiChatMessage, Course, Lesson, CourseEnrollment } from '../entities';
import { PdfExtractorService } from '../common/services/pdf-extractor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiChatMessage,
      Course,
      Lesson,
      CourseEnrollment,
    ]),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, PdfExtractorService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
