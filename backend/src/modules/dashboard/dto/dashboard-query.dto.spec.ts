import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdminDashboardQueryDto,
  ClientDashboardQueryDto,
  TrainerDashboardQueryDto,
} from './dashboard-query.dto';
import { TrainerClientOverviewQueryDto } from './trainer-client-overview.dto';

describe('dashboard query DTOs', () => {
  it('accepts allowlisted periodDays and rejects arbitrary windows', async () => {
    for (const periodDays of [7, 30, 90]) {
      const dto = plainToInstance(ClientDashboardQueryDto, { periodDays });
      expect(await validate(dto)).toHaveLength(0);
    }
    const invalid = plainToInstance(ClientDashboardQueryDto, {
      periodDays: 10000,
    });
    expect(await validate(invalid)).not.toHaveLength(0);

    const adminInvalid = plainToInstance(AdminDashboardQueryDto, {
      periodDays: 14,
    });
    expect(await validate(adminInvalid)).not.toHaveLength(0);
  });

  it('accepts allowlisted inactivityDays and rejects other values', async () => {
    for (const inactivityDays of [7, 14, 30]) {
      const dto = plainToInstance(TrainerDashboardQueryDto, { inactivityDays });
      expect(await validate(dto)).toHaveLength(0);
    }
    const invalid = plainToInstance(TrainerDashboardQueryDto, {
      inactivityDays: 90,
    });
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it('parses overview boolean filters and rejects extra fields via whitelist usage', async () => {
    const dto = plainToInstance(TrainerClientOverviewQueryDto, {
      page: '2',
      limit: '10',
      hasActiveTrainingPlan: 'true',
      hasPendingCheckIn: 'false',
      search: 'Cara',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.hasActiveTrainingPlan).toBe(true);
    expect(dto.hasPendingCheckIn).toBe(false);
  });
});
