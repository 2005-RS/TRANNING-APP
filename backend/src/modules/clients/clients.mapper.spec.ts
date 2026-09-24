import { toClientResponse } from './clients.mapper';
import { ClientProfile } from './entities/client-profile.entity';
import { ClientExperienceLevel } from './enums/client-experience-level.enum';
import { ClientPrimaryGoal } from './enums/client-primary-goal.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

describe('toClientResponse', () => {
  it('projects identity and profile fields without secrets', () => {
    const profile = {
      id: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      phone: '555-0100',
      dateOfBirth: '1994-06-15',
      primaryGoal: ClientPrimaryGoal.MUSCLE_GAIN,
      goalNotes: 'Lean mass',
      experienceLevel: ClientExperienceLevel.BEGINNER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'client@example.com',
        firstName: 'Cara',
        lastName: 'Client',
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        passwordHash: 'should-not-appear',
      },
    } as unknown as ClientProfile;

    const mapped = toClientResponse(profile);
    const serialized = JSON.stringify(mapped);

    expect(mapped.user.role).toBe(UserRole.CLIENT);
    expect(mapped.dateOfBirth).toBe('1994-06-15');
    expect(mapped.primaryGoal).toBe(ClientPrimaryGoal.MUSCLE_GAIN);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('should-not-appear');
    expect(serialized).not.toContain('trainerId');
  });
});
