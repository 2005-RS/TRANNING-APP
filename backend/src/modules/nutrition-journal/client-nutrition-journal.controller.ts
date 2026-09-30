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
import {
  JournalDayResponseDto,
  JournalEntryDto,
} from './dto/journal-day-response.dto';
import {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
} from './dto/journal-entry-input.dto';
import { NutritionJournalService } from './nutrition-journal.service';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('client-nutrition-journal')
@ApiBearerAuth('access-token')
@Controller('clients/me/nutrition-journal')
export class ClientNutritionJournalController {
  constructor(private readonly journal: NutritionJournalService) {}

  @Get('days/:date')
  @Roles(UserRole.CLIENT)
  @ApiParam({
    name: 'date',
    description: "The Client's local date, YYYY-MM-DD",
  })
  @ApiOperation({
    summary:
      'The Client’s nutrition day: prescribed meals with their status, food logged outside the plan, consumed vs target totals and adherence.',
  })
  @ApiOkResponse({ type: JournalDayResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  getDay(
    @Param('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalDayResponseDto> {
    return this.journal.getMyDay(user, date);
  }

  @Post('days/:date/plan-items/:planItemId/eaten')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: 'Log a prescribed item as eaten, exactly as prescribed.',
  })
  @ApiOkResponse({ type: JournalDayResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'The day is outside the editable window.',
  })
  markEaten(
    @Param('date') date: string,
    @Param('planItemId', uuid) planItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalDayResponseDto> {
    return this.journal.markPlannedEaten(user, date, planItemId);
  }

  @Post('days/:date/plan-items/:planItemId/skip')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Mark a prescribed item as skipped for the day.' })
  @ApiOkResponse({ type: JournalDayResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  skip(
    @Param('date') date: string,
    @Param('planItemId', uuid) planItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalDayResponseDto> {
    return this.journal.skipPlanned(user, date, planItemId);
  }

  @Delete('days/:date/plan-items/:planItemId')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Undo: return a prescribed item to pending.' })
  @ApiOkResponse({ type: JournalDayResponseDto })
  @ApiConflictResponse()
  clear(
    @Param('date') date: string,
    @Param('planItemId', uuid) planItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalDayResponseDto> {
    return this.journal.clearPlanned(user, date, planItemId);
  }

  @Post('days/:date/entries')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Log a food (grams or a portion). With planItemId it replaces that prescribed item for the day.',
  })
  @ApiCreatedResponse({ type: JournalEntryDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  addEntry(
    @Param('date') date: string,
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalEntryDto> {
    return this.journal.addEntry(user, date, dto);
  }

  @Patch('entries/:entryId')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary: 'Change the amount, meal or note of a logged food.',
  })
  @ApiOkResponse({ type: JournalEntryDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  updateEntry(
    @Param('entryId', uuid) entryId: string,
    @Body() dto: UpdateJournalEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalEntryDto> {
    return this.journal.updateEntry(user, entryId, dto);
  }

  @Delete('entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Delete a logged food.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  deleteEntry(
    @Param('entryId', uuid) entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.journal.deleteEntry(user, entryId);
  }
}
