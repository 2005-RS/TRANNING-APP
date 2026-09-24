import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { ListClientsQueryDto } from '../clients/dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from '../clients/dto/client-response.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { TrainerClientAssignmentsService } from './trainer-client-assignments.service';

@ApiTags('trainers')
@ApiBearerAuth('access-token')
@Controller('trainers')
export class TrainerAssignedClientsController {
  constructor(private readonly assignments: TrainerClientAssignmentsService) {}

  @Get('me/clients')
  @Roles(UserRole.TRAINER)
  @ApiOperation({
    summary:
      'List clients with an active assignment to the authenticated trainer',
  })
  @ApiOkResponse({ type: PaginatedClientsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    return this.assignments.listAssignedClients(user, query);
  }

  @Get('me/clients/:clientId')
  @Roles(UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'ClientProfile UUID' })
  @ApiOperation({
    summary:
      'Get an assigned client profile. Unassigned clients are hidden as 404.',
  })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
  ): Promise<ClientResponseDto> {
    return this.assignments.getAssignedClient(user, clientId);
  }
}
