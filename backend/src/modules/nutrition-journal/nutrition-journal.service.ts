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
import { EntityManager, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { ClientsService } from '../clients/clients.service';
import {
  parseStrictIsoDate,
  toIsoDateString,
  utcTodayIsoDate,
} from '../clients/iso-date.util';
import {
  NutrientVector,
  roundNutrient,
  scalePer100,
} from '../nutrition-engine';
import { NutritionFood } from '../nutrition-foods/entities/nutrition-food.entity';
import { NutritionFoodStatus } from '../nutrition-foods/enums/nutrition-food-status.enum';
import { NutritionFoodVisibility } from '../nutrition-foods/enums/nutrition-food-visibility.enum';
import { FOOD_RESPONSE_RELATIONS } from '../nutrition-foods/nutrition-foods.service';
import { NutritionPlanMealItem } from '../nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionPlan } from '../nutrition-plans/entities/nutrition-plan.entity';
import { NutritionMealType } from '../nutrition-plans/enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../nutrition-plans/enums/nutrition-plan-status.enum';
import { TrainerClientAccessService } from '../trainer-client-assignments/trainer-client-access.service';
import { UserRole } from '../users/enums/user-role.enum';
import {
  JournalDayResponseDto,
  JournalEntryDto,
} from './dto/journal-day-response.dto';
import {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
} from './dto/journal-entry-input.dto';
import { FoodLogEntry } from './entities/food-log-entry.entity';
import { FoodLogEntryStatus } from './enums/food-log-entry-status.enum';
import {
  buildJournalDay,
  CORE_CODES,
  orderedPlanItems,
  planItemPer100,
  roundVector,
  toJournalEntryDto,
} from './journal-day.builder';
import {
  JOURNAL_EDITABLE_FUTURE_DAYS,
  JOURNAL_EDITABLE_PAST_DAYS,
} from './nutrition-journal.constants';

interface ResolvedAmount {
  grams: number;
  portionLabel: string | null;
  portionQuantity: number | null;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class NutritionJournalService {
  private readonly logger = new Logger(NutritionJournalService.name);

  constructor(
    @InjectRepository(FoodLogEntry)
    private readonly entries: Repository<FoodLogEntry>,
    @InjectRepository(NutritionPlan)
    private readonly plans: Repository<NutritionPlan>,
    @InjectRepository(NutritionFood)
    private readonly foods: Repository<NutritionFood>,
    private readonly clients: ClientsService,
    private readonly access: TrainerClientAccessService,
  ) {}

  // ---- Reads ---------------------------------------------------------------

  async getMyDay(
    actor: AuthenticatedUser,
    date: string,
    now = new Date(),
  ): Promise<JournalDayResponseDto> {
    const day = this.parseDate(date);
    const profile = await this.requireOwnClientProfile(actor);
    return this.buildDay(profile.id, day, this.isEditable(day, now));
  }

  /** Read-only journal for the assigned TRAINER (D5: ADMIN has no default access). */
  async getClientDay(
    actor: AuthenticatedUser,
    clientProfileId: string,
    date: string,
  ): Promise<JournalDayResponseDto> {
    const day = this.parseDate(date);
    if (actor.role !== UserRole.TRAINER) {
      throw new ForbiddenException();
    }
    await this.access.assertCanAccessClient(actor.id, clientProfileId);
    const client = await this.clients.findByIdWithUser(clientProfileId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return this.buildDay(client.id, day, false);
  }

  // ---- Prescribed items ----------------------------------------------------

  async markPlannedEaten(
    actor: AuthenticatedUser,
    date: string,
    planItemId: string,
    now = new Date(),
  ): Promise<JournalDayResponseDto> {
    const day = this.parseEditableDate(date, now);
    const profile = await this.requireOwnClientProfile(actor);
    const { item, mealType } = await this.requirePlanItem(
      profile.id,
      day,
      planItemId,
    );
    const snapshot = roundVector(
      scalePer100(planItemPer100(item), Number(item.quantityGrams)),
    );

    await this.upsertPlanItemEntry(profile.id, day, item.id, {
      mealType,
      status: FoodLogEntryStatus.EATEN,
      foodId: item.sourceFoodId,
      foodNameSnapshot: item.foodNameSnapshot,
      brandSnapshot: item.brandSnapshot,
      grams: Number(item.quantityGrams),
      portionLabel: null,
      portionQuantity: null,
      ...this.macroColumns(snapshot),
      nutrientsSnapshot: snapshot,
      loggedByUserId: actor.id,
    });
    return this.buildDay(profile.id, day, true);
  }

  async skipPlanned(
    actor: AuthenticatedUser,
    date: string,
    planItemId: string,
    now = new Date(),
  ): Promise<JournalDayResponseDto> {
    const day = this.parseEditableDate(date, now);
    const profile = await this.requireOwnClientProfile(actor);
    const { item, mealType } = await this.requirePlanItem(
      profile.id,
      day,
      planItemId,
    );

    await this.upsertPlanItemEntry(profile.id, day, item.id, {
      mealType,
      status: FoodLogEntryStatus.SKIPPED,
      foodId: null,
      foodNameSnapshot: item.foodNameSnapshot,
      brandSnapshot: item.brandSnapshot,
      grams: null,
      portionLabel: null,
      portionQuantity: null,
      caloriesKcal: null,
      proteinG: null,
      carbohydratesG: null,
      fatG: null,
      fiberG: null,
      nutrientsSnapshot: {},
      loggedByUserId: actor.id,
    });
    return this.buildDay(profile.id, day, true);
  }

  /** Undo: the prescribed item goes back to pending. */
  async clearPlanned(
    actor: AuthenticatedUser,
    date: string,
    planItemId: string,
    now = new Date(),
  ): Promise<JournalDayResponseDto> {
    const day = this.parseEditableDate(date, now);
    const profile = await this.requireOwnClientProfile(actor);
    await this.entries.delete({
      clientProfileId: profile.id,
      localDate: day,
      planItemId,
    });
    return this.buildDay(profile.id, day, true);
  }

  // ---- Free entries (and replacements) ------------------------------------

  async addEntry(
    actor: AuthenticatedUser,
    date: string,
    dto: CreateJournalEntryDto,
    now = new Date(),
  ): Promise<JournalEntryDto> {
    const day = this.parseEditableDate(date, now);
    const profile = await this.requireOwnClientProfile(actor);

    let planItem: NutritionPlanMealItem | null = null;
    let mealType = dto.mealType;
    if (dto.planItemId) {
      const resolved = await this.requirePlanItem(
        profile.id,
        day,
        dto.planItemId,
      );
      planItem = resolved.item;
      mealType = resolved.mealType;
    }

    const food = await this.requireLoggableFood(
      actor,
      profile.id,
      dto.foodId,
      planItem,
      day,
    );
    const amount = this.resolveAmount(food, dto);
    const snapshot = roundVector(
      scalePer100(this.foodPer100(food), amount.grams),
    );
    const values = {
      mealType,
      status: FoodLogEntryStatus.EATEN,
      foodId: food.id,
      foodNameSnapshot: food.name,
      brandSnapshot: food.brand,
      grams: amount.grams,
      portionLabel: amount.portionLabel,
      portionQuantity: amount.portionQuantity,
      ...this.macroColumns(snapshot),
      nutrientsSnapshot: snapshot,
      note: dto.note ?? null,
      loggedByUserId: actor.id,
    };

    const saved = planItem
      ? await this.upsertPlanItemEntry(profile.id, day, planItem.id, values)
      : await this.entries.save(
          this.entries.create({
            ...values,
            clientProfileId: profile.id,
            localDate: day,
            planItemId: null,
          }),
        );

    this.logger.log(
      JSON.stringify({
        event: 'nutrition_journal_entry_logged',
        clientProfileId: profile.id,
        entryId: saved.id,
      }),
    );
    return toJournalEntryDto(saved);
  }

  async updateEntry(
    actor: AuthenticatedUser,
    entryId: string,
    dto: UpdateJournalEntryDto,
    now = new Date(),
  ): Promise<JournalEntryDto> {
    const profile = await this.requireOwnClientProfile(actor);
    const entry = await this.requireOwnEntry(profile.id, entryId);
    this.assertEditable(entry.localDate, now);
    if (entry.status !== FoodLogEntryStatus.EATEN || !entry.foodId) {
      throw new ConflictException(
        'Skipped items cannot be edited; log food instead',
      );
    }

    if (this.hasAmount(dto)) {
      const food = await this.foods.findOne({
        where: { id: entry.foodId },
        relations: FOOD_RESPONSE_RELATIONS,
      });
      if (!food) {
        throw new NotFoundException('Food not found');
      }
      const amount = this.resolveAmount(food, dto);
      // Rescale the stored snapshot: history keeps the values it was logged with.
      const factor = amount.grams / Number(entry.grams);
      const snapshot = roundVector(
        Object.fromEntries(
          Object.entries(entry.nutrientsSnapshot ?? {}).map(([code, value]) => [
            code,
            value === null ? null : Number(value) * factor,
          ]),
        ),
      );
      entry.grams = amount.grams;
      entry.portionLabel = amount.portionLabel;
      entry.portionQuantity = amount.portionQuantity;
      entry.nutrientsSnapshot = snapshot;
      Object.assign(entry, this.macroColumns(snapshot));
    }
    if (dto.mealType !== undefined && entry.planItemId === null) {
      entry.mealType = dto.mealType;
    }
    if (dto.note !== undefined) {
      entry.note = dto.note ?? null;
    }
    return toJournalEntryDto(await this.entries.save(entry));
  }

  async deleteEntry(
    actor: AuthenticatedUser,
    entryId: string,
    now = new Date(),
  ): Promise<void> {
    const profile = await this.requireOwnClientProfile(actor);
    const entry = await this.requireOwnEntry(profile.id, entryId);
    this.assertEditable(entry.localDate, now);
    await this.entries.delete({ id: entry.id });
  }

  // ---- Helpers --------------------------------------------------------------

  private async buildDay(
    clientProfileId: string,
    day: string,
    editable: boolean,
  ): Promise<JournalDayResponseDto> {
    const [plan, entries] = await Promise.all([
      this.findApplicablePlan(clientProfileId, day),
      this.entries.find({
        where: { clientProfileId, localDate: day },
        order: { createdAt: 'ASC', id: 'ASC' },
      }),
    ]);
    return buildJournalDay({ date: day, plan, entries, editable });
  }

  /** The Client's ACTIVE plan, if the date falls inside its optional date range. */
  async findApplicablePlan(
    clientProfileId: string,
    day: string,
    manager?: EntityManager,
  ): Promise<NutritionPlan | null> {
    const repository = manager?.getRepository(NutritionPlan) ?? this.plans;
    const plan = await repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.meals', 'meal')
      .leftJoinAndSelect('meal.items', 'item')
      .where('plan.clientProfileId = :clientProfileId', { clientProfileId })
      .andWhere('plan.status = :status', { status: NutritionPlanStatus.ACTIVE })
      .orderBy('meal.position', 'ASC')
      .addOrderBy('item.position', 'ASC')
      .getOne();
    if (!plan) {
      return null;
    }
    const start = toIsoDateString(plan.startDate);
    const end = toIsoDateString(plan.endDate);
    if ((start && day < start) || (end && day > end)) {
      return null;
    }
    return plan;
  }

  private async requirePlanItem(
    clientProfileId: string,
    day: string,
    planItemId: string,
  ): Promise<{ item: NutritionPlanMealItem; mealType: NutritionMealType }> {
    const plan = await this.findApplicablePlan(clientProfileId, day);
    const match = plan
      ? orderedPlanItems(plan).find(({ item }) => item.id === planItemId)
      : undefined;
    if (!match) {
      throw new NotFoundException('Plan item not found for this date');
    }
    return { item: match.item, mealType: match.mealType };
  }

  private async upsertPlanItemEntry(
    clientProfileId: string,
    day: string,
    planItemId: string,
    values: Partial<FoodLogEntry>,
  ): Promise<FoodLogEntry> {
    const existing = await this.entries.findOne({
      where: { clientProfileId, localDate: day, planItemId },
    });
    const entry =
      existing ??
      this.entries.create({ clientProfileId, localDate: day, planItemId });
    Object.assign(entry, { note: null }, values);
    return this.entries.save(entry);
  }

  /**
   * A Client may log: ACTIVE GLOBAL foods, their own PRIVATE foods, and the food
   * of a prescribed item they are resolving (even if it was archived later).
   */
  private async requireLoggableFood(
    actor: AuthenticatedUser,
    clientProfileId: string,
    foodId: string,
    planItem: NutritionPlanMealItem | null,
    day: string,
  ): Promise<NutritionFood> {
    const food = await this.foods.findOne({
      where: { id: foodId },
      relations: FOOD_RESPONSE_RELATIONS,
    });
    if (!food) {
      throw new NotFoundException('Food not found');
    }
    const own = food.createdByUserId === actor.id;
    const globalActive =
      food.visibility === NutritionFoodVisibility.GLOBAL &&
      food.status === NutritionFoodStatus.ACTIVE;
    const prescribed = planItem?.sourceFoodId === food.id;
    if (own || globalActive || prescribed) {
      return food;
    }
    const inPlan = await this.isFoodInApplicablePlan(
      clientProfileId,
      food.id,
      day,
    );
    if (!inPlan) {
      throw new NotFoundException('Food not found');
    }
    return food;
  }

  async isFoodInApplicablePlan(
    clientProfileId: string,
    foodId: string,
    day = utcTodayIsoDate(),
  ): Promise<boolean> {
    const plan = await this.findApplicablePlan(clientProfileId, day);
    return plan
      ? orderedPlanItems(plan).some(({ item }) => item.sourceFoodId === foodId)
      : false;
  }

  private hasAmount(dto: {
    grams?: number;
    portionId?: string;
    portionQuantity?: number;
  }): boolean {
    return (
      dto.grams !== undefined ||
      dto.portionId !== undefined ||
      dto.portionQuantity !== undefined
    );
  }

  /** Exactly one of: grams, or portionId + portionQuantity. Always resolves to grams. */
  resolveAmount(
    food: NutritionFood,
    dto: { grams?: number; portionId?: string; portionQuantity?: number },
  ): ResolvedAmount {
    const byGrams = dto.grams !== undefined;
    const byPortion =
      dto.portionId !== undefined || dto.portionQuantity !== undefined;
    if (byGrams === byPortion) {
      throw new BadRequestException(
        'Send either grams, or portionId with portionQuantity',
      );
    }
    if (byGrams) {
      return {
        grams: roundNutrient(dto.grams!),
        portionLabel: null,
        portionQuantity: null,
      };
    }
    if (dto.portionId === undefined || dto.portionQuantity === undefined) {
      throw new BadRequestException(
        'portionId and portionQuantity go together',
      );
    }
    const portion = (food.portions ?? []).find(
      (item) => item.id === dto.portionId,
    );
    if (!portion) {
      throw new BadRequestException('Portion does not belong to this food');
    }
    return {
      grams: roundNutrient(Number(portion.gramWeight) * dto.portionQuantity),
      portionLabel: portion.label,
      portionQuantity: dto.portionQuantity,
    };
  }

  /** Every catalog nutrient per 100 g; unknown stays null (D3: null is not 0). */
  foodPer100(food: NutritionFood): NutrientVector {
    const vector: NutrientVector = {};
    for (const foodNutrient of food.foodNutrients ?? []) {
      vector[foodNutrient.nutrient.code] =
        foodNutrient.amountPer100g === null ||
        foodNutrient.amountPer100g === undefined
          ? null
          : Number(foodNutrient.amountPer100g);
    }
    if (vector[CORE_CODES.calories] === undefined) {
      // Defensive: core values always exist after N1; fall back to the cache columns.
      vector[CORE_CODES.calories] = Number(food.caloriesPer100g);
      vector[CORE_CODES.protein] = Number(food.proteinGPer100g);
      vector[CORE_CODES.carbohydrates] = Number(food.carbohydratesGPer100g);
      vector[CORE_CODES.fat] = Number(food.fatGPer100g);
      vector[CORE_CODES.fiber] =
        food.fiberGPer100g === null ? null : Number(food.fiberGPer100g);
    }
    return vector;
  }

  private macroColumns(snapshot: NutrientVector) {
    const pick = (code: string) => {
      const value = snapshot[code];
      return value === null || value === undefined
        ? null
        : roundNutrient(value);
    };
    return {
      caloriesKcal: pick(CORE_CODES.calories) ?? 0,
      proteinG: pick(CORE_CODES.protein) ?? 0,
      carbohydratesG: pick(CORE_CODES.carbohydrates) ?? 0,
      fatG: pick(CORE_CODES.fat) ?? 0,
      fiberG: pick(CORE_CODES.fiber),
    };
  }

  private async requireOwnEntry(
    clientProfileId: string,
    entryId: string,
  ): Promise<FoodLogEntry> {
    const entry = await this.entries.findOne({ where: { id: entryId } });
    if (!entry || entry.clientProfileId !== clientProfileId) {
      throw new NotFoundException('Journal entry not found');
    }
    return entry;
  }

  async requireOwnClientProfile(
    actor: AuthenticatedUser,
  ): Promise<ClientProfile> {
    if (actor.role !== UserRole.CLIENT) {
      throw new ForbiddenException();
    }
    const profile = await this.clients.findByUserIdWithUser(actor.id);
    if (!profile) {
      this.logger.error(
        JSON.stringify({ event: 'client_profile_missing', userId: actor.id }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private parseDate(value: string): string {
    if (!parseStrictIsoDate(value)) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }
    return value;
  }

  private isEditable(day: string, now: Date): boolean {
    const today = utcTodayIsoDate(now);
    return (
      day >= addDays(today, -JOURNAL_EDITABLE_PAST_DAYS) &&
      day <= addDays(today, JOURNAL_EDITABLE_FUTURE_DAYS)
    );
  }

  private assertEditable(day: string, now: Date): void {
    if (!this.isEditable(toIsoDateString(day) ?? day, now)) {
      throw new ConflictException('This day can no longer be edited');
    }
  }

  private parseEditableDate(value: string, now: Date): string {
    const day = this.parseDate(value);
    this.assertEditable(day, now);
    return day;
  }
}
