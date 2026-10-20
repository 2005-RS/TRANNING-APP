import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { WorkoutLibraryItemResponseDto } from './dto/workout-library-response.dto';
import { WorkoutTemplatesService } from './workout-templates.service';

@ApiTags('client-workout-library')
@ApiBearerAuth('access-token')
@Controller('clients/me/workout-library')
export class ClientWorkoutLibraryController {
  constructor(private readonly templates: WorkoutTemplatesService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOkResponse({ type: [WorkoutLibraryItemResponseDto] })
  @ApiForbiddenResponse()
  list(): Promise<WorkoutLibraryItemResponseDto[]> {
    return this.templates.listLibrary();
  }

  @Get(':id')
  @Roles(UserRole.CLIENT)
  @ApiOkResponse({ type: WorkoutLibraryItemResponseDto })
  @ApiNotFoundResponse()
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<WorkoutLibraryItemResponseDto> {
    return this.templates.getLibraryById(id);
  }
}
