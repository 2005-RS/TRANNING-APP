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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminUpdateClientDto } from './dto/admin-update-client.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import {
  ClientResponseDto,
  PaginatedClientsResponseDto,
} from './dto/client-response.dto';
import { ClientSelfUpdateDto } from './dto/client-self-update.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { ClientsService } from './clients.service';

@ApiTags('clients')
@ApiBearerAuth('access-token')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Provision a client (User + ClientProfile) atomically',
  })
  @ApiCreatedResponse({ type: ClientResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({ description: 'Email already in use' })
  create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return this.clients.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List clients with pagination, search and filters' })
  @ApiOkResponse({ type: PaginatedClientsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedClientsResponseDto> {
    return this.clients.list(query);
  }

  @Get('me')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Return the authenticated client profile' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  me(@CurrentUser() user: AuthenticatedUser): Promise<ClientResponseDto> {
    return this.clients.getMe(user);
  }

  @Patch('me')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Update the authenticated client profile fields' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClientSelfUpdateDto,
  ): Promise<ClientResponseDto> {
    return this.clients.updateMe(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a client by profile ID' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ClientResponseDto> {
    return this.clients.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update client identity and profile' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AdminUpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clients.updateById(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable or disable a client via User.status' })
  @ApiOkResponse({ type: ClientResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateClientStatusDto,
  ): Promise<ClientResponseDto> {
    return this.clients.updateStatus(id, dto.status);
  }
}
