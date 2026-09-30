import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutrientCategory } from '../enums/nutrient-category.enum';
import { NutrientUnit } from '../enums/nutrient-unit.enum';

export class NutrientResponseDto {
  @ApiProperty({ example: 'protein_g' })
  code!: string;

  @ApiProperty({ example: 'Protein' })
  nameEn!: string;

  @ApiProperty({ example: 'Proteína' })
  nameEs!: string;

  @ApiProperty({ enum: NutrientUnit })
  unit!: NutrientUnit;

  @ApiProperty({ enum: NutrientCategory })
  category!: NutrientCategory;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fdcNutrientId!: number | null;

  @ApiProperty({ example: 2 })
  displayOrder!: number;

  @ApiProperty()
  isCore!: boolean;
}
