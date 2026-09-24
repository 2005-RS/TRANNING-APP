import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    example: 'VALIDATION_ERROR',
    description:
      'Stable machine-readable code such as VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, DATABASE_ERROR, or INTERNAL_ERROR.',
  })
  code!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Request failed' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['name should not be empty'],
      },
    ],
    description: 'Human-readable message or class-validator message list.',
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/v1/clients' })
  path!: string;

  @ApiProperty({ format: 'date-time', example: '2026-09-03T20:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  requestId!: string;
}
