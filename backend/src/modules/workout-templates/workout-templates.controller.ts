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
  Put,
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
import { CreateWorkoutTemplateDto } from './dto/create-workout-template.dto';
import { ListWorkoutTemplatesQueryDto } from './dto/list-workout-templates-query.dto';
import { ReplaceWorkoutTemplateExercisesDto } from './dto/replace-workout-template-exercises.dto';
import { UpdateWorkoutTemplateDto } from './dto/update-workout-template.dto';
import { UpdateWorkoutTemplateStatusDto } from './dto/update-workout-template-status.dto';
import {
  PaginatedWorkoutTemplatesResponseDto,
  WorkoutTemplateResponseDto,
} from './dto/workout-template-response.dto';
import { WorkoutTemplatesService } from './workout-templates.service';

@ApiTags('workout-templates')
@ApiBearerAuth('access-token')
@Controller('workout-templates')
export class WorkoutTemplatesController {
  constructor(private readonly templates: WorkoutTemplatesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a DRAFT workout template (metadata only). Creator is the authenticated user. Exercises are configured separately, then the template is activated.',
  })
  @ApiCreatedResponse({ type: WorkoutTemplateResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(
    @Body() dto: CreateWorkoutTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    return this.templates.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({
    summary:
      'List workout templates. Defaults to ACTIVE shared catalog. TRAINER DRAFT/ARCHIVED lists are scoped to the creator in SQL. CLIENT has no access.',
  })
  @ApiOkResponse({ type: PaginatedWorkoutTemplatesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListWorkoutTemplatesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedWorkoutTemplatesResponseDto> {
    return this.templates.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Workout template UUID' })
  @ApiOperation({
    summary:
      'Get a template and ordered prescriptions. ACTIVE is shared. DRAFT and ARCHIVED are visible to ADMIN and the creator TRAINER only.',
  })
  @ApiOkResponse({ type: WorkoutTemplateResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    return this.templates.getById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Workout template UUID' })
  @ApiOperation({
    summary:
      'Update name/description. ADMIN may edit any non-archived template. TRAINER may edit only templates they created. ARCHIVED templates are read-only until reactivated. Exercises are not changed here.',
  })
  @ApiOkResponse({ type: WorkoutTemplateResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Template is archived' })
  @ApiBadRequestResponse()
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkoutTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    return this.templates.update(id, dto, user);
  }

  @Put(':id/exercises')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Workout template UUID' })
  @ApiOperation({
    summary:
      'Replace the ordered exercise prescription atomically. Position is assigned from array order. Empty items are allowed only while DRAFT. ACTIVE replacement must stay usable. Future Training Plans snapshot prescriptions; later template edits do not rewrite assigned plans.',
  })
  @ApiOkResponse({ type: WorkoutTemplateResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description:
      'Archived template, empty ACTIVE replacement, or referenced Exercise is not ACTIVE',
  })
  @ApiBadRequestResponse()
  replaceExercises(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ReplaceWorkoutTemplateExercisesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    return this.templates.replaceExercises(id, dto.items, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Workout template UUID' })
  @ApiOperation({
    summary:
      'Activate (DRAFT/ARCHIVED → ACTIVE) or archive (→ ARCHIVED). Activation requires at least one item and currently ACTIVE exercises. Does not restore DRAFT. There is no DELETE endpoint.',
  })
  @ApiOkResponse({ type: WorkoutTemplateResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'Template has no exercises or references an archived Exercise',
  })
  @ApiBadRequestResponse()
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateWorkoutTemplateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutTemplateResponseDto> {
    return this.templates.updateStatus(id, dto.status, user);
  }
}
