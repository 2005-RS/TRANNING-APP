import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NutrientCategory } from '../enums/nutrient-category.enum';
import { NutrientUnit } from '../enums/nutrient-unit.enum';

@Entity({ name: 'nutrients' })
export class Nutrient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('UQ_nutrients_code', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100 })
  nameEn!: string;

  @Column({ name: 'name_es', type: 'varchar', length: 100 })
  nameEs!: string;

  @Column({ type: 'enum', enum: NutrientUnit, enumName: 'nutrient_unit' })
  unit!: NutrientUnit;

  @Column({
    type: 'enum',
    enum: NutrientCategory,
    enumName: 'nutrient_category',
  })
  category!: NutrientCategory;

  @Index('UQ_nutrients_fdc_nutrient_id', { unique: true })
  @Column({ name: 'fdc_nutrient_id', type: 'int', nullable: true })
  fdcNutrientId!: number | null;

  @Column({ name: 'display_order', type: 'int' })
  displayOrder!: number;

  @Column({ name: 'is_core', type: 'boolean' })
  isCore!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
