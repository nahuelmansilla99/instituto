import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCourseDto {
  @IsNotEmpty({ message: 'El título del curso es obligatorio' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'La descripción del curso es obligatoria' })
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  meetUrl?: string;
}
