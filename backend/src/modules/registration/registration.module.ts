import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule } from '../clients/clients.module';
import { RegistrationController } from './registration.controller';
@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [RegistrationController],
})
export class RegistrationModule {}
