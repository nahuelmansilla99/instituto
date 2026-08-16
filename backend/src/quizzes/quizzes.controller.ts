import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post(':id/quiz/submit')
  @HttpCode(HttpStatus.OK)
  submitQuiz(
    @Param('id') lessonId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @GetUser() user: User,
  ) {
    return this.quizzesService.evaluateQuiz(
      lessonId,
      user.id,
      submitQuizDto.answers,
    );
  }
}
