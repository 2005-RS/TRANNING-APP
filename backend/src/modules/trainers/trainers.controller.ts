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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminUpdateTrainerDto } from './dto/admin-update-trainer.dto';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { ListTrainersQueryDto } from './dto/list-trainers-query.dto';
import {
  PaginatedTrainersResponseDto,
  TrainerResponseDto,
} from './dto/trainer-response.dto';
import { TrainerSelfUpdateDto } from './dto/trainer-self-update.dto';
import { UpdateTrainerStatusDto } from './dto/update-trainer-status.dto';
import { TrainersService } from './trainers.service';

@ApiTags('trainers')
@ApiBearerAuth('access-token')
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Provision a trainer (User + TrainerProfile) atomically',
  })
  @ApiCreatedResponse({ type: TrainerResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({ description: 'Email already in use' })
  create(@Body() dto: CreateTrainerDto): Promise<TrainerResponseDto> {
    return this.trainers.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List trainers with pagination, search and sort' })
  @ApiOkResponse({ type: PaginatedTrainersResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListTrainersQueryDto,
  ): Promise<PaginatedTrainersResponseDto> {
    return this.trainers.list(query);
  }

  @Get('me')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Return the authenticated trainer profile' })
  @ApiOkResponse({ type: TrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  me(@CurrentUser() user: AuthenticatedUser): Promise<TrainerResponseDto> {
    return this.trainers.getMe(user);
  }

  @Patch('me')
  @Roles(UserRole.TRAINER)
  @ApiOperation({ summary: 'Update the authenticated trainer profile fields' })
  @ApiOkResponse({ type: TrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TrainerSelfUpdateDto,
  ): Promise<TrainerResponseDto> {
    return this.trainers.updateMe(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a trainer by profile ID' })
  @ApiOkResponse({ type: TrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TrainerResponseDto> {
    return this.trainers.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update trainer identity and profile' })
  @ApiOkResponse({ type: TrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AdminUpdateTrainerDto,
  ): Promise<TrainerResponseDto> {
    return this.trainers.updateById(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Enable or disable a trainer via User.status',
  })
  @ApiOkResponse({ type: TrainerResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTrainerStatusDto,
  ): Promise<TrainerResponseDto> {
    return this.trainers.updateStatus(id, dto.status);
  }
}
