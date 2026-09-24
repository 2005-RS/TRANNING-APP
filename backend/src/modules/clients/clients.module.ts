import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientProfile } from './entities/client-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientProfile]), UsersModule, AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
