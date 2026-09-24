import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateNutritionFoodDto } from './dto/create-nutrition-food.dto';
import { ListNutritionFoodsQueryDto } from './dto/list-nutrition-foods-query.dto';
import {
  NutritionFoodResponseDto,
  PaginatedNutritionFoodsResponseDto,
} from './dto/nutrition-food-response.dto';
import { UpdateNutritionFoodDto } from './dto/update-nutrition-food.dto';
import { NutritionFood } from './entities/nutrition-food.entity';
import {
  NutritionFoodSortField,
  SortDirection,
} from './enums/nutrition-food-sort-field.enum';
import { NutritionFoodStatus } from './enums/nutrition-food-status.enum';
import {
  normalizeFoodName,
  optionalPlainText,
} from './nutrition-food-text.util';
import { toNutritionFoodResponse } from './nutrition-foods.mapper';

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
  ): Promise<NutritionFoodResponseDto> {
    const saved = await this.foods.save(
      this.foods.create({
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
        createdByUserId: actor.id,
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'nutrition_food_created',
        nutritionFoodId: saved.id,
        createdByUserId: actor.id,
      }),
    );

    return toNutritionFoodResponse(saved);
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
      .where('food.status = :status', { status });

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
    const food = await this.requireWritable(id, actor);

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

    return toNutritionFoodResponse(await this.foods.save(food));
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
    const food = await this.foods.findOne({ where: { id } });
    if (!food) {
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
  ): Promise<NutritionFood> {
    const food = await this.foods.findOne({ where: { id } });
    if (!food) {
      throw new NotFoundException('Food not found');
    }
    if (actor.role !== UserRole.ADMIN && food.createdByUserId !== actor.id) {
      throw new NotFoundException('Food not found');
    }
    return food;
  }

  private escapeIlike(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
}
