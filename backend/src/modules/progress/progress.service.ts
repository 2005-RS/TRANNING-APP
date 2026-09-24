import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import {
  ExerciseProgressDetailQueryDto,
  ListProgressExercisesQueryDto,
  ProgressSummaryQueryDto,
} from './dto/progress-query.dto';
import {
  DurationProgressSectionDto,
  ExerciseProgressDetailResponseDto,
  PaginatedExerciseProgressResponseDto,
  ProgressSummaryResponseDto,
  RepsProgressSectionDto,
} from './dto/progress-response.dto';
import { ProgressExerciseSortField } from './enums/progress-exercise-sort-field.enum';
import {
  BestRow,
  ExerciseListRow,
  HistoryRow,
  HistorySetRow,
  SummaryRow,
  TypeAggregateRow,
  emptySummary,
  paginationMeta,
  toDetailResponse,
  toDurationSection,
  toDurationTrend,
  toHistoryItems,
  toListItem,
  toRepsSection,
  toRepsTrend,
  toSummary,
} from './progress.mapper';
import {
  epleyEligibleSql,
  epleySql,
  escapeIlike,
  utcDayEndExclusive,
  utcDayStart,
} from './progress-metrics.util';
import {
  COMPLETED_SET_FROM,
  LIST_SORT_SQL,
  SqlParams,
  bestEstimated1RmSql,
  bestLoadSql,
  completedClientPredicate,
  dateRangePredicate,
  sortDirectionSql,
  volumeSumSql,
} from './progress-sql';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
  ) {}

  async getSummaryMine(
    query: ProgressSummaryQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ProgressSummaryResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.getSummaryForClient(profile.id, query);
  }

  async getSummaryForClient(
    clientProfileId: string,
    query: ProgressSummaryQueryDto,
    actor?: AuthenticatedUser,
  ): Promise<ProgressSummaryResponseDto> {
    if (actor) {
      await this.assertActorCanReadClientProgress(actor, clientProfileId);
    }
    this.assertDateRange(query.dateFrom, query.dateTo);

    const params = new SqlParams();
    const where = this.baseWhere(params, clientProfileId, query);
    const rows = await this.query<SummaryRow>(
      `
      SELECT
        COUNT(DISTINCT s.id) AS completed_sessions,
        COUNT(set_row.id) AS performed_sets,
        COUNT(DISTINCT wse.exercise_id) AS exercises_performed,
        COALESCE(SUM(set_row.actual_reps) FILTER (WHERE wse.prescription_type = 'REPS'), 0) AS total_reps,
        COALESCE(ROUND(${volumeSumSql(`wse.prescription_type = 'REPS'`)}, 2), 0) AS external_load_volume_kg,
        COALESCE(SUM(set_row.actual_duration_seconds) FILTER (WHERE wse.prescription_type = 'DURATION'), 0) AS total_duration_seconds,
        MIN(s.started_at) AS first_completed_session_at,
        MAX(s.started_at) AS last_completed_session_at
      ${COMPLETED_SET_FROM}
      WHERE ${where}
      `,
      params.values,
    );

    return toSummary(rows[0]) ?? emptySummary();
  }

  async listExercisesMine(
    query: ListProgressExercisesQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedExerciseProgressResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.listExercisesForClient(profile.id, query);
  }

  async listExercisesForClient(
    clientProfileId: string,
    query: ListProgressExercisesQueryDto,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedExerciseProgressResponseDto> {
    if (actor) {
      await this.assertActorCanReadClientProgress(actor, clientProfileId);
    }
    this.assertDateRange(query.dateFrom, query.dateTo);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? ProgressExerciseSortField.LastPerformedAt;
    const direction = sortDirectionSql(query.direction);
    const sortSql = LIST_SORT_SQL[sort];

    const countParams = new SqlParams();
    const countWhere = this.listWhere(countParams, clientProfileId, query);
    const countRows = await this.query<{ total: string | number }>(
      `
      SELECT COUNT(*) AS total FROM (
        SELECT wse.exercise_id, wse.prescription_type
        ${COMPLETED_SET_FROM}
        WHERE ${countWhere}
        GROUP BY wse.exercise_id, wse.prescription_type
      ) grouped
      `,
      countParams.values,
    );
    const totalItems = Number(countRows[0]?.total ?? 0);

    const params = new SqlParams();
    const where = this.listWhere(params, clientProfileId, query);
    const offset = params.add((page - 1) * limit);
    const limitParam = params.add(limit);

    const rows = await this.query<ExerciseListRow>(
      `
      SELECT
        wse.exercise_id,
        e.name AS exercise_name,
        e.status AS exercise_status,
        wse.prescription_type,
        COUNT(DISTINCT s.id) AS completed_sessions,
        COUNT(set_row.id) AS performed_sets,
        CASE WHEN wse.prescription_type = 'REPS'
          THEN COALESCE(SUM(set_row.actual_reps), 0) END AS total_reps,
        CASE WHEN wse.prescription_type = 'REPS'
          THEN COALESCE(ROUND(${volumeSumSql()}, 2), 0) END AS external_load_volume_kg,
        CASE WHEN wse.prescription_type = 'REPS'
          THEN ${bestLoadSql()} END AS best_load_kg,
        CASE WHEN wse.prescription_type = 'REPS'
          THEN MAX(set_row.actual_reps) END AS best_reps,
        CASE WHEN wse.prescription_type = 'REPS'
          THEN ${bestEstimated1RmSql()} END AS best_estimated_1rm_kg,
        CASE WHEN wse.prescription_type = 'DURATION'
          THEN COALESCE(SUM(set_row.actual_duration_seconds), 0) END AS total_duration_seconds,
        CASE WHEN wse.prescription_type = 'DURATION'
          THEN MAX(set_row.actual_duration_seconds) END AS best_duration_seconds,
        MIN(s.started_at) AS first_performed_at,
        MAX(s.started_at) AS last_performed_at
      ${COMPLETED_SET_FROM}
      WHERE ${where}
      GROUP BY wse.exercise_id, wse.prescription_type, e.name, e.status
      ORDER BY ${sortSql} ${direction} NULLS LAST, e.name ASC, wse.exercise_id ASC, wse.prescription_type ASC
      OFFSET ${offset}
      LIMIT ${limitParam}
      `,
      params.values,
    );

    return {
      data: rows.map((row) => toListItem(row)),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  async getExerciseMine(
    exerciseId: string,
    query: ExerciseProgressDetailQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExerciseProgressDetailResponseDto> {
    this.assertClientActor(actor);
    const profile = await this.requireOwnClientProfile(actor);
    return this.getExerciseForClient(profile.id, exerciseId, query);
  }

  async getExerciseForClient(
    clientProfileId: string,
    exerciseId: string,
    query: ExerciseProgressDetailQueryDto,
    actor?: AuthenticatedUser,
  ): Promise<ExerciseProgressDetailResponseDto> {
    if (actor) {
      await this.assertActorCanReadClientProgress(actor, clientProfileId);
    }
    this.assertDateRange(query.dateFrom, query.dateTo);

    const aggregates = await this.loadTypeAggregates(
      clientProfileId,
      exerciseId,
      query,
    );
    if (aggregates.length === 0) {
      throw new NotFoundException('Exercise progress not found');
    }

    const availableTypes = aggregates.map((row) => row.prescription_type);
    const requested = query.prescriptionType;
    if (requested && !availableTypes.includes(requested)) {
      throw new NotFoundException('Exercise progress not found');
    }

    const identity = aggregates[0];
    if (!identity) {
      throw new NotFoundException('Exercise progress not found');
    }

    const repsAggregate = aggregates.find(
      (row) => row.prescription_type === WorkoutPrescriptionType.REPS,
    );
    const durationAggregate = aggregates.find(
      (row) => row.prescription_type === WorkoutPrescriptionType.DURATION,
    );
    const includeReps =
      (!requested || requested === WorkoutPrescriptionType.REPS) &&
      Boolean(repsAggregate);
    const includeDuration =
      (!requested || requested === WorkoutPrescriptionType.DURATION) &&
      Boolean(durationAggregate);

    const reps =
      includeReps && repsAggregate
        ? await this.loadRepsSection(
            clientProfileId,
            exerciseId,
            query,
            repsAggregate,
          )
        : null;
    const duration =
      includeDuration && durationAggregate
        ? await this.loadDurationSection(
            clientProfileId,
            exerciseId,
            query,
            durationAggregate,
          )
        : null;

    return toDetailResponse(
      exerciseId,
      availableTypes,
      identity,
      reps,
      duration,
    );
  }

  private async loadTypeAggregates(
    clientProfileId: string,
    exerciseId: string,
    query: ExerciseProgressDetailQueryDto,
  ): Promise<TypeAggregateRow[]> {
    const params = new SqlParams();
    const where = `${this.baseWhere(params, clientProfileId, query)}
      AND wse.exercise_id = ${params.add(exerciseId)}`;
    return this.query<TypeAggregateRow>(
      `
      SELECT
        wse.prescription_type,
        e.name AS exercise_name,
        e.status AS exercise_status,
        COUNT(DISTINCT s.id) AS completed_sessions,
        COUNT(set_row.id) AS performed_sets,
        COALESCE(SUM(set_row.actual_reps) FILTER (WHERE wse.prescription_type = 'REPS'), 0) AS total_reps,
        COALESCE(ROUND(${volumeSumSql(`wse.prescription_type = 'REPS'`)}, 2), 0) AS external_load_volume_kg,
        ${bestLoadSql(`wse.prescription_type = 'REPS'`)} AS best_load_kg,
        MAX(set_row.actual_reps) FILTER (WHERE wse.prescription_type = 'REPS') AS best_reps,
        ${bestEstimated1RmSql(`wse.prescription_type = 'REPS'`)} AS best_estimated_1rm_kg,
        COALESCE(SUM(set_row.actual_duration_seconds) FILTER (WHERE wse.prescription_type = 'DURATION'), 0) AS total_duration_seconds,
        MAX(set_row.actual_duration_seconds) FILTER (WHERE wse.prescription_type = 'DURATION') AS best_duration_seconds,
        MIN(s.started_at) AS first_performed_at,
        MAX(s.started_at) AS last_performed_at
      ${COMPLETED_SET_FROM}
      WHERE ${where}
      GROUP BY wse.prescription_type, e.name, e.status
      ORDER BY wse.prescription_type ASC
      `,
      params.values,
    );
  }

  private async loadRepsSection(
    clientProfileId: string,
    exerciseId: string,
    query: ExerciseProgressDetailQueryDto,
    aggregate: TypeAggregateRow,
  ): Promise<RepsProgressSectionDto> {
    const [bests, historyPage] = await Promise.all([
      this.loadBests(
        clientProfileId,
        exerciseId,
        WorkoutPrescriptionType.REPS,
        query,
      ),
      this.loadHistoryPage(
        clientProfileId,
        exerciseId,
        WorkoutPrescriptionType.REPS,
        query,
      ),
    ]);
    return toRepsSection(
      aggregate,
      bests,
      historyPage.items,
      historyPage.meta,
      toRepsTrend(historyPage.rows),
    );
  }

  private async loadDurationSection(
    clientProfileId: string,
    exerciseId: string,
    query: ExerciseProgressDetailQueryDto,
    aggregate: TypeAggregateRow,
  ): Promise<DurationProgressSectionDto> {
    const [bests, historyPage] = await Promise.all([
      this.loadBests(
        clientProfileId,
        exerciseId,
        WorkoutPrescriptionType.DURATION,
        query,
      ),
      this.loadHistoryPage(
        clientProfileId,
        exerciseId,
        WorkoutPrescriptionType.DURATION,
        query,
      ),
    ]);
    return toDurationSection(
      aggregate,
      bests,
      historyPage.items,
      historyPage.meta,
      toDurationTrend(historyPage.rows),
    );
  }

  private async loadBests(
    clientProfileId: string,
    exerciseId: string,
    prescriptionType: WorkoutPrescriptionType,
    query: ExerciseProgressDetailQueryDto,
  ): Promise<Map<string, BestRow>> {
    const params = new SqlParams();
    const where = `${this.baseWhere(params, clientProfileId, query)}
      AND wse.exercise_id = ${params.add(exerciseId)}
      AND wse.prescription_type = ${params.add(prescriptionType)}`;

    const metricSql =
      prescriptionType === WorkoutPrescriptionType.REPS
        ? `
        SELECT * FROM (
          SELECT DISTINCT ON (metric)
            metric,
            value,
            workout_session_id,
            performed_at,
            set_number,
            actual_load_kg,
            actual_reps
          FROM (
            SELECT
              'bestLoadKg' AS metric,
              set_row.actual_load_kg AS value,
              s.id AS workout_session_id,
              s.started_at AS performed_at,
              set_row.set_number,
              set_row.actual_load_kg,
              set_row.actual_reps,
              set_row.id
            ${COMPLETED_SET_FROM}
            WHERE ${where}
              AND set_row.actual_reps > 0
              AND set_row.actual_load_kg IS NOT NULL
            UNION ALL
            SELECT
              'bestReps',
              set_row.actual_reps::numeric,
              s.id,
              s.started_at,
              set_row.set_number,
              set_row.actual_load_kg,
              set_row.actual_reps,
              set_row.id
            ${COMPLETED_SET_FROM}
            WHERE ${where}
              AND set_row.actual_reps IS NOT NULL
            UNION ALL
            SELECT
              'bestEstimated1RmKg',
              ${epleySql('set_row')},
              s.id,
              s.started_at,
              set_row.set_number,
              set_row.actual_load_kg,
              set_row.actual_reps,
              set_row.id
            ${COMPLETED_SET_FROM}
            WHERE ${where}
              AND ${epleyEligibleSql('set_row')}
          ) candidates
          ORDER BY metric, value DESC, performed_at ASC, set_number ASC, id ASC
        ) ranked
        `
        : `
        SELECT DISTINCT ON (metric)
          metric,
          value,
          workout_session_id,
          performed_at,
          set_number,
          actual_load_kg,
          actual_reps
        FROM (
          SELECT
            'bestDurationSeconds' AS metric,
            set_row.actual_duration_seconds::numeric AS value,
            s.id AS workout_session_id,
            s.started_at AS performed_at,
            set_row.set_number,
            set_row.actual_load_kg,
            set_row.actual_reps,
            set_row.id
          ${COMPLETED_SET_FROM}
          WHERE ${where}
            AND set_row.actual_duration_seconds IS NOT NULL
        ) candidates
        ORDER BY metric, value DESC, performed_at ASC, set_number ASC, id ASC
        `;

    const rows = await this.query<BestRow>(metricSql, params.values);
    return new Map(rows.map((row) => [row.metric, row]));
  }

  private async loadHistoryPage(
    clientProfileId: string,
    exerciseId: string,
    prescriptionType: WorkoutPrescriptionType,
    query: ExerciseProgressDetailQueryDto,
  ): Promise<{
    rows: HistoryRow[];
    items: ReturnType<typeof toHistoryItems>;
    meta: ReturnType<typeof paginationMeta>;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const countParams = new SqlParams();
    const countWhere = `${this.baseWhere(countParams, clientProfileId, query)}
      AND wse.exercise_id = ${countParams.add(exerciseId)}
      AND wse.prescription_type = ${countParams.add(prescriptionType)}`;
    const countRows = await this.query<{ total: string | number }>(
      `
      SELECT COUNT(*) AS total FROM (
        SELECT s.id
        ${COMPLETED_SET_FROM}
        WHERE ${countWhere}
        GROUP BY s.id
      ) grouped
      `,
      countParams.values,
    );
    const totalItems = Number(countRows[0]?.total ?? 0);

    const params = new SqlParams();
    const where = `${this.baseWhere(params, clientProfileId, query)}
      AND wse.exercise_id = ${params.add(exerciseId)}
      AND wse.prescription_type = ${params.add(prescriptionType)}`;
    const offset = params.add((page - 1) * limit);
    const limitParam = params.add(limit);

    const rows = await this.query<HistoryRow>(
      `
      SELECT
        s.id AS workout_session_id,
        s.workout_name_snapshot AS workout_name,
        s.started_at AS performed_at,
        (ARRAY_AGG(wse.exercise_name_snapshot ORDER BY wse.position))[1] AS exercise_name_snapshot,
        COUNT(set_row.id) AS performed_sets,
        COALESCE(SUM(set_row.actual_reps), 0) AS total_reps,
        COALESCE(ROUND(${volumeSumSql()}, 2), 0) AS session_external_load_volume_kg,
        ${bestEstimated1RmSql()} AS best_estimated_1rm_kg,
        ${bestLoadSql()} AS best_load_kg,
        COALESCE(SUM(set_row.actual_duration_seconds), 0) AS total_duration_seconds,
        MAX(set_row.actual_duration_seconds) AS best_duration_seconds
      ${COMPLETED_SET_FROM}
      WHERE ${where}
      GROUP BY s.id, s.workout_name_snapshot, s.started_at
      ORDER BY s.started_at DESC, s.id ASC
      OFFSET ${offset}
      LIMIT ${limitParam}
      `,
      params.values,
    );

    const sessionIds = rows.map((row) => row.workout_session_id);
    const setRows =
      sessionIds.length === 0
        ? []
        : await this.loadHistorySets(
            clientProfileId,
            exerciseId,
            prescriptionType,
            sessionIds,
          );

    return {
      rows,
      items: toHistoryItems(rows, setRows, prescriptionType),
      meta: paginationMeta(page, limit, totalItems),
    };
  }

  private async loadHistorySets(
    clientProfileId: string,
    exerciseId: string,
    prescriptionType: WorkoutPrescriptionType,
    sessionIds: string[],
  ): Promise<HistorySetRow[]> {
    const params = new SqlParams();
    const client = params.add(clientProfileId);
    const exercise = params.add(exerciseId);
    const type = params.add(prescriptionType);
    const ids = params.add(sessionIds);
    return this.query<HistorySetRow>(
      `
      SELECT
        wse.workout_session_id,
        wse.id AS workout_session_exercise_id,
        wse.position,
        wse.exercise_name_snapshot,
        set_row.id,
        set_row.set_number,
        set_row.actual_reps,
        set_row.actual_duration_seconds,
        set_row.actual_load_kg,
        set_row.actual_rpe,
        set_row.actual_rir
      FROM workout_session_exercises wse
      INNER JOIN workout_sets set_row
        ON set_row.workout_session_exercise_id = wse.id
      INNER JOIN workout_sessions s
        ON s.id = wse.workout_session_id
      WHERE s.client_profile_id = ${client}
        AND s.status = 'COMPLETED'
        AND wse.exercise_id = ${exercise}
        AND wse.prescription_type = ${type}
        AND wse.workout_session_id = ANY(${ids}::uuid[])
      ORDER BY wse.workout_session_id ASC, wse.position ASC, set_row.set_number ASC
      `,
      params.values,
    );
  }

  private baseWhere(
    params: SqlParams,
    clientProfileId: string,
    query: { dateFrom?: string; dateTo?: string },
  ): string {
    return `${completedClientPredicate(params, clientProfileId)}${dateRangePredicate(
      params,
      query.dateFrom,
      query.dateTo,
      utcDayStart,
      utcDayEndExclusive,
    )}`;
  }

  private listWhere(
    params: SqlParams,
    clientProfileId: string,
    query: ListProgressExercisesQueryDto,
  ): string {
    let where = this.baseWhere(params, clientProfileId, query);
    if (query.prescriptionType) {
      where += ` AND wse.prescription_type = ${params.add(query.prescriptionType)}`;
    }
    const search = query.search?.trim();
    if (search) {
      where += ` AND e.name ILIKE ${params.add(`%${escapeIlike(search)}%`)} ESCAPE E'\\\\'`;
    }
    return where;
  }

  private async assertActorCanReadClientProgress(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<void> {
    if (actor.role === UserRole.CLIENT) {
      throw new ForbiddenException();
    }

    if (actor.role === UserRole.TRAINER) {
      await this.access.assertCanAccessClient(actor.id, clientProfileId);
    }

    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private assertClientActor(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.CLIENT) {
      throw new ForbiddenException();
    }
  }

  private async requireOwnClientProfile(
    actor: AuthenticatedUser,
  ): Promise<ClientProfile> {
    const profile = await this.clients.findByUserIdWithUser(actor.id);
    if (!profile) {
      this.logger.error(
        JSON.stringify({
          event: 'client_profile_missing',
          userId: actor.id,
        }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private assertDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException('dateTo must be on or after dateFrom');
    }
  }

  private async query<T extends object>(
    sql: string,
    params: unknown[],
  ): Promise<T[]> {
    return (await this.dataSource.query(sql, params)) as T[];
  }
}
