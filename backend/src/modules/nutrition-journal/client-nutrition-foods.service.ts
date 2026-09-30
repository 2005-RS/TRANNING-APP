import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { utcTodayIsoDate } from '../clients/iso-date.util';
import { roundNutrient } from '../nutrition-engine';
import { NutritionFoodResponseDto } from '../nutrition-foods/dto/nutrition-food-response.dto';
import { NutritionFood } from '../nutrition-foods/entities/nutrition-food.entity';
import { NutritionFoodSource } from '../nutrition-foods/enums/nutrition-food-source.enum';
import { NutritionFoodStatus } from '../nutrition-foods/enums/nutrition-food-status.enum';
import { NutritionFoodVisibility } from '../nutrition-foods/enums/nutrition-food-visibility.enum';
import { toNutritionFoodResponse } from '../nutrition-foods/nutrition-foods.mapper';
import {
  NUTRITION_FOOD_CALORIES_MAX,
  NUTRITION_FOOD_MACRO_MAX,
} from '../nutrition-foods/nutrition-foods.constants';
import {
  FOOD_RESPONSE_RELATIONS,
  NutritionFoodsService,
} from '../nutrition-foods/nutrition-foods.service';
import {
  ClientFoodScope,
  ClientFoodSummaryDto,
  CreateClientFoodDto,
  ListClientFoodsQueryDto,
  PaginatedClientFoodsResponseDto,
} from './dto/client-foods.dto';
import { FoodLogEntry } from './entities/food-log-entry.entity';
import { orderedPlanItems } from './journal-day.builder';
import {
  BARCODE_PATTERN,
  CLIENT_FOOD_LIST_DEFAULT_LIMIT,
  CLIENT_FOOD_RECENT_WINDOW,
} from './nutrition-journal.constants';
import { NutritionJournalService } from './nutrition-journal.service';
import { normalizeOpenFoodFactsProduct } from './open-food-facts/normalize-open-food-facts';
import { OpenFoodFactsClient } from './open-food-facts/open-food-facts.client';

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

@Injectable()
export class ClientNutritionFoodsService {
  constructor(
    @InjectRepository(NutritionFood)
    private readonly foods: Repository<NutritionFood>,
    @InjectRepository(FoodLogEntry)
    private readonly entries: Repository<FoodLogEntry>,
    private readonly catalog: NutritionFoodsService,
    private readonly journal: NutritionJournalService,
    private readonly openFoodFacts: OpenFoodFactsClient,
  ) {}

  async search(
    actor: AuthenticatedUser,
    query: ListClientFoodsQueryDto,
  ): Promise<PaginatedClientFoodsResponseDto> {
    const profile = await this.journal.requireOwnClientProfile(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? CLIENT_FOOD_LIST_DEFAULT_LIMIT;
    const scope = query.scope ?? ClientFoodScope.ALL;
    const planFoodIds = await this.planFoodIds(profile.id);

    const qb = this.foods
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.portions', 'portion');

    let orderedIds: string[] | null = null;
    if (scope === ClientFoodScope.PLAN) {
      if (planFoodIds.size === 0) return this.emptyPage(page, limit);
      qb.where('food.id IN (:...ids)', { ids: [...planFoodIds] });
    } else if (scope === ClientFoodScope.RECENT) {
      orderedIds = await this.recentFoodIds(profile.id);
      if (orderedIds.length === 0) return this.emptyPage(page, limit);
      qb.where('food.id IN (:...ids)', { ids: orderedIds }).andWhere(
        this.visibleToClient(actor.id, planFoodIds),
      );
    } else {
      qb.where('food.status = :active', {
        active: NutritionFoodStatus.ACTIVE,
      }).andWhere(
        new Brackets((where) => {
          where
            .where('food.visibility = :global', {
              global: NutritionFoodVisibility.GLOBAL,
            })
            .orWhere('food.createdByUserId = :actorId', { actorId: actor.id });
        }),
      );
    }

    if (query.search) {
      const search = `%${escapeIlike(query.search)}%`;
      qb.andWhere(
        `(food.name ILIKE :search ESCAPE '\\' OR food.brand ILIKE :search ESCAPE '\\' OR food.nameOriginal ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    let rows: NutritionFood[];
    let totalItems: number;
    if (orderedIds) {
      // Recent: keep recency order, paginate in memory over a small window.
      const all = await qb.getMany();
      const rank = new Map(orderedIds.map((id, index) => [id, index]));
      all.sort(
        (left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0),
      );
      totalItems = all.length;
      rows = all.slice((page - 1) * limit, page * limit);
    } else {
      qb.orderBy('food.name', 'ASC')
        .addOrderBy('food.id', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);
      [rows, totalItems] = await qb.getManyAndCount();
    }

    return {
      data: rows.map((food) => this.toSummary(food, actor.id, planFoodIds)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getFood(
    actor: AuthenticatedUser,
    foodId: string,
  ): Promise<NutritionFoodResponseDto> {
    const profile = await this.journal.requireOwnClientProfile(actor);
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
    if (!own && !globalActive) {
      const inPlan = await this.journal.isFoodInApplicablePlan(
        profile.id,
        food.id,
      );
      if (!inPlan) {
        throw new NotFoundException('Food not found');
      }
    }
    return toNutritionFoodResponse(food);
  }

  /** U2: a Client's own food is PRIVATE and never enters the GLOBAL catalog. */
  async createOwnFood(
    actor: AuthenticatedUser,
    dto: CreateClientFoodDto,
  ): Promise<NutritionFoodResponseDto> {
    await this.journal.requireOwnClientProfile(actor);
    const factor = 100 / dto.portionGrams;
    const per100 = (value: number) => roundNutrient(value * factor);
    const values = {
      caloriesPer100g: per100(dto.caloriesKcal),
      proteinGPer100g: per100(dto.proteinG),
      carbohydratesGPer100g: per100(dto.carbohydratesG),
      fatGPer100g: per100(dto.fatG),
      fiberGPer100g:
        dto.fiberG === undefined || dto.fiberG === null
          ? null
          : per100(dto.fiberG),
    };
    const macros = [
      values.proteinGPer100g,
      values.carbohydratesGPer100g,
      values.fatGPer100g,
      values.fiberGPer100g ?? 0,
    ];
    if (
      values.caloriesPer100g > NUTRITION_FOOD_CALORIES_MAX ||
      macros.some((value) => value > NUTRITION_FOOD_MACRO_MAX)
    ) {
      throw new BadRequestException(
        'Nutrition values are too large for the portion size',
      );
    }

    return this.catalog.create(
      {
        name: dto.name,
        brand: dto.brand ?? null,
        ...values,
        portions: [
          {
            label: dto.portionLabel ?? `${roundNutrient(dto.portionGrams)} g`,
            gramWeight: dto.portionGrams,
            isDefault: true,
          },
        ],
      },
      actor,
      { visibility: NutritionFoodVisibility.PRIVATE },
    );
  }

  /** Local first; otherwise Open Food Facts, imported once and reused (D4, N8). */
  async findByBarcode(
    actor: AuthenticatedUser,
    barcode: string,
  ): Promise<NutritionFoodResponseDto> {
    await this.journal.requireOwnClientProfile(actor);
    if (!BARCODE_PATTERN.test(barcode)) {
      throw new BadRequestException('Barcode must be 8 to 14 digits');
    }
    const existing = await this.catalog.findByExternalId(
      NutritionFoodSource.OPEN_FOOD_FACTS,
      barcode,
    );
    if (existing) {
      if (existing.status !== NutritionFoodStatus.ACTIVE) {
        throw new NotFoundException('Product not found');
      }
      return toNutritionFoodResponse(existing);
    }

    const lookup = await this.openFoodFacts.lookupBarcode(barcode);
    if (lookup.status === 'unavailable') {
      throw new ServiceUnavailableException(
        'Product lookup is unavailable right now',
      );
    }
    if (lookup.status === 'not_found') {
      throw new NotFoundException('Product not found');
    }
    const normalized = normalizeOpenFoodFactsProduct(barcode, lookup.product);
    if (!normalized) {
      throw new UnprocessableEntityException(
        'This product has no usable nutrition information',
      );
    }
    const food = await this.catalog.importExternalFood(
      {
        source: NutritionFoodSource.OPEN_FOOD_FACTS,
        sourceDataType: 'product',
        ...normalized,
      },
      actor,
    );
    return toNutritionFoodResponse(food);
  }

  // ---- helpers ---------------------------------------------------------------

  private async planFoodIds(clientProfileId: string): Promise<Set<string>> {
    const plan = await this.journal.findApplicablePlan(
      clientProfileId,
      utcTodayIsoDate(),
    );
    return new Set(
      plan ? orderedPlanItems(plan).map(({ item }) => item.sourceFoodId) : [],
    );
  }

  private async recentFoodIds(clientProfileId: string): Promise<string[]> {
    const rows = await this.entries
      .createQueryBuilder('entry')
      .select('entry.foodId', 'foodId')
      .addSelect('MAX(entry.createdAt)', 'lastUsed')
      .where('entry.clientProfileId = :clientProfileId', { clientProfileId })
      .andWhere('entry.foodId IS NOT NULL')
      .groupBy('entry.foodId')
      .orderBy('"lastUsed"', 'DESC')
      .limit(CLIENT_FOOD_RECENT_WINDOW)
      .getRawMany<{ foodId: string }>();
    return rows.map((row) => row.foodId);
  }

  private visibleToClient(actorId: string, planFoodIds: Set<string>): Brackets {
    return new Brackets((where) => {
      where
        .where('(food.visibility = :global AND food.status = :active)', {
          global: NutritionFoodVisibility.GLOBAL,
          active: NutritionFoodStatus.ACTIVE,
        })
        .orWhere('food.createdByUserId = :actorId', { actorId });
      if (planFoodIds.size > 0) {
        where.orWhere('food.id IN (:...planIds)', {
          planIds: [...planFoodIds],
        });
      }
    });
  }

  private toSummary(
    food: NutritionFood,
    actorId: string,
    planFoodIds: Set<string>,
  ): ClientFoodSummaryDto {
    const portions = [...(food.portions ?? [])].sort(
      (left, right) => left.position - right.position,
    );
    const portion =
      portions.find((item) => item.isDefault) ?? portions[0] ?? null;
    const calories = Number(food.caloriesPer100g);
    return {
      id: food.id,
      name: food.name,
      brand: food.brand,
      source: food.source,
      visibility: food.visibility,
      // Imported (e.g. barcode) foods are shared even when this Client imported them.
      isOwn:
        food.visibility === NutritionFoodVisibility.PRIVATE &&
        food.createdByUserId === actorId,
      inPlan: planFoodIds.has(food.id),
      nutritionPer100g: {
        caloriesKcal: calories,
        proteinG: Number(food.proteinGPer100g),
        carbohydratesG: Number(food.carbohydratesGPer100g),
        fatG: Number(food.fatGPer100g),
        fiberG: food.fiberGPer100g === null ? null : Number(food.fiberGPer100g),
      },
      defaultPortion: portion
        ? {
            id: portion.id,
            label: portion.label,
            gramWeight: Number(portion.gramWeight),
            caloriesKcal: roundNutrient(
              (calories * Number(portion.gramWeight)) / 100,
            ),
          }
        : null,
    };
  }

  private emptyPage(
    page: number,
    limit: number,
  ): PaginatedClientFoodsResponseDto {
    return { data: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
  }
}
