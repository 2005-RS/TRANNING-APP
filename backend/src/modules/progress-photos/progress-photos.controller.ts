import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { ListProgressPhotosQueryDto } from './dto/progress-photo-input.dto';
import {
  PaginatedProgressPhotosResponseDto,
  ProgressPhotoAccessResponseDto,
} from './dto/progress-photo-response.dto';
import { ProgressPhotosService } from './progress-photos.service';

@ApiTags('progress-photos')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/progress-photos')
export class ProgressPhotosController {
  constructor(private readonly photos: ProgressPhotosService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Read-only READY progress-photo metadata for a Client. ADMIN may read any Client. TRAINER access requires the current assignment. Unassigned trainers receive 404. CLIENT is 403. Pending and failed uploads are not listed. There is no management delete.',
  })
  @ApiOkResponse({ type: PaginatedProgressPhotosResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListProgressPhotosQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedProgressPhotosResponseDto> {
    return this.photos.listForManagement(clientId, query, user);
  }

  @Get(':photoId/access')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'photoId', description: 'Progress photo UUID' })
  @ApiOperation({
    summary:
      'Short-lived signed GET for a READY photo that belongs to the requested Client. Visibility follows the current TrainerClientAssignment. storageKey is never returned.',
  })
  @ApiOkResponse({ type: ProgressPhotoAccessResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  createAccess(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressPhotoAccessResponseDto> {
    return this.photos.createAccessUrlForClient(clientId, photoId, user);
  }
}
