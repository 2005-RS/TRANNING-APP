import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
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
import { CreateCheckInDto } from './dto/create-check-in.dto';
import {
  CheckInResponseDto,
  PaginatedCheckInsResponseDto,
} from './dto/check-in-response.dto';
import { ListClientCheckInsQueryDto } from './dto/list-client-check-ins-query.dto';
import { UpdateCheckInDto } from './dto/update-check-in.dto';
import { UpdateCheckInStatusDto } from './dto/update-check-in-status.dto';

@ApiTags('client-check-ins')
@ApiBearerAuth('access-token')
@Controller('clients/me/check-ins')
export class ClientCheckInsController {
  constructor(private readonly checkIns: CheckInsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a DRAFT CheckIn for the authenticated Client. Only periodStart and periodEnd are required. Response fields may be filled later. DRAFT content is private to the Client. ADMIN and TRAINER cannot create CheckIns. Submitting or reviewing does not change Training Plans, Nutrition Plans, measurements, or assignments.',
  })
  @ApiCreatedResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse({
    description: 'Exact period already exists for this Client',
  })
  create(
    @Body() dto: CreateCheckInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.createMine(dto, user);
  }

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'List the authenticated Client CheckIns including DRAFT, SUBMITTED, and REVIEWED. Default order is periodStart DESC, then createdAt DESC. dateFrom/dateTo filter periodStart inclusively (YYYY-MM-DD). Summaries omit long response text.',
  })
  @ApiOkResponse({ type: PaginatedCheckInsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListClientCheckInsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedCheckInsResponseDto> {
    return this.checkIns.listMine(query, user);
  }

  @Get(':checkInId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'CheckIn detail for the authenticated Client, including Trainer review when present. Foreign UUIDs return 404.',
  })
  @ApiOkResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getOne(
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.getMine(checkInId, user);
  }

  @Patch(':checkInId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Update a DRAFT CheckIn owned by the authenticated Client. SUBMITTED and REVIEWED responses are immutable (409). Period and response fields are validated on the merged result. id, clientProfileId, status, submittedAt, and review are not writable.',
  })
  @ApiOkResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  update(
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @Body() dto: UpdateCheckInDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.updateMine(checkInId, dto, user);
  }

  @Patch(':checkInId/status')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Submit a DRAFT CheckIn. Body accepts only status=SUBMITTED. At least one substantive response is required (a rating, adherence percentage including 0, or non-whitespace text). Repeat submit on SUBMITTED is idempotent and does not change submittedAt. REVIEWED cannot return to SUBMITTED.',
  })
  @ApiOkResponse({ type: CheckInResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  updateStatus(
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @Body() _dto: UpdateCheckInStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckInResponseDto> {
    return this.checkIns.submitMine(checkInId, user);
  }

  @Delete(':checkInId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'checkInId', description: 'CheckIn UUID' })
  @ApiOperation({
    summary:
      'Discard a DRAFT CheckIn. SUBMITTED and REVIEWED history cannot be deleted (409).',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  remove(
    @Param('checkInId', new ParseUUIDPipe({ version: '4' })) checkInId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.checkIns.deleteMine(checkInId, user);
  }
}
