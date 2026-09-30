import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { JournalDayResponseDto } from './dto/journal-day-response.dto';
import { NutritionJournalService } from './nutrition-journal.service';

@ApiTags('nutrition-journal')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/nutrition-journal')
export class TrainerNutritionJournalController {
  constructor(private readonly journal: NutritionJournalService) {}

  @Get('days/:date')
  // D5: only the assigned TRAINER reads a Client's journal. ADMIN has no default access.
  @Roles(UserRole.TRAINER)
  @ApiOperation({
    summary:
      "Read-only view of an assigned Client's nutrition day (prescribed vs logged, adherence).",
  })
  @ApiOkResponse({ type: JournalDayResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getDay(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalDayResponseDto> {
    return this.journal.getClientDay(user, clientId, date);
  }
}
