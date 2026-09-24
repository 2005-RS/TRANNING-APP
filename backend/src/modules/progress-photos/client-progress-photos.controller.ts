import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import {
  CreateProgressPhotoUploadRequestDto,
  ListProgressPhotosQueryDto,
} from './dto/progress-photo-input.dto';
import {
  PaginatedProgressPhotosResponseDto,
  ProgressPhotoAccessResponseDto,
  ProgressPhotoResponseDto,
  ProgressPhotoUploadRequestResponseDto,
} from './dto/progress-photo-response.dto';
import { Throttle } from '@nestjs/throttler';
import {
  UPLOAD_REQUEST_THROTTLE_LIMIT,
  UPLOAD_REQUEST_THROTTLE_TTL_MS,
} from '../../config/app.constants';
import { ProgressPhotosService } from './progress-photos.service';

@ApiTags('client-progress-photos')
@ApiBearerAuth('access-token')
@Controller('clients/me/progress-photos')
export class ClientProgressPhotosController {
  constructor(private readonly photos: ProgressPhotosService) {}

  @Post('upload-requests')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: UPLOAD_REQUEST_THROTTLE_LIMIT,
      ttl: UPLOAD_REQUEST_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary:
      'Create PENDING_UPLOAD metadata and a short-lived signed POST for direct object-storage upload. CLIENT only. NestJS does not receive image bytes. Optional bodyMeasurementId must belong to this Client. TRAINER and ADMIN cannot upload.',
  })
  @ApiCreatedResponse({ type: ProgressPhotoUploadRequestResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiPayloadTooLargeResponse()
  createUploadRequest(
    @Body() dto: CreateProgressPhotoUploadRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressPhotoUploadRequestResponseDto> {
    return this.photos.createUploadRequest(dto, user);
  }

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'List the authenticated Client progress photos. Defaults to READY. Pass status=PENDING_UPLOAD or FAILED to inspect owner upload state. dateFrom/dateTo are inclusive UTC calendar days on capturedAt. storageKey and signed URLs are never returned here.',
  })
  @ApiOkResponse({ type: PaginatedProgressPhotosResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListProgressPhotosQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedProgressPhotosResponseDto> {
    return this.photos.listMine(query, user);
  }

  @Get(':photoId/access')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'photoId', description: 'Progress photo UUID' })
  @ApiOperation({
    summary:
      'Short-lived signed GET URL for a READY photo owned by the authenticated Client. URLs are not stored. Unsigned object URLs must fail.',
  })
  @ApiOkResponse({ type: ProgressPhotoAccessResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  createAccess(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressPhotoAccessResponseDto> {
    return this.photos.createAccessUrlMine(photoId, user);
  }

  @Post(':photoId/finalize')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'photoId', description: 'Progress photo UUID' })
  @ApiOperation({
    summary:
      'Verify the uploaded object with HEAD (existence, ContentLength, ContentType) and mark READY. Missing object stays PENDING_UPLOAD and returns 409. Incompatible objects become FAILED and are deleted when storage allows. Repeat finalize is idempotent for valid READY photos. HEAD does not prove image file signatures.',
  })
  @ApiOkResponse({ type: ProgressPhotoResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiPayloadTooLargeResponse()
  finalize(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressPhotoResponseDto> {
    return this.photos.finalizeMine(photoId, user);
  }

  @Get(':photoId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'photoId', description: 'Progress photo UUID' })
  @ApiOperation({
    summary:
      'Owner metadata for any upload status, including PENDING_UPLOAD. Foreign UUIDs return 404. storageKey is never returned.',
  })
  @ApiOkResponse({ type: ProgressPhotoResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getOne(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressPhotoResponseDto> {
    return this.photos.getMine(photoId, user);
  }

  @Delete(':photoId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'photoId', description: 'Progress photo UUID' })
  @ApiOperation({
    summary:
      'Delete the object then the metadata row. Object-store delete and PostgreSQL delete are not atomic. Repeated delete returns 404. TRAINER and ADMIN have no delete endpoint.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  remove(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.photos.removeMine(photoId, user);
  }
}
