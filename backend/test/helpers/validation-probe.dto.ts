import { IsString, MinLength } from 'class-validator';

export class ValidationProbeDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
