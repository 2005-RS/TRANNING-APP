import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { Nutrient } from '../nutrition-nutrients/entities/nutrient.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateNutritionFoodDto } from './dto/create-nutrition-food.dto';
import { ListNutritionFoodsQueryDto } from './dto/list-nutrition-foods-query.dto';
import {
  NutritionFoodResponseDto,
  PaginatedNutritionFoodsResponseDto,
} from './dto/nutrition-food-response.dto';
import { FoodPortionInputDto } from './dto/food-portion-input.dto';
import { NutritionFoodNutrientInputDto } from './dto/nutrition-food-nutrient-input.dto';
import { UpdateNutritionFoodDto } from './dto/update-nutrition-food.dto';
import { FoodNutrient } from './entities/food-nutrient.entity';
import { FoodPortion } from './entities/food-portion.entity';
import { NutritionFood } from './entities/nutrition-food.entity';
import { FoodNutrientDerivation } from './enums/food-nutrient-derivation.enum';
import { NutritionFoodNameOrigin } from './enums/nutrition-food-name-origin.enum';
import { NutritionFoodSource } from './enums/nutrition-food-source.enum';
import {
  NutritionFoodSortField,
  SortDirection,
} from './enums/nutrition-food-sort-field.enum';
import { NutritionFoodStatus } from './enums/nutrition-food-status.enum';
import { NutritionFoodVisibility } from './enums/nutrition-food-visibility.enum';
import {
  normalizeFoodName,
  optionalPlainText,
} from './nutrition-food-text.util';
import { toNutritionFoodResponse } from './nutrition-foods.mapper';
import { NUTRITION_FOOD_NUTRIENT_AMOUNT_MAX_BY_UNIT } from './nutrition-foods.constants';

/** Relations every food response needs. */
export const FOOD_RESPONSE_RELATIONS = {
  foodNutrients: { nutrient: true },
  portions: true,
} as const;

/** A food normalized from an external source (USDA FDC, Open Food Facts). */
export interface ExternalFoodInput {
  source: NutritionFoodSource;
  externalId: string;
  name: string;
  nameOriginal: string;
  brand: string | null;
  sourceDataType?: string | null;
  nutrients: Array<{
    code: string;
    amountPer100g: number | null;
    derivation: FoodNutrientDerivation;
    sourceRef: string;
  }>;
  portions: Array<{ label: string; gramWeight: number }>;
}

export interface CreateFoodOptions {
  /** PRIVATE foods are visible only to their creator (a Client's own foods). */
  visibility?: NutritionFoodVisibility;
}

const SORT_COLUMNS: Record<NutritionFoodSortField, string> = {
  [NutritionFoodSortField.Name]: 'food.name',
  [NutritionFoodSortField.CreatedAt]: 'food.createdAt',
  [NutritionFoodSortField.UpdatedAt]: 'food.updatedAt',
};

@Injectable()
export class NutritionFoodsService {
  private readonly logger = new Logger(NutritionFoodsService.name);

  constructor(
    @InjectRepository(NutritionFood)
    private readonly foods: Repository<NutritionFood>,
  ) {}

  async create(
    dto: CreateNutritionFoodDto,
    actor: AuthenticatedUser,
    options: CreateFoodOptions = {},
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.manager.transaction(async (manager) => {
      const saved = await manager.getRepository(NutritionFood).save(
        manager.getRepository(NutritionFood).create({
          name: normalizeFoodName(dto.name),
          brand: optionalPlainText(dto.brand),
          description: optionalPlainText(dto.description),
          caloriesPer100g: dto.caloriesPer100g,
          proteinGPer100g: dto.proteinGPer100g,
          carbohydratesGPer100g: dto.carbohydratesGPer100g,
          fatGPer100g: dto.fatGPer100g,
          fiberGPer100g:
            dto.fiberGPer100g === undefined ? null : dto.fiberGPer100g,
          status: NutritionFoodStatus.ACTIVE,
          source: NutritionFoodSource.MANUAL,
          nameOrigin: NutritionFoodNameOrigin.MANUAL,
          visibility: options.visibility ?? NutritionFoodVisibility.GLOBAL,
          createdByUserId: actor.id,
        }),
      );

      await this.syncCoreNutrients(saved, actor.id, manager);
      if (dto.nutrients !== undefined) {
        await this.replaceNonCoreNutrients(
          saved.id,
          dto.nutrients,
          actor.id,
          manager,
        );
      }
      if (dto.portions !== undefined) {
        await this.replacePortions(saved.id, dto.portions, manager);
      }

      const responseFood = await this.requireFoodWithNutrients(
        saved.id,
        manager,
      );

      this.logger.log(
        JSON.stringify({
          event: 'nutrition_food_created',
          nutritionFoodId: saved.id,
          createdByUserId: actor.id,
        }),
      );

      return toNutritionFoodResponse(responseFood);
    });
  }

  async list(
    query: ListNutritionFoodsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedNutritionFoodsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? NutritionFoodSortField.CreatedAt;
    const sortColumn = SORT_COLUMNS[sort];
    const direction =
      (query.direction ?? SortDirection.Desc) === SortDirection.Asc
        ? 'ASC'
        : 'DESC';
    const status = query.status ?? NutritionFoodStatus.ACTIVE;

    const qb = this.foods
      .createQueryBuilder('food')
      .leftJoinAndSelect('food.foodNutrients', 'foodNutrient')
      .leftJoinAndSelect('foodNutrient.nutrient', 'nutrient')
      .leftJoinAndSelect('food.portions', 'portion')
      .where('food.status = :status', { status })
      // PRIVATE foods (e.g. a Client's own foods) never appear in the professional catalog.
      .andWhere(
        '(food.visibility = :globalVisibility OR food.createdByUserId = :actorId)',
        { globalVisibility: NutritionFoodVisibility.GLOBAL, actorId: actor.id },
      );

    if (
      status === NutritionFoodStatus.ARCHIVED &&
      actor.role === UserRole.TRAINER
    ) {
      qb.andWhere('food.createdByUserId = :createdByUserId', {
        createdByUserId: actor.id,
      });
    }

    if (query.search?.trim()) {
      const search = `%${this.escapeIlike(query.search.trim())}%`;
      qb.andWhere(
        `(food.name ILIKE :search ESCAPE '\\' OR food.brand ILIKE :search ESCAPE '\\')`,
        { search },
      );
    }

    qb.orderBy(sortColumn, direction)
      .addOrderBy('food.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, totalItems] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => toNutritionFoodResponse(row)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
      },
    };
  }

  async getById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return toNutritionFoodResponse(await this.requireReadable(id, actor));
  }

  async update(
    id: string,
    dto: UpdateNutritionFoodDto,
    actor: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.manager.transaction(async (manager) => {
      const food = await this.requireWritable(id, actor, manager);

      if (dto.name !== undefined) {
        food.name = normalizeFoodName(dto.name);
      }
      if (dto.brand !== undefined) {
        food.brand = optionalPlainText(dto.brand);
      }
      if (dto.description !== undefined) {
        food.description = optionalPlainText(dto.description);
      }
      if (dto.caloriesPer100g !== undefined) {
        food.caloriesPer100g = dto.caloriesPer100g;
      }
      if (dto.proteinGPer100g !== undefined) {
        food.proteinGPer100g = dto.proteinGPer100g;
      }
      if (dto.carbohydratesGPer100g !== undefined) {
        food.carbohydratesGPer100g = dto.carbohydratesGPer100g;
      }
      if (dto.fatGPer100g !== undefined) {
        food.fatGPer100g = dto.fatGPer100g;
      }
      if (dto.fiberGPer100g !== undefined) {
        food.fiberGPer100g = dto.fiberGPer100g;
      }

      await manager.getRepository(NutritionFood).save(food);
      await this.syncCoreNutrients(food, actor.id, manager);
      if (dto.nutrients !== undefined) {
        await this.replaceNonCoreNutrients(
          food.id,
          dto.nutrients,
          actor.id,
          manager,
        );
      }
      if (dto.portions !== undefined) {
        await this.replacePortions(food.id, dto.portions, manager);
      }

      return toNutritionFoodResponse(
        await this.requireFoodWithNutrients(food.id, manager),
      );
    });
  }

  async updateStatus(
    id: string,
    status: NutritionFoodStatus,
    actor: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    const food = await this.requireWritable(id, actor);
    const previous = food.status;
    food.status = status;
    const saved = await this.foods.save(food);

    if (previous !== status) {
      this.logger.log(
        JSON.stringify({
          event:
            status === NutritionFoodStatus.ARCHIVED
              ? 'nutrition_food_archived'
              : 'nutrition_food_reactivated',
          nutritionFoodId: saved.id,
        }),
      );
    }

    return toNutritionFoodResponse(saved);
  }

  async findByExternalId(
    source: NutritionFoodSource,
    externalId: string,
  ): Promise<NutritionFood | null> {
    return this.foods.findOne({
      where: { source, externalId },
      relations: FOOD_RESPONSE_RELATIONS,
    });
  }

  /**
   * Imports an external food once. Idempotent on (source, externalId): an
   * existing row is returned untouched, so plans and journals keep their data.
   * Values are stored with their source reference (D3/D4); nothing is invented.
   */
  async importExternalFood(
    input: ExternalFoodInput,
    actor: AuthenticatedUser,
  ): Promise<NutritionFood> {
    const existing = await this.findByExternalId(
      input.source,
      input.externalId,
    );
    if (existing) {
      return existing;
    }
    const core = new Map(
      input.nutrients.map((nutrient) => [
        nutrient.code,
        nutrient.amountPer100g,
      ]),
    );
    const requireCore = (code: string): number => {
      const value = core.get(code);
      if (value === null || value === undefined) {
        throw new BadRequestException(
          'External food lacks core nutrition data',
        );
      }
      return value;
    };

    try {
      const id = await this.foods.manager.transaction(async (manager) => {
        const saved = await manager.getRepository(NutritionFood).save(
          manager.getRepository(NutritionFood).create({
            name: input.name,
            brand: input.brand,
            description: null,
            source: input.source,
            externalId: input.externalId,
            sourceDataType: input.sourceDataType ?? null,
            importedAt: new Date(),
            importedByUserId: actor.id,
            nameOriginal: input.nameOriginal,
            nameOrigin: NutritionFoodNameOrigin.SOURCE,
            caloriesPer100g: requireCore('energy_kcal'),
            proteinGPer100g: requireCore('protein_g'),
            carbohydratesGPer100g: requireCore('carbohydrates_g'),
            fatGPer100g: requireCore('fat_g'),
            fiberGPer100g: core.get('fiber_g') ?? null,
            status: NutritionFoodStatus.ACTIVE,
            visibility: NutritionFoodVisibility.GLOBAL,
            createdByUserId: actor.id,
          }),
        );

        const catalog = await manager.getRepository(Nutrient).find();
        const byCode = new Map(
          catalog.map((nutrient) => [nutrient.code, nutrient]),
        );
        const rows = input.nutrients
          .filter((nutrient) => byCode.has(nutrient.code))
          .map((nutrient) => ({
            foodId: saved.id,
            nutrientId: byCode.get(nutrient.code)!.id,
            amountPer100g: nutrient.amountPer100g,
            derivation: nutrient.derivation,
            source: input.source,
            sourceNutrientRef: nutrient.sourceRef,
            updatedByUserId: null,
          }));
        await manager.getRepository(FoodNutrient).save(rows);

        const portionRepository = manager.getRepository(FoodPortion);
        await portionRepository.save(
          input.portions.map((portion, index) =>
            portionRepository.create({
              foodId: saved.id,
              label: portion.label,
              gramWeight: portion.gramWeight,
              isDefault: index === 0,
              position: index,
              source: input.source,
            }),
          ),
        );
        return saved.id;
      });

      this.logger.log(
        JSON.stringify({
          event: 'nutrition_food_imported',
          nutritionFoodId: id,
          source: input.source,
        }),
      );
      return (await this.findByExternalId(input.source, input.externalId))!;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        // Another request imported the same product first.
        const winner = await this.findByExternalId(
          input.source,
          input.externalId,
        );
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  /**
   * Snapshot capability for NutritionPlan meal replacement and activation.
   * Uses the caller's EntityManager when provided so catalog checks share
   * the same transaction as plan writes.
   */
  async requireActiveFood(
    id: string,
    manager?: EntityManager,
  ): Promise<NutritionFood> {
    const [food] = await this.requireActiveFoodsByIds([id], manager);
    return food;
  }

  async requireActiveFoodsByIds(
    ids: string[],
    manager?: EntityManager,
  ): Promise<NutritionFood[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const found = await this.foodRepository(manager).find({
      where: { id: In(uniqueIds) },
    });
    const byId = new Map(found.map((food) => [food.id, food]));

    return uniqueIds.map((id) => {
      const food = byId.get(id);
      if (!food) {
        throw new NotFoundException('Food not found');
      }
      this.assertActive(food);
      return food;
    });
  }

  private foodRepository(manager?: EntityManager): Repository<NutritionFood> {
    return manager?.getRepository(NutritionFood) ?? this.foods;
  }

  private assertActive(food: NutritionFood): void {
    if (food.status !== NutritionFoodStatus.ACTIVE) {
      throw new ConflictException('Food is archived');
    }
  }

  private async requireReadable(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<NutritionFood> {
    const food = await this.foodRepository().findOne({
      where: { id },
      relations: FOOD_RESPONSE_RELATIONS,
    });
    if (!food) {
      throw new NotFoundException('Food not found');
    }
    if (!this.isVisibleTo(food, actor)) {
      throw new NotFoundException('Food not found');
    }
    if (
      food.status === NutritionFoodStatus.ARCHIVED &&
      actor.role !== UserRole.ADMIN &&
      food.createdByUserId !== actor.id
    ) {
      throw new NotFoundException('Food not found');
    }
    return food;
  }

  private async requireWritable(
    id: string,
    actor: AuthenticatedUser,
    manager?: EntityManager,
  ): Promise<NutritionFood> {
    const food = await this.foodRepository(manager).findOne({
      where: { id },
      relations: FOOD_RESPONSE_RELATIONS,
    });
    if (!food) {
      throw new NotFoundException('Food not found');
    }
    if (!this.isVisibleTo(food, actor)) {
      throw new NotFoundException('Food not found');
    }
    if (actor.role !== UserRole.ADMIN && food.createdByUserId !== actor.id) {
      throw new NotFoundException('Food not found');
    }
    return food;
  }

  /** PRIVATE foods belong to their creator only; ADMIN gets no implicit access (D5). */
  isVisibleTo(food: NutritionFood, actor: AuthenticatedUser): boolean {
    return (
      food.visibility === NutritionFoodVisibility.GLOBAL ||
      food.createdByUserId === actor.id
    );
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  private async requireFoodWithNutrients(
    id: string,
    manager?: EntityManager,
  ): Promise<NutritionFood> {
    const food = await this.foodRepository(manager).findOne({
      where: { id },
      relations: FOOD_RESPONSE_RELATIONS,
    });
    if (!food) {
      throw new NotFoundException('Food not found');
    }
    return food;
  }

  private async syncCoreNutrients(
    food: NutritionFood,
    actorId: string,
    manager: EntityManager,
  ): Promise<void> {
    const coreNutrients = await manager.getRepository(Nutrient).find({
      where: { isCore: true },
    });
    const amountByCode: Record<string, number | null> = {
      energy_kcal: food.caloriesPer100g,
      protein_g: food.proteinGPer100g,
      carbohydrates_g: food.carbohydratesGPer100g,
      fat_g: food.fatGPer100g,
      fiber_g: food.fiberGPer100g,
    };

    if (coreNutrients.length !== Object.keys(amountByCode).length) {
      throw new InternalServerErrorException(
        'Nutrient catalog core values are incomplete',
      );
    }

    await manager.getRepository(FoodNutrient).save(
      coreNutrients.map((nutrient) => ({
        foodId: food.id,
        nutrientId: nutrient.id,
        amountPer100g: amountByCode[nutrient.code],
        derivation: FoodNutrientDerivation.MEASURED,
        source: NutritionFoodSource.MANUAL,
        sourceNutrientRef: null,
        updatedByUserId: actorId,
      })),
    );
  }

  private async replaceNonCoreNutrients(
    foodId: string,
    inputs: NutritionFoodNutrientInputDto[],
    actorId: string,
    manager: EntityManager,
  ): Promise<void> {
    const nutrients = await this.resolveNonCoreNutrients(inputs, manager);
    const allNonCore = await manager.getRepository(Nutrient).find({
      where: { isCore: false },
      select: { id: true },
    });

    if (allNonCore.length > 0) {
      await manager.getRepository(FoodNutrient).delete({
        foodId,
        nutrientId: In(allNonCore.map((nutrient) => nutrient.id)),
      });
    }

    await manager.getRepository(FoodNutrient).save(
      inputs.map((input) => {
        const nutrient = nutrients.get(input.code)!;
        return {
          foodId,
          nutrientId: nutrient.id,
          amountPer100g: input.amountPer100g,
          derivation: FoodNutrientDerivation.MEASURED,
          source: NutritionFoodSource.MANUAL,
          sourceNutrientRef: null,
          updatedByUserId: actorId,
        };
      }),
    );
  }

  /** Replaces the food's household measures. The first portion is the default unless one is flagged. */
  async replacePortions(
    foodId: string,
    inputs: FoodPortionInputDto[],
    manager: EntityManager,
  ): Promise<void> {
    const labels = inputs.map((input) =>
      input.label.trim().toLocaleLowerCase(),
    );
    if (new Set(labels).size !== labels.length) {
      throw new BadRequestException('Portion labels must be unique');
    }
    const flaggedDefaults = inputs.filter((input) => input.isDefault === true);
    if (flaggedDefaults.length > 1) {
      throw new BadRequestException('Only one portion can be the default');
    }

    const repository = manager.getRepository(FoodPortion);
    await repository.delete({ foodId });
    if (inputs.length === 0) {
      return;
    }
    const defaultIndex = Math.max(
      0,
      inputs.findIndex((input) => input.isDefault === true),
    );
    await repository.save(
      inputs.map((input, index) =>
        repository.create({
          foodId,
          label: input.label.trim(),
          gramWeight: input.gramWeight,
          isDefault: index === defaultIndex,
          position: index,
          source: NutritionFoodSource.MANUAL,
        }),
      ),
    );
  }

  private async resolveNonCoreNutrients(
    inputs: NutritionFoodNutrientInputDto[],
    manager: EntityManager,
  ): Promise<Map<string, Nutrient>> {
    const codes = inputs.map((input) => input.code);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException('Nutrient codes must be unique');
    }
    if (codes.length === 0) {
      return new Map();
    }

    const nutrients = await manager.getRepository(Nutrient).find({
      where: { code: In(codes) },
    });
    if (
      nutrients.length !== codes.length ||
      nutrients.some((nutrient) => nutrient.isCore)
    ) {
      throw new BadRequestException(
        'Only known non-core nutrient codes are allowed',
      );
    }

    const byCode = new Map(
      nutrients.map((nutrient) => [nutrient.code, nutrient]),
    );
    for (const input of inputs) {
      if (
        input.amountPer100g !== null &&
        input.amountPer100g >
          NUTRITION_FOOD_NUTRIENT_AMOUNT_MAX_BY_UNIT[
            byCode.get(input.code)!.unit
          ]
      ) {
        throw new BadRequestException(
          `Nutrient amount exceeds the maximum for ${input.code}`,
        );
      }
    }
    return byCode;
  }
}
