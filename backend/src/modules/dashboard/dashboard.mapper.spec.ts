import { CheckInStatus } from '../check-ins/enums/check-in-status.enum';
import {
  emptyAdminDashboard,
  emptyPerformance,
  emptyTrainerDashboard,
  toBodyProgress,
  toCheckInSummary,
  toClientDashboard,
  toNotificationsSummary,
  toOverviewItem,
  toPerformance,
} from './dashboard.mapper';

describe('dashboard.mapper', () => {
  it('maps zero-state client sections to nulls, empty arrays, and numeric zeros', () => {
    const dashboard = toClientDashboard({
      periodDays: 30,
      trainingPlan: null,
      nutritionPlan: null,
      currentSession: null,
      recentSessions: [],
      performance: {
        completed_sessions: 0,
        performed_sets: 0,
        exercises_performed: 0,
        total_reps: 0,
        external_load_volume_kg: 0,
        total_duration_seconds: 0,
      },
      measurements: [],
      photos: { photo_count: 0, latest_captured_at: null },
      checkIn: null,
      unreadCount: 0,
    });

    expect(dashboard.trainingPlan).toBeNull();
    expect(dashboard.nutritionPlan).toBeNull();
    expect(dashboard.currentWorkoutSession).toBeNull();
    expect(dashboard.recentTraining.completedSessions).toEqual([]);
    expect(dashboard.performance).toEqual(emptyPerformance());
    expect(dashboard.bodyProgress).toBeNull();
    expect(dashboard.checkIn).toBeNull();
    expect(dashboard.notifications).toEqual({ unreadCount: 0 });
  });

  it('converts COUNT bigint strings to numbers and never returns string counts', () => {
    const performance = toPerformance({
      completed_sessions: '10',
      performed_sets: '142',
      exercises_performed: '8',
      total_reps: '1230',
      external_load_volume_kg: '84500.00',
      total_duration_seconds: '3600',
    });
    expect(performance.completedSessions).toBe(10);
    expect(performance.performedSets).toBe(142);
    expect(performance.externalLoadVolumeKg).toBe(84500);
    expect(typeof performance.completedSessions).toBe('number');
  });

  it('computes latest/previous body-weight delta of -0.8 kg', () => {
    const body = toBodyProgress(
      [
        {
          id: 'latest',
          measured_at: '2026-09-02T00:00:00.000Z',
          body_weight_kg: '82.20',
          body_fat_percentage: null,
          waist_cm: '84.00',
        },
        {
          id: 'previous',
          measured_at: '2026-08-20T00:00:00.000Z',
          body_weight_kg: '83.00',
          body_fat_percentage: null,
          waist_cm: '85.00',
        },
      ],
      { photo_count: '0', latest_captured_at: null },
    );

    expect(body?.bodyWeightKg).toBe(82.2);
    expect(body?.previousBodyWeightKg).toBe(83);
    expect(body?.bodyWeightChangeKg).toBe(-0.8);
    expect(body?.waistChangeCm).toBe(-1);
  });

  it('leaves previous/change null when only one measurement exists', () => {
    const body = toBodyProgress(
      [
        {
          id: 'only',
          measured_at: '2026-09-02T00:00:00.000Z',
          body_weight_kg: '82.20',
          body_fat_percentage: null,
          waist_cm: null,
        },
      ],
      { photo_count: 0, latest_captured_at: null },
    );
    expect(body?.previousBodyWeightKg).toBeNull();
    expect(body?.bodyWeightChangeKg).toBeNull();
    expect(body?.waistChangeCm).toBeNull();
  });

  it('exposes DRAFT/SUBMITTED/REVIEWED CheckIn status without content', () => {
    const draft = toCheckInSummary({
      id: 'draft',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
      status: CheckInStatus.DRAFT,
      submitted_at: null,
      reviewed_at: null,
    });
    expect(draft?.status).toBe(CheckInStatus.DRAFT);
    expect(draft?.hasReview).toBe(false);
    expect(draft).not.toHaveProperty('wins');
    expect(draft).not.toHaveProperty('feedback');

    const submitted = toCheckInSummary({
      id: 'submitted',
      period_start: '2026-08-08',
      period_end: '2026-08-14',
      status: CheckInStatus.SUBMITTED,
      submitted_at: '2026-08-14T12:00:00.000Z',
      reviewed_at: null,
    });
    expect(submitted?.hasReview).toBe(false);

    const reviewed = toCheckInSummary({
      id: 'reviewed',
      period_start: '2026-08-15',
      period_end: '2026-08-21',
      status: CheckInStatus.REVIEWED,
      submitted_at: '2026-08-21T12:00:00.000Z',
      reviewed_at: '2026-08-22T09:00:00.000Z',
    });
    expect(reviewed?.hasReview).toBe(true);
    expect(reviewed?.reviewedAt?.toISOString()).toBe(
      '2026-08-22T09:00:00.000Z',
    );
  });

  it('maps unread notification counts as numbers', () => {
    expect(toNotificationsSummary('4' as unknown as number)).toEqual({
      unreadCount: 4,
    });
  });

  it('returns zero-safe trainer and admin dashboards', () => {
    const trainer = emptyTrainerDashboard(7);
    expect(trainer.activeClientCount).toBe(0);
    expect(trainer.pendingCheckIns).toEqual({ count: 0, items: [] });
    expect(trainer.clientsWithoutRecentTraining.items).toEqual([]);
    expect(trainer.recentCompletedSessions).toEqual([]);

    const admin = emptyAdminDashboard(30);
    expect(admin.activeTrainers).toBe(0);
    expect(admin.activeClients).toBe(0);
    expect(admin.pendingCheckIns).toBe(0);
    expect(admin.notifications.unreadCount).toBe(0);
  });

  it('omits body-measurement values from the trainer client overview row', () => {
    const row = toOverviewItem({
      client_profile_id: 'client-1',
      first_name: 'Cara',
      last_name: 'Client',
      training_plan_name: 'Phase 1',
      nutrition_plan_name: null,
      last_completed_at: '2026-09-01T00:00:00.000Z',
      latest_check_in_status: CheckInStatus.SUBMITTED,
      latest_check_in_period_end: '2026-08-30',
      has_pending_check_in: true,
      latest_measured_at: '2026-09-01T00:00:00.000Z',
    });
    expect(row.clientName).toBe('Cara Client');
    expect(row.hasActiveTrainingPlan).toBe(true);
    expect(row.hasActiveNutritionPlan).toBe(false);
    expect(row.hasPendingCheckIn).toBe(true);
    expect(row).not.toHaveProperty('bodyWeightKg');
    expect(row).not.toHaveProperty('waistCm');
    expect(row).not.toHaveProperty('email');
  });
});
