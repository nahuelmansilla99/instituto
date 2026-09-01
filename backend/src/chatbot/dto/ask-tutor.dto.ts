import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AskTutorDto {
  @IsNotEmpty({ message: 'La pregunta no puede estar vacía' })
  @IsString({ message: 'La pregunta debe ser texto' })
  @MinLength(3, { message: 'La pregunta debe tener al menos 3 caracteres' })
  @MaxLength(400, { message: 'La pregunta no puede superar los 400 caracteres por seguridad y control de cuota' })
  question: string;

  @IsOptional()
  @IsUUID('4', { message: 'El identificador de conversación debe ser un UUID válido' })
  conversationId?: string;
}
