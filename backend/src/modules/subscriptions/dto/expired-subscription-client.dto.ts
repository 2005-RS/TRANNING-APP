import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../clients/dto/client-response.dto';

export class ExpiredSubscriptionClientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

export class PaginatedExpiredSubscriptionClientsResponseDto {
  @ApiProperty({ type: [ExpiredSubscriptionClientDto] })
  data!: ExpiredSubscriptionClientDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
