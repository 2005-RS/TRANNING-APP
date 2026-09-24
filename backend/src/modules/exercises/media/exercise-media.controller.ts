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
import { Throttle } from '@nestjs/throttler';
import {
  UPLOAD_REQUEST_THROTTLE_LIMIT,
  UPLOAD_REQUEST_THROTTLE_TTL_MS,
} from '../../../config/app.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateExerciseMediaUploadRequestDto } from './dto/create-exercise-media-upload-request.dto';
import {
  ExerciseMediaAccessResponseDto,
  ExerciseMediaResponseDto,
  ExerciseMediaUploadRequestResponseDto,
} from './dto/exercise-media-response.dto';
import { ExerciseMediaService } from './exercise-media.service';

@ApiTags('exercise-media')
@ApiBearerAuth('access-token')
@Controller('exercises/:exerciseId/media')
export class ExerciseMediaController {
  constructor(private readonly media: ExerciseMediaService) {}

  @Post('upload-requests')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: UPLOAD_REQUEST_THROTTLE_LIMIT,
      ttl: UPLOAD_REQUEST_THROTTLE_TTL_MS,
    },
  })
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  @ApiOperation({
    summary:
      'Create a PENDING_UPLOAD media record and a short-lived signed POST for direct object-storage upload. ADMIN or owning TRAINER. Archived exercises cannot receive new media. Videos default to 250 MiB max; images 10 MiB. Limits are configured by EXERCISE_VIDEO_MAX_BYTES and EXERCISE_IMAGE_MAX_BYTES.',
  })
  @ApiCreatedResponse({ type: ExerciseMediaUploadRequestResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiPayloadTooLargeResponse()
  createUploadRequest(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Body() dto: CreateExerciseMediaUploadRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseMediaUploadRequestResponseDto> {
    return this.media.createUploadRequest(exerciseId, dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  @ApiOperation({
    summary:
      'List exercise media metadata. Shared catalog read for ADMIN and TRAINER. Does not expose storage keys or credentials.',
  })
  @ApiOkResponse({ type: [ExerciseMediaResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
  ): Promise<ExerciseMediaResponseDto[]> {
    return this.media.list(exerciseId);
  }

  @Post(':mediaId/finalize')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  @ApiParam({ name: 'mediaId', description: 'ExerciseMedia UUID' })
  @ApiOperation({
    summary:
      'Verify the uploaded object via storage HEAD and mark READY. Idempotent for already READY media.',
  })
  @ApiOkResponse({ type: ExerciseMediaResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiPayloadTooLargeResponse()
  finalize(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseMediaResponseDto> {
    return this.media.finalize(exerciseId, mediaId, user);
  }

  @Get(':mediaId/access')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.CLIENT)
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  @ApiParam({ name: 'mediaId', description: 'ExerciseMedia UUID' })
  @ApiOperation({
    summary:
      'Return a short-lived read URL for READY private-bucket media. ADMIN and TRAINER catalog readers. CLIENT only when the exercise appears on their assigned plan or a workout session they own.',
  })
  @ApiOkResponse({ type: ExerciseMediaAccessResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  createAccessUrl(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseMediaAccessResponseDto> {
    return this.media.createAccessUrl(exerciseId, mediaId, user);
  }

  @Delete(':mediaId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'exerciseId', description: 'Exercise UUID' })
  @ApiParam({ name: 'mediaId', description: 'ExerciseMedia UUID' })
  @ApiOperation({
    summary:
      'Delete the object then the metadata. ADMIN or owning TRAINER. Repeated delete returns 404.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async remove(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.media.remove(exerciseId, mediaId, user);
  }
}
