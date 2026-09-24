import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
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
import { UserRole } from '../users/enums/user-role.enum';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  MarkAllReadResponseDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.CLIENT)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('unread-count')
  @ApiOperation({
    summary:
      'Unread inbox count for the authenticated User only. Uses SQL COUNT. There is no public notification creation API and no external delivery channels yet.',
  })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponseDto> {
    return this.notifications.unreadCountMine(user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Private per-user inbox. Returns only notifications where recipientUserId is the authenticated User. Semantic event types are returned so the client can localize copy. Filter with readState (ALL, UNREAD, READ) and optional type. Paginated, newest first. Does not expose Check-In text, review feedback, plan prescriptions, or actor details.',
  })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedNotificationsResponseDto> {
    return this.notifications.listMine(query, user);
  }

  @Patch('read-all')
  @ApiOperation({
    summary:
      'Mark every unread notification owned by the authenticated User as read. Does not affect other users. Already-read rows are left unchanged.',
  })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  readAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarkAllReadResponseDto> {
    return this.notifications.markAllReadMine(user);
  }

  @Patch(':notificationId/read')
  @ApiParam({ name: 'notificationId', description: 'Notification UUID' })
  @ApiOperation({
    summary:
      'Mark one owned notification as read. Idempotent: repeating the call keeps the original readAt. Foreign notification IDs return 404, including for ADMIN. There is no mark-unread in v1.',
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  markRead(
    @Param('notificationId', new ParseUUIDPipe({ version: '4' }))
    notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markReadMine(notificationId, user);
  }
}
