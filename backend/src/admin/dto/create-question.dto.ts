import { IsNotEmpty, IsArray, IsInt, Min, ArrayMinSize, IsString } from 'class-validator';

export class CreateQuestionDto {
  @IsNotEmpty({ message: 'El enunciado de la pregunta es obligatorio' })
  @IsString()
  questionText: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Debes proporcionar al menos 2 opciones' })
  @IsString({ each: true })
  options: string[];

  @IsInt({ message: 'El índice de la opción correcta debe ser un número' })
  @Min(0, { message: 'El índice no puede ser negativo' })
  correctOptionIndex: number;
}
