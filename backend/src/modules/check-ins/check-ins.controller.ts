import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { CheckInsService } from './check-ins.service';
import { CreateCheckInReviewDto } from './dto/create-check-in-review.dto';
import {
  CheckInResponseDto,
  PaginatedCheckInsResponseDto,
} from './dto/check-in-response.dto';
import { ListManagementCheckInsQueryDto } from './dto/list-management-check-ins-query.dto';
import { UpdateCheckInReviewDto } from './dto/update-check-in-review.dto';

@ApiTags('check-ins')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/check-ins')
export class CheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'List SUBMITTED and REVIEWED CheckIns for a Client. DRAFT CheckIns are never returned. status=DRAFT is rejected with 400. ADMIN may read any Client. TRAINER access requires the current trainer-client assignment. Unassigned trainers receive 404. CLIENT is 403. dateFrom/dateTo filter periodStart inclusively.',
  })
  @ApiOkResponse({ type: PaginatedCheckInsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListManagementCheckInsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedCheckInsResponseDto> {
    return this.checkIns.listForClient(clientId, query, user);
  }

  @Get(':checkInId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Submitted or reviewed CheckIn detail, including historical Trainer review when present. DRAFT CheckIns return 404 even to ADMIN and the assigned TRAINER. Cross-client UUIDs return 404. Visibility follows the current TrainerClientAssignment. reviewedByUserId is provenance and does not grant access.',
  })
  @ApiOkResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getOne(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.getForClient(clientId, checkInId, user);
  }

  @Post(':checkInId/review')
  @Roles(UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Create the Trainer review for a SUBMITTED CheckIn. Current assigned TRAINER only. ADMIN is read-only (403). Already REVIEWED is 409. PostgreSQL UNIQUE(check_in_id) prevents a second review. Review insert and CheckIn status=REVIEWED run in one transaction. Does not mutate training or nutrition plans.',
  })
  @ApiCreatedResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  createReview(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @Body() dto: CreateCheckInReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.createReview(clientId, checkInId, dto, user);
  }

  @Patch(':checkInId/review')
  @Roles(UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Update review feedback written by the authenticated Trainer while they remain the current assigned Trainer. After reassignment the original reviewer loses access (404). The new Trainer may read the historical review but cannot overwrite it (409 Review belongs to a different reviewer).',
  })
  @ApiOkResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  updateReview(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @Body() dto: UpdateCheckInReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.updateReview(clientId, checkInId, dto, user);
  }
}
