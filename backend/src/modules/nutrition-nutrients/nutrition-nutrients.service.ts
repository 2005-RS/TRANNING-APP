import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NutrientResponseDto } from './dto/nutrient-response.dto';
import { Nutrient } from './entities/nutrient.entity';

@Injectable()
export class NutritionNutrientsService {
  constructor(
    @InjectRepository(Nutrient)
    private readonly nutrients: Repository<Nutrient>,
  ) {}

  async list(): Promise<NutrientResponseDto[]> {
    const nutrients = await this.nutrients.find({
      order: { displayOrder: 'ASC', code: 'ASC' },
    });

    return nutrients.map((nutrient) => ({
      code: nutrient.code,
      nameEn: nutrient.nameEn,
      nameEs: nutrient.nameEs,
      unit: nutrient.unit,
      category: nutrient.category,
      fdcNutrientId: nutrient.fdcNutrientId,
      displayOrder: nutrient.displayOrder,
      isCore: nutrient.isCore,
    }));
  }
}
