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
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import {
  PAYMENT_NOT_PENDING_MESSAGE,
  PAYMENTS_NOT_CONFIGURED_MESSAGE,
  SUBSCRIPTION_PAYMENT_THROTTLE_LIMIT,
  SUBSCRIPTION_PAYMENT_THROTTLE_TTL_MS,
} from './subscriptions.constants';
import { PaginatedSubscriptionPaymentsResponseDto } from './dto/admin-subscription-payment-response.dto';
import { ApproveSubscriptionPaymentResponseDto } from './dto/approve-subscription-payment-response.dto';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payment.dto';
import { PaginatedExpiredSubscriptionClientsResponseDto } from './dto/expired-subscription-client.dto';
import { ListExpiredSubscriptionsQueryDto } from './dto/list-expired-subscriptions-query.dto';
import { ListSubscriptionPaymentsQueryDto } from './dto/list-subscription-payments-query.dto';
import { RejectSubscriptionPaymentDto } from './dto/reject-subscription-payment.dto';
import { SubscriptionPaymentResponseDto } from './dto/subscription-payment-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@Controller('clients')
export class ClientSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('me/subscription')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get the current client subscription' })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  me(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionResponseDto> {
    return this.subscriptions.getForCurrentClient(user.id);
  }

  @Post('me/subscription/payments')
  @Roles(UserRole.CLIENT)
  @Throttle({
    default: {
      limit: SUBSCRIPTION_PAYMENT_THROTTLE_LIMIT,
      ttl: SUBSCRIPTION_PAYMENT_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Report a SINPE Móvil subscription payment' })
  @ApiCreatedResponse({ type: SubscriptionPaymentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiServiceUnavailableResponse({
    description: PAYMENTS_NOT_CONFIGURED_MESSAGE,
  })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubscriptionPaymentDto,
  ): Promise<SubscriptionPaymentResponseDto> {
    return this.subscriptions.createPaymentForCurrentClient(user.id, dto);
  }

  @Get(':clientId/subscription')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a client subscription' })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  get(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.getForClient(clientId, false);
  }

  @Patch(':clientId/subscription')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Grant or revoke complimentary Pro for a client' })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  update(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.update(clientId, dto, user.id);
  }
}

@ApiTags('subscriptions')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('subscription-payments')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List reported subscription payments, newest first',
  })
  @ApiOkResponse({ type: PaginatedSubscriptionPaymentsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(
    @Query() query: ListSubscriptionPaymentsQueryDto,
  ): Promise<PaginatedSubscriptionPaymentsResponseDto> {
    return this.subscriptions.listPayments(
      query.status,
      query.page,
      query.pageSize,
    );
  }

  @Post('subscription-payments/:id/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Approve a manually verified payment. The Admin is the bank-check trust boundary.',
  })
  @ApiOkResponse({ type: ApproveSubscriptionPaymentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: PAYMENT_NOT_PENDING_MESSAGE })
  approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApproveSubscriptionPaymentResponseDto> {
    return this.subscriptions.approve(id, user.id);
  }

  @Post('subscription-payments/:id/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a reported subscription payment' })
  @ApiOkResponse({ type: SubscriptionPaymentResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: PAYMENT_NOT_PENDING_MESSAGE })
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectSubscriptionPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionPaymentResponseDto> {
    return this.subscriptions.reject(id, dto.reason, user.id);
  }

  @Get('subscriptions/expired-with-trainer')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List free clients with an active trainer assignment',
  })
  @ApiOkResponse({ type: PaginatedExpiredSubscriptionClientsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  expired(
    @Query() query: ListExpiredSubscriptionsQueryDto,
  ): Promise<PaginatedExpiredSubscriptionClientsResponseDto> {
    return this.subscriptions.expiredWithTrainer(query.page, query.pageSize);
  }
}
