import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TrainerProfile } from './entities/trainer-profile.entity';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainerProfile]),
    UsersModule,
    AuthModule,
  ],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
