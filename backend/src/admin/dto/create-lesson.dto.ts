import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateLessonDto {
  @IsNotEmpty({ message: 'El título de la clase es obligatorio' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

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
  presentationNotes?: string;

  @IsOptional()
  @IsString()
  availableAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
