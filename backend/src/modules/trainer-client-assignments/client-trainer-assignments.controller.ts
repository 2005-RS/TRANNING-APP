import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import {
  ClientTrainerAssignmentResponseDto,
  CurrentTrainerResponseDto,
  PaginatedAssignmentHistoryResponseDto,
} from './dto/assignment-response.dto';
import { ListAssignmentHistoryQueryDto } from './dto/list-assignment-history-query.dto';
import { SetClientTrainerDto } from './dto/set-client-trainer.dto';
import { TrainerClientAssignmentsService } from './trainer-client-assignments.service';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@Controller('clients')
export class ClientTrainerAssignmentsController {
  constructor(private readonly assignments: TrainerClientAssignmentsService) {}

  @Get('me/trainer')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: "Return the authenticated client's current trainer",
  })
  @ApiOkResponse({ type: CurrentTrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getMyTrainer(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentTrainerResponseDto> {
    return this.assignments.getCurrentTrainerForClient(user);
  }

  @Get(':clientId/trainer')
  @Roles(UserRole.ADMIN)
  @ApiParam({ name: 'clientId', description: 'ClientProfile UUID' })
  @ApiOperation({
    summary:
      "Return a client's current trainer. Unassigned clients return trainer: null. One client may have at most one current trainer.",
  })
  @ApiOkResponse({ type: CurrentTrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getClientTrainer(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
  ): Promise<CurrentTrainerResponseDto> {
    return this.assignments.getCurrentTrainerForAdmin(clientId);
  }

  @Get(':clientId/trainer-history')
  @Roles(UserRole.ADMIN)
  @ApiParam({ name: 'clientId', description: 'ClientProfile UUID' })
  @ApiOperation({
    summary: 'List trainer assignment history for a client, newest first',
  })
  @ApiOkResponse({ type: PaginatedAssignmentHistoryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  listHistory(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListAssignmentHistoryQueryDto,
  ): Promise<PaginatedAssignmentHistoryResponseDto> {
    return this.assignments.listHistory(clientId, query);
  }

  @Put(':clientId/trainer')
  @Roles(UserRole.ADMIN)
  @ApiParam({ name: 'clientId', description: 'ClientProfile UUID' })
  @ApiOperation({
    summary:
      "Set a client's current trainer (TrainerProfile UUID in body.trainerId). Idempotent when the same trainer is already assigned. Reassigns atomically otherwise. One client may have at most one current trainer.",
  })
  @ApiOkResponse({ type: ClientTrainerAssignmentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  setTrainer(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Body() dto: SetClientTrainerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientTrainerAssignmentResponseDto> {
    return this.assignments.setTrainer(clientId, dto.trainerId, user);
  }

  @Delete(':clientId/trainer')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'clientId', description: 'ClientProfile UUID' })
  @ApiOperation({
    summary:
      "End a client's current trainer assignment without deleting history",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async unassign(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.assignments.unassign(clientId, user);
  }
}
