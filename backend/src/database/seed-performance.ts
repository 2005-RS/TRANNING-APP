import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { assertSafeTestDatabaseName } from './assert-safe-test-database';

loadEnv({ path: resolve(__dirname, '..', '..', '.env') });

const TRAINER_COUNT = 30;
const CLIENT_COUNT = 600;
const SESSIONS_PER_CLIENT = 5;
const SETS_PER_SESSION = 5;
const PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$cGVyZmhzZWVkcGVyZg$cGVyZmhzZWVkcGVyZmhzZWVkcGVyZg';

async function seedPerformance(): Promise<void> {
  process.env.DATABASE_NAME = 'training_test';
  const databaseName = process.env.DATABASE_NAME;
  assertSafeTestDatabaseName(databaseName);

  const client = new Client({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER ?? 'training',
    password: process.env.DATABASE_PASSWORD ?? 'changeme',
    database: databaseName,
  });
  await client.connect();

  try {
    const existing = await client.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE email LIKE 'perf-%'`,
    );
    if ((existing.rows[0]?.count as number) > 0) {
      await explain(client);
      return;
    }

    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role, status)
      VALUES ('perf-admin@example.test', $1, 'Perf', 'Admin', 'ADMIN', 'ACTIVE')
      `,
      [PASSWORD_HASH],
    );

    await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role, status)
      SELECT
        'perf-trainer-' || g || '@example.test',
        $1,
        'Trainer',
        'T' || g,
        'TRAINER',
        'ACTIVE'
      FROM generate_series(1, $2) AS g
      `,
      [PASSWORD_HASH, TRAINER_COUNT],
    );

    await client.query(
      `
      INSERT INTO trainer_profiles (user_id)
      SELECT id FROM users WHERE email LIKE 'perf-trainer-%'
      `,
    );

    await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role, status)
      SELECT
        'perf-client-' || g || '@example.test',
        $1,
        'Client',
        'C' || g,
        'CLIENT',
        'ACTIVE'
      FROM generate_series(1, $2) AS g
      `,
      [PASSWORD_HASH, CLIENT_COUNT],
    );

    await client.query(
      `
      INSERT INTO client_profiles (user_id, primary_goal, experience_level)
      SELECT id, 'MUSCLE_GAIN', 'BEGINNER'
      FROM users
      WHERE email LIKE 'perf-client-%'
      `,
    );

    await client.query(
      `
      INSERT INTO trainer_client_assignments (
        trainer_profile_id,
        client_profile_id,
        assigned_by_user_id
      )
      SELECT
        tp.id,
        cp.id,
        admin.id
      FROM client_profiles cp
      INNER JOIN users cu ON cu.id = cp.user_id
      INNER JOIN users admin ON admin.email = 'perf-admin@example.test'
      INNER JOIN LATERAL (
        SELECT tp2.id
        FROM trainer_profiles tp2
        INNER JOIN users tu ON tu.id = tp2.user_id
        WHERE tu.email LIKE 'perf-trainer-%'
        ORDER BY tu.email
        OFFSET ((regexp_replace(cu.email, '\\D', '', 'g')::int - 1) % $1)
        LIMIT 1
      ) tp ON TRUE
      WHERE cu.email LIKE 'perf-client-%'
      `,
      [TRAINER_COUNT],
    );

    await client.query(
      `
      INSERT INTO exercises (
        name, primary_muscle_group, equipment_type, difficulty_level, status, created_by_user_id
      )
      SELECT
        'Perf Bench',
        'CHEST',
        'BARBELL',
        'INTERMEDIATE',
        'ACTIVE',
        id
      FROM users
      WHERE email = 'perf-admin@example.test'
      `,
    );

    await client.query(
      `
      INSERT INTO workout_templates (name, status, created_by_user_id)
      SELECT 'Perf Template', 'ACTIVE', id
      FROM users
      WHERE email = 'perf-admin@example.test'
      `,
    );

    await client.query(
      `
      INSERT INTO training_plans (
        client_profile_id, name, status, created_by_user_id, activated_at
      )
      SELECT
        cp.id,
        'Perf Plan',
        'ACTIVE',
        admin.id,
        NOW()
      FROM client_profiles cp
      INNER JOIN users cu ON cu.id = cp.user_id
      INNER JOIN users admin ON admin.email = 'perf-admin@example.test'
      WHERE cu.email LIKE 'perf-client-%'
      `,
    );

    await client.query(
      `
      INSERT INTO training_plan_workouts (
        training_plan_id, source_workout_template_id, name_snapshot, position, scheduled_day
      )
      SELECT
        p.id,
        t.id,
        'Perf Workout',
        1,
        'MONDAY'
      FROM training_plans p
      INNER JOIN client_profiles cp ON cp.id = p.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      CROSS JOIN workout_templates t
      WHERE cu.email LIKE 'perf-client-%'
        AND t.name = 'Perf Template'
      `,
    );

    await client.query(
      `
      INSERT INTO training_plan_exercises (
        training_plan_workout_id,
        exercise_id,
        exercise_name_snapshot,
        position,
        sets,
        prescription_type,
        reps_min,
        reps_max,
        rest_seconds,
        target_rir
      )
      SELECT
        w.id,
        e.id,
        'Perf Bench',
        1,
        5,
        'REPS',
        8,
        10,
        90,
        2
      FROM training_plan_workouts w
      INNER JOIN training_plans p ON p.id = w.training_plan_id
      INNER JOIN client_profiles cp ON cp.id = p.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      CROSS JOIN exercises e
      WHERE cu.email LIKE 'perf-client-%'
        AND e.name = 'Perf Bench'
      `,
    );

    await client.query(
      `
      INSERT INTO workout_sessions (
        client_profile_id,
        training_plan_id,
        source_training_plan_workout_id,
        workout_name_snapshot,
        status,
        started_at,
        completed_at
      )
      SELECT
        p.client_profile_id,
        p.id,
        w.id,
        'Perf Workout',
        'COMPLETED',
        NOW() - ((s.n || ' days')::interval),
        NOW() - ((s.n || ' days')::interval) + INTERVAL '45 minutes'
      FROM training_plans p
      INNER JOIN training_plan_workouts w ON w.training_plan_id = p.id
      INNER JOIN client_profiles cp ON cp.id = p.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      CROSS JOIN generate_series(1, $1) AS s(n)
      WHERE cu.email LIKE 'perf-client-%'
      `,
      [SESSIONS_PER_CLIENT],
    );

    await client.query(
      `
      INSERT INTO workout_session_exercises (
        workout_session_id,
        source_training_plan_exercise_id,
        exercise_id,
        exercise_name_snapshot,
        position,
        prescribed_sets,
        prescription_type,
        prescribed_reps_min,
        prescribed_reps_max,
        prescribed_rest_seconds,
        prescribed_target_rir
      )
      SELECT
        s.id,
        tpe.id,
        tpe.exercise_id,
        tpe.exercise_name_snapshot,
        1,
        tpe.sets,
        tpe.prescription_type,
        tpe.reps_min,
        tpe.reps_max,
        tpe.rest_seconds,
        tpe.target_rir
      FROM workout_sessions s
      INNER JOIN training_plan_exercises tpe
        ON tpe.training_plan_workout_id = s.source_training_plan_workout_id
      INNER JOIN client_profiles cp ON cp.id = s.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      WHERE cu.email LIKE 'perf-client-%'
      `,
    );

    await client.query(
      `
      INSERT INTO workout_sets (
        workout_session_exercise_id,
        set_number,
        actual_reps,
        actual_load_kg
      )
      SELECT
        wse.id,
        n,
        8,
        60
      FROM workout_session_exercises wse
      INNER JOIN workout_sessions s ON s.id = wse.workout_session_id
      INNER JOIN client_profiles cp ON cp.id = s.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      CROSS JOIN generate_series(1, $1) AS n
      WHERE cu.email LIKE 'perf-client-%'
      `,
      [SETS_PER_SESSION],
    );

    await client.query(
      `
      INSERT INTO check_ins (
        client_profile_id,
        period_start,
        period_end,
        status,
        stress_level,
        submitted_at
      )
      SELECT
        cp.id,
        DATE '2026-08-24',
        DATE '2026-08-30',
        'SUBMITTED',
        3,
        NOW() - INTERVAL '2 days'
      FROM client_profiles cp
      INNER JOIN users cu ON cu.id = cp.user_id
      WHERE cu.email LIKE 'perf-client-%'
      `,
    );

    await client.query(
      `
      INSERT INTO activity_events (
        type, actor_user_id, client_profile_id, related_entity_type, related_entity_id
      )
      SELECT
        'CHECK_IN_SUBMITTED',
        cu.id,
        ci.client_profile_id,
        'CHECK_IN',
        ci.id
      FROM check_ins ci
      INNER JOIN client_profiles cp ON cp.id = ci.client_profile_id
      INNER JOIN users cu ON cu.id = cp.user_id
      WHERE cu.email LIKE 'perf-client-%'
      `,
    );

    await client.query(
      `
      INSERT INTO notifications (activity_event_id, recipient_user_id)
      SELECT
        ae.id,
        tu.id
      FROM activity_events ae
      INNER JOIN trainer_client_assignments a
        ON a.client_profile_id = ae.client_profile_id
        AND a.ended_at IS NULL
      INNER JOIN trainer_profiles tp ON tp.id = a.trainer_profile_id
      INNER JOIN users tu ON tu.id = tp.user_id
      WHERE tu.email LIKE 'perf-trainer-%'
      `,
    );

    await client.query('COMMIT');
    await explain(client);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function explain(client: Client): Promise<void> {
  const trainer = await client.query<{ id: string }>(
    `
    SELECT tp.id
    FROM trainer_profiles tp
    INNER JOIN users u ON u.id = tp.user_id
    WHERE u.email = 'perf-trainer-1@example.test'
    LIMIT 1
    `,
  );
  const trainerId = trainer.rows[0]?.id;
  if (!trainerId) {
    return;
  }

  const queries: Array<{ name: string; sql: string; params: unknown[] }> = [
    {
      name: 'trainer-pending-check-ins',
      sql: `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT ci.id
        FROM trainer_client_assignments a
        INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
        INNER JOIN users u ON u.id = cp.user_id
        INNER JOIN check_ins ci ON ci.client_profile_id = cp.id
        WHERE a.trainer_profile_id = $1
          AND a.ended_at IS NULL
          AND ci.status = 'SUBMITTED'
          AND u.status = 'ACTIVE'
        ORDER BY ci.submitted_at ASC
        LIMIT 5
      `,
      params: [trainerId],
    },
    {
      name: 'trainer-client-overview',
      sql: `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT cp.id
        FROM trainer_client_assignments a
        INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
        INNER JOIN users u ON u.id = cp.user_id
        LEFT JOIN training_plans tp
          ON tp.client_profile_id = cp.id AND tp.status = 'ACTIVE'
        WHERE a.trainer_profile_id = $1
          AND a.ended_at IS NULL
          AND u.status = 'ACTIVE'
        ORDER BY u.last_name ASC, u.first_name ASC
        LIMIT 20
      `,
      params: [trainerId],
    },
    {
      name: 'clients-without-recent-training',
      sql: `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT cp.id
        FROM trainer_client_assignments a
        INNER JOIN client_profiles cp ON cp.id = a.client_profile_id
        INNER JOIN users u ON u.id = cp.user_id
        WHERE a.trainer_profile_id = $1
          AND a.ended_at IS NULL
          AND u.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1
            FROM workout_sessions s
            WHERE s.client_profile_id = cp.id
              AND s.status = 'COMPLETED'
              AND s.started_at >= NOW() - (14::int * INTERVAL '1 day')
          )
      `,
      params: [trainerId],
    },
    {
      name: 'unread-notification-count',
      sql: `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT COUNT(*)
        FROM notifications n
        INNER JOIN users u ON u.id = n.recipient_user_id
        WHERE u.email = 'perf-trainer-1@example.test'
          AND n.read_at IS NULL
      `,
      params: [],
    },
    {
      name: 'active-plan-lookup',
      sql: `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT p.id
        FROM training_plans p
        INNER JOIN client_profiles cp ON cp.id = p.client_profile_id
        INNER JOIN users u ON u.id = cp.user_id
        WHERE u.email = 'perf-client-1@example.test'
          AND p.status = 'ACTIVE'
        LIMIT 1
      `,
      params: [],
    },
  ];

  for (const query of queries) {
    const result = await client.query(query.sql, query.params);
    process.stdout.write(`\n=== ${query.name} ===\n`);
    for (const row of result.rows as Array<Record<string, unknown>>) {
      process.stdout.write(`${String(Object.values(row)[0])}\n`);
    }
  }
}

void seedPerformance();
