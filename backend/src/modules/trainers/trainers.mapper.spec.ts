import { toTrainerResponse } from './trainers.mapper';
import { TrainerProfile } from './entities/trainer-profile.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

describe('toTrainerResponse', () => {
  it('projects identity and profile fields without secrets', () => {
    const profile = {
      id: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      phone: '555-0100',
      professionalTitle: 'Coach',
      bio: 'Strength',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'trainer@example.com',
        firstName: 'Tia',
        lastName: 'Trainer',
        role: UserRole.TRAINER,
        status: UserStatus.ACTIVE,
        passwordHash: 'should-not-appear',
      },
    } as unknown as TrainerProfile;

    const mapped = toTrainerResponse(profile);
    const serialized = JSON.stringify(mapped);

    expect(mapped.user.role).toBe(UserRole.TRAINER);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('should-not-appear');
  });
});
