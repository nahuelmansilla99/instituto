import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
