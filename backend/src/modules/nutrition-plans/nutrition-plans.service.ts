import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  isPostgresCheckViolation,
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import { toIsoDateString } from '../clients/iso-date.util';
import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';
import { NotificationPublisherService } from '../notifications/notification-publisher.service';
import { NutritionFoodsService } from '../nutrition-foods/nutrition-foods.service';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { CreateNutritionPlanDto } from './dto/create-nutrition-plan.dto';
import { ListNutritionPlansQueryDto } from './dto/list-nutrition-plans-query.dto';
import {
  CurrentNutritionPlanResponseDto,
  PaginatedNutritionPlansResponseDto,
  NutritionPlanResponseDto,
} from './dto/nutrition-plan-response.dto';
import { NutritionPlanMealInputDto } from './dto/replace-nutrition-plan-meals.dto';
import { UpdateNutritionPlanDto } from './dto/update-nutrition-plan.dto';
import { UpdateNutritionPlanMealItemDto } from './dto/update-nutrition-plan-meal-item.dto';
import { NutritionPlanMealItem } from './entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from './entities/nutrition-plan-meal.entity';
import { NutritionPlan } from './entities/nutrition-plan.entity';
import { NutritionPlanLifecycleStatus } from './enums/nutrition-plan-lifecycle-status.enum';
import {
  NutritionPlanSortField,
  SortDirection,
} from './enums/nutrition-plan-sort-field.enum';
import { NutritionPlanStatus } from './enums/nutrition-plan-status.enum';
import {
  normalizePlanName,
  optionalPlainText,
} from './nutrition-plan-text.util';
import {
  toNutritionPlanResponse,
  toNutritionPlanSummary,
} from './nutrition-plans.mapper';

const SORT_COLUMNS: Record<NutritionPlanSortField, string> = {
  [NutritionPlanSortField.Name]: 'plan.name',
  [NutritionPlanSortField.CreatedAt]: 'plan.createdAt',
  [NutritionPlanSortField.UpdatedAt]: 'plan.updatedAt',
  [NutritionPlanSortField.StartDate]: 'plan.startDate',
};

@Injectable()
export class NutritionPlansService {
  private readonly logger = new Logger(NutritionPlansService.name);

  constructor(
    @InjectRepository(NutritionPlan)
    private readonly plans: Repository<NutritionPlan>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
    private readonly foods: NutritionFoodsService,
    private readonly notifications: NotificationPublisherService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    clientProfileId: string,
    dto: CreateNutritionPlanDto,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);
    this.assertDateRange(dto.startDate ?? null, dto.endDate ?? null);

    const saved = await this.plans.save(
      this.plans.create({
        clientProfileId,
        name: normalizePlanName(dto.name),
        description: optionalPlainText(dto.description),
        status: NutritionPlanStatus.DRAFT,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        targetCaloriesKcal: dto.targetCaloriesKcal ?? null,
        targetProteinG: dto.targetProteinG ?? null,
        targetCarbohydratesG: dto.targetCarbohydratesG ?? null,
        targetFatG: dto.targetFatG ?? null,
        createdByUserId: actor.id,
        activatedAt: null,
        archivedAt: null,
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'nutrition_plan_created',
        nutritionPlanId: saved.id,
        clientProfileId,
        createdByUserId: actor.id,
      }),
    );

    return toNutritionPlanResponse(saved, []);
  }

  async listForClient(
    clientProfileId: string,
    query: ListNutritionPlansQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedNutritionPlansResponseDto> {
    await this.assertActorCanManageClientPlan(actor, clientProfileId);
    return this.list(clientProfileId, query);
  }

  async listMine(
    query: ListNutritionPlansQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedNutritionPlansResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const status =
      query.status === NutritionPlanStatus.DRAFT
        ? null
        : (query.status ?? undefined);
    return this.list(profile.id, query, {
      excludeDraft: true,
      forcedStatus: status,
    });
  }

  async getById(
    clientProfileId: string,
    planId: string,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    await this.assertActorCanManageClientPlan(actor, clientProfileId);
    return this.loadDetailResponse(clientProfileId, planId);
  }

  async getMineById(
    planId: string,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const plan = await this.loadDetail(profile.id, planId);
    if (plan.status === NutritionPlanStatus.DRAFT) {
      throw new NotFoundException('Nutrition plan not found');
    }
    return toNutritionPlanResponse(plan, plan.meals);
  }

  async getCurrentMine(
    actor: AuthenticatedUser,
  ): Promise<CurrentNutritionPlanResponseDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const plan = await this.plans
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.meals', 'meal')
      .leftJoinAndSelect('meal.items', 'item')
      .where('plan.clientProfileId = :clientProfileId', {
        clientProfileId: profile.id,
      })
      .andWhere('plan.status = :status', {
        status: NutritionPlanStatus.ACTIVE,
      })
      .orderBy('meal.position', 'ASC')
      .addOrderBy('item.position', 'ASC')
      .getOne();

    return {
      nutritionPlan: plan ? toNutritionPlanResponse(plan, plan.meals) : null,
    };
  }

  async update(
    clientProfileId: string,
    planId: string,
    dto: UpdateNutritionPlanDto,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    const saved = await this.dataSource.transaction(async (manager) => {
      const plan = await this.lockPlan(clientProfileId, planId, manager);
      this.assertEditable(plan);

      if (dto.name !== undefined) {
        plan.name = normalizePlanName(dto.name);
      }
      if (dto.description !== undefined) {
        plan.description = optionalPlainText(dto.description);
      }
      if (dto.startDate !== undefined) {
        plan.startDate = dto.startDate;
      }
      if (dto.endDate !== undefined) {
        plan.endDate = dto.endDate;
      }
      if (dto.targetCaloriesKcal !== undefined) {
        plan.targetCaloriesKcal = dto.targetCaloriesKcal;
      }
      if (dto.targetProteinG !== undefined) {
        plan.targetProteinG = dto.targetProteinG;
      }
      if (dto.targetCarbohydratesG !== undefined) {
        plan.targetCarbohydratesG = dto.targetCarbohydratesG;
      }
      if (dto.targetFatG !== undefined) {
        plan.targetFatG = dto.targetFatG;
      }
      this.assertDateRange(
        this.toDateString(plan.startDate),
        this.toDateString(plan.endDate),
      );

      return manager.getRepository(NutritionPlan).save(plan);
    });

    return this.loadDetailResponse(clientProfileId, saved.id);
  }

  async replaceMeals(
    clientProfileId: string,
    planId: string,
    meals: NutritionPlanMealInputDto[],
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    try {
      await this.dataSource.transaction(async (manager) => {
        const plan = await this.lockPlan(clientProfileId, planId, manager);
        this.assertEditable(plan);

        if (plan.status === NutritionPlanStatus.ACTIVE && meals.length === 0) {
          throw new ConflictException(
            'ACTIVE nutrition plans cannot have an empty meal list',
          );
        }

        const foodIds = meals.flatMap((meal) =>
          meal.items.map((item) => item.foodId),
        );
        const uniqueFoodIds = [...new Set(foodIds)];
        const catalogFoods = await this.foods.requireActiveFoodsByIds(
          uniqueFoodIds,
          manager,
        );
        const foodsById = new Map(catalogFoods.map((food) => [food.id, food]));

        await manager.getRepository(NutritionPlanMeal).delete({
          nutritionPlanId: plan.id,
        });

        for (const [mealIndex, input] of meals.entries()) {
          const meal = await manager.getRepository(NutritionPlanMeal).save(
            manager.getRepository(NutritionPlanMeal).create({
              nutritionPlanId: plan.id,
              name: normalizePlanName(input.name),
              mealType: input.mealType,
              position: mealIndex + 1,
              notes: optionalPlainText(input.notes),
            }),
          );

          const itemRows = input.items.map((item, itemIndex) => {
            const food = foodsById.get(item.foodId);
            if (!food) {
              throw new NotFoundException('Food not found');
            }
            return manager.getRepository(NutritionPlanMealItem).create({
              nutritionPlanMealId: meal.id,
              sourceFoodId: food.id,
              foodNameSnapshot: food.name,
              brandSnapshot: food.brand,
              quantityGrams: item.quantityGrams,
              caloriesPer100gSnapshot: food.caloriesPer100g,
              proteinGPer100gSnapshot: food.proteinGPer100g,
              carbohydratesGPer100gSnapshot: food.carbohydratesGPer100g,
              fatGPer100gSnapshot: food.fatGPer100g,
              fiberGPer100gSnapshot: food.fiberGPer100g,
              position: itemIndex + 1,
              notes: optionalPlainText(item.notes),
            });
          });
          await manager.getRepository(NutritionPlanMealItem).save(itemRows);
        }
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    this.logger.log(
      JSON.stringify({
        event: 'nutrition_plan_meals_snapshotted',
        nutritionPlanId: planId,
        clientProfileId,
        mealCount: meals.length,
        actorUserId: actor.id,
      }),
    );

    return this.loadDetailResponse(clientProfileId, planId);
  }

  async updateMealItem(
    clientProfileId: string,
    planId: string,
    mealItemId: string,
    dto: UpdateNutritionPlanMealItemDto,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    await this.dataSource.transaction(async (manager) => {
      const plan = await this.lockPlan(clientProfileId, planId, manager);
      this.assertEditable(plan);
      const item = await manager.getRepository(NutritionPlanMealItem).findOne({
        where: { id: mealItemId },
        relations: { meal: true },
      });
      if (!item || item.meal.nutritionPlanId !== plan.id) {
        throw new NotFoundException('Nutrition plan meal item not found');
      }

      if (dto.quantityGrams !== undefined) {
        item.quantityGrams = dto.quantityGrams;
      }
      if (dto.notes !== undefined) {
        item.notes = optionalPlainText(dto.notes);
      }

      await manager.getRepository(NutritionPlanMealItem).save(item);

      this.logger.log(
        JSON.stringify({
          event: 'nutrition_plan_meal_item_personalized',
          nutritionPlanId: plan.id,
          nutritionPlanMealItemId: item.id,
          actorUserId: actor.id,
        }),
      );
    });

    return this.loadDetailResponse(clientProfileId, planId);
  }

  async updateStatus(
    clientProfileId: string,
    planId: string,
    status: NutritionPlanLifecycleStatus,
    actor: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    const client = await this.assertActorCanManageClientPlan(
      actor,
      clientProfileId,
    );
    this.assertClientMutable(client);

    try {
      await this.dataSource.transaction(async (manager) => {
        const lockedClient = await this.clients.lockByIdWithUser(
          manager,
          clientProfileId,
        );
        if (!lockedClient) {
          throw new NotFoundException('Client not found');
        }
        this.assertClientMutable(lockedClient);

        const plan = await this.lockPlan(clientProfileId, planId, manager);

        if (status === NutritionPlanLifecycleStatus.ARCHIVED) {
          if (plan.status === NutritionPlanStatus.ARCHIVED) {
            return;
          }
          plan.status = NutritionPlanStatus.ARCHIVED;
          plan.archivedAt = new Date();
          await manager.getRepository(NutritionPlan).save(plan);
          this.logger.log(
            JSON.stringify({
              event: 'nutrition_plan_archived',
              nutritionPlanId: plan.id,
              clientProfileId,
              actorUserId: actor.id,
            }),
          );
          return;
        }

        if (plan.status === NutritionPlanStatus.ACTIVE) {
          return;
        }

        await this.assertPlanActivatable(plan.id, manager);

        const previous = await manager
          .getRepository(NutritionPlan)
          .createQueryBuilder('plan')
          .setLock('pessimistic_write')
          .where('plan.clientProfileId = :clientProfileId', { clientProfileId })
          .andWhere('plan.status = :status', {
            status: NutritionPlanStatus.ACTIVE,
          })
          .andWhere('plan.id <> :planId', { planId: plan.id })
          .getOne();

        if (previous) {
          previous.status = NutritionPlanStatus.ARCHIVED;
          previous.archivedAt = new Date();
          await manager.getRepository(NutritionPlan).save(previous);
          this.logger.log(
            JSON.stringify({
              event: 'previous_active_nutrition_plan_archived',
              nutritionPlanId: previous.id,
              replacedByNutritionPlanId: plan.id,
              clientProfileId,
            }),
          );
        }

        plan.status = NutritionPlanStatus.ACTIVE;
        plan.activatedAt = new Date();
        plan.archivedAt = null;
        await manager.getRepository(NutritionPlan).save(plan);
        await this.notifications.publish(manager, {
          type: ActivityEventType.NUTRITION_PLAN_ACTIVATED,
          actorUserId: actor.id,
          clientProfileId,
          relatedEntityId: plan.id,
          recipientUserId: lockedClient.userId,
        });
        this.logger.log(
          JSON.stringify({
            event: 'nutrition_plan_activated',
            nutritionPlanId: plan.id,
            clientProfileId,
            actorUserId: actor.id,
          }),
        );
      });
    } catch (error) {
      this.throwMappedPersistenceError(error);
    }

    return this.loadDetailResponse(clientProfileId, planId);
  }

  private async list(
    clientProfileId: string,
    query: ListNutritionPlansQueryDto,
    options?: {
      excludeDraft?: boolean;
      forcedStatus?: NutritionPlanStatus | null;
    },
  ): Promise<PaginatedNutritionPlansResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? NutritionPlanSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';

    const qb = this.plans
      .createQueryBuilder('plan')
      .where('plan.clientProfileId = :clientProfileId', { clientProfileId });

    if (options?.forcedStatus === null) {
      qb.andWhere('1 = 0');
    } else if (options?.forcedStatus) {
      qb.andWhere('plan.status = :status', { status: options.forcedStatus });
    } else if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    if (options?.excludeDraft && !options.forcedStatus && !query.status) {
      qb.andWhere('plan.status IN (:...visible)', {
        visible: [NutritionPlanStatus.ACTIVE, NutritionPlanStatus.ARCHIVED],
      });
    }

    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(plan.name ILIKE :search ESCAPE '\\' OR plan.description ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('plan.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toNutritionPlanSummary(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  private async assertActorCanManageClientPlan(
    actor: AuthenticatedUser,
    clientProfileId: string,
  ): Promise<ClientProfile> {
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
    return client;
  }

  private assertClientMutable(client: ClientProfile): void {
    if (client.user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('Client is disabled');
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

  private assertEditable(plan: NutritionPlan): void {
    if (plan.status === NutritionPlanStatus.ARCHIVED) {
      throw new ConflictException('Nutrition plan is archived');
    }
  }

  private assertDateRange(
    startDate: string | null,
    endDate: string | null,
  ): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private toDateString(value: Date | string | null): string | null {
    return toIsoDateString(value);
  }

  private async lockPlan(
    clientProfileId: string,
    planId: string,
    manager: EntityManager,
  ): Promise<NutritionPlan> {
    const plan = await manager
      .getRepository(NutritionPlan)
      .createQueryBuilder('plan')
      .setLock('pessimistic_write')
      .where('plan.id = :planId', { planId })
      .getOne();
    if (!plan || plan.clientProfileId !== clientProfileId) {
      throw new NotFoundException('Nutrition plan not found');
    }
    return plan;
  }

  private async loadDetail(
    clientProfileId: string,
    planId: string,
  ): Promise<NutritionPlan> {
    const plan = await this.plans
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.meals', 'meal')
      .leftJoinAndSelect('meal.items', 'item')
      .where('plan.id = :planId', { planId })
      .andWhere('plan.clientProfileId = :clientProfileId', { clientProfileId })
      .orderBy('meal.position', 'ASC')
      .addOrderBy('item.position', 'ASC')
      .getOne();
    if (!plan) {
      throw new NotFoundException('Nutrition plan not found');
    }
    plan.meals = plan.meals ?? [];
    return plan;
  }

  private async loadDetailResponse(
    clientProfileId: string,
    planId: string,
  ): Promise<NutritionPlanResponseDto> {
    const plan = await this.loadDetail(clientProfileId, planId);
    return toNutritionPlanResponse(plan, plan.meals);
  }

  /**
   * DRAFT → ACTIVE and ARCHIVED → ACTIVE require currently ACTIVE source
   * Foods. An already-ACTIVE plan is not revalidated when a catalog Food
   * later archives.
   */
  private async assertPlanActivatable(
    planId: string,
    manager: EntityManager,
  ): Promise<void> {
    const meals = await manager.getRepository(NutritionPlanMeal).find({
      where: { nutritionPlanId: planId },
      relations: { items: true },
      order: { position: 'ASC' },
    });
    if (meals.length === 0) {
      throw new ConflictException('Nutrition plan has no meals');
    }

    const foodIds: string[] = [];
    for (const meal of meals) {
      const items = meal.items ?? [];
      if (items.length === 0) {
        throw new ConflictException('Nutrition plan meal has no items');
      }
      for (const item of items) {
        foodIds.push(item.sourceFoodId);
      }
    }

    await this.foods.requireActiveFoodsByIds(foodIds, manager);
  }

  private throwMappedPersistenceError(error: unknown): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    if (error instanceof ConflictException) {
      throw error;
    }
    if (error instanceof NotFoundException) {
      throw error;
    }
    if (isPostgresUniqueViolation(error)) {
      throw new ConflictException(
        'Client already has an ACTIVE nutrition plan',
      );
    }
    if (isPostgresCheckViolation(error)) {
      throw new BadRequestException('Invalid nutrition plan');
    }
    if (isPostgresForeignKeyViolation(error)) {
      throw new ConflictException('Nutrition plan reference is invalid');
    }
    throw error;
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
}
