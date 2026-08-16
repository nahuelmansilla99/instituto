import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerItemDto {
  @IsUUID('4', { message: 'El ID de la pregunta debe ser un UUID válido' })
  questionId: string;

  @IsInt({ message: 'El índice de la opción seleccionada debe ser un número entero' })
  @Min(0, { message: 'El índice de opción no puede ser negativo' })
  selectedOptionIndex: number;
}

export class SubmitQuizDto {
  @IsArray({ message: 'Las respuestas deben ser enviadas como una lista' })
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
