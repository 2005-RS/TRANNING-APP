import { BodyMeasurementResponseDto } from './dto/body-measurement-response.dto';
import { BodyMeasurement } from './entities/body-measurement.entity';
import { toNullableNumber } from './body-measurements.metrics';

export function toBodyMeasurementResponse(
  row: BodyMeasurement,
): BodyMeasurementResponseDto {
  return {
    id: row.id,
    measuredAt: row.measuredAt,
    bodyWeightKg: toNullableNumber(row.bodyWeightKg),
    bodyFatPercentage: toNullableNumber(row.bodyFatPercentage),
    neckCm: toNullableNumber(row.neckCm),
    shouldersCm: toNullableNumber(row.shouldersCm),
    chestCm: toNullableNumber(row.chestCm),
    waistCm: toNullableNumber(row.waistCm),
    hipsCm: toNullableNumber(row.hipsCm),
    leftArmCm: toNullableNumber(row.leftArmCm),
    rightArmCm: toNullableNumber(row.rightArmCm),
    leftThighCm: toNullableNumber(row.leftThighCm),
    rightThighCm: toNullableNumber(row.rightThighCm),
    leftCalfCm: toNullableNumber(row.leftCalfCm),
    rightCalfCm: toNullableNumber(row.rightCalfCm),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function paginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): { page: number; limit: number; totalItems: number; totalPages: number } {
  return {
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
}
