import { Body, Controller, Post } from '@nestjs/common';
import { ValidationProbeDto } from './validation-probe.dto';

@Controller('validation-probe')
export class ValidationProbeController {
  @Post()
  probe(@Body() dto: ValidationProbeDto): ValidationProbeDto {
    return dto;
  }
}
