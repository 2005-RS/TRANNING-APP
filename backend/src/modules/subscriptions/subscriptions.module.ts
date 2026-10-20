import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { TrainerClientAssignment } from '../trainer-client-assignments/entities/trainer-client-assignment.entity';
import {
  AdminSubscriptionsController,
  ClientSubscriptionsController,
} from './subscriptions.controller';
import { ClientSubscription } from './entities/client-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { SubscriptionsService } from './subscriptions.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClientSubscription,
      SubscriptionPayment,
      ClientProfile,
      TrainerClientAssignment,
    ]),
  ],
  controllers: [ClientSubscriptionsController, AdminSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
