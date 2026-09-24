import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TrainerClientAssignment } from './entities/trainer-client-assignment.entity';

@Injectable()
export class TrainerClientAccessService {
  constructor(
    @InjectRepository(TrainerClientAssignment)
    private readonly assignments: Repository<TrainerClientAssignment>,
  ) {}

  async findActiveByClientId(
    clientProfileId: string,
  ): Promise<TrainerClientAssignment | null> {
    return this.assignments.findOne({
      where: { clientProfileId, endedAt: IsNull() },
      relations: { trainerProfile: { user: true } },
    });
  }

  async findCurrentTrainerUserId(
    clientProfileId: string,
  ): Promise<string | null> {
    const assignment = await this.findActiveByClientId(clientProfileId);
    return assignment?.trainerProfile?.userId ?? null;
  }

  async findActiveForTrainerUser(
    trainerUserId: string,
    clientProfileId: string,
  ): Promise<TrainerClientAssignment | null> {
    return this.assignments
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.trainerProfile', 'trainer')
      .innerJoinAndSelect('trainer.user', 'trainerUser')
      .where('assignment.clientProfileId = :clientProfileId', {
        clientProfileId,
      })
      .andWhere('assignment.endedAt IS NULL')
      .andWhere('trainer.userId = :trainerUserId', { trainerUserId })
      .getOne();
  }

  async canAccessClient(
    trainerUserId: string,
    clientProfileId: string,
  ): Promise<boolean> {
    const assignment = await this.findActiveForTrainerUser(
      trainerUserId,
      clientProfileId,
    );
    return assignment !== null;
  }

  async assertCanAccessClient(
    trainerUserId: string,
    clientProfileId: string,
  ): Promise<void> {
    const allowed = await this.canAccessClient(trainerUserId, clientProfileId);
    if (!allowed) {
      throw new NotFoundException('Client not found');
    }
  }
}
