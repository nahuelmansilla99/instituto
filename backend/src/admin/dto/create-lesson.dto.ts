import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateLessonDto {
  @IsNotEmpty({ message: 'El título de la clase es obligatorio' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'El contenido de la clase es obligatorio' })
  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderNumber?: number;

  @IsOptional()
  @IsString()
  meetUrl?: string;

  @IsOptional()
  @IsString()
  presentationUrl?: string;

  @IsOptional()
  @IsString()
  presentationFilename?: string;

  @IsOptional()
  @IsString()
  availableAt?: string | null;
}
