import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../../storage/storage.module';
import { BodyMeasurementsModule } from '../body-measurements/body-measurements.module';
import { ClientsModule } from '../clients/clients.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { ClientProgressPhotosController } from './client-progress-photos.controller';
import { ProgressPhoto } from './entities/progress-photo.entity';
import { ProgressPhotosController } from './progress-photos.controller';
import { ProgressPhotosService } from './progress-photos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgressPhoto]),
    StorageModule,
    ClientsModule,
    TrainerClientAssignmentsModule,
    BodyMeasurementsModule,
  ],
  // Static /clients/me/progress-photos must register before /clients/:clientId/progress-photos.
  controllers: [ClientProgressPhotosController, ProgressPhotosController],
  providers: [ProgressPhotosService],
})
export class ProgressPhotosModule {}
