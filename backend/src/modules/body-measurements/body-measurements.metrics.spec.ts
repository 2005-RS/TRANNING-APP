import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBodyMeasurementDto } from './dto/body-measurement-input.dto';
import { hasAtLeastOneMetric } from './body-measurements.metrics';
import { toBodyMeasurementResponse } from './body-measurements.mapper';
import { BodyMeasurement } from './entities/body-measurement.entity';
import { parseStrictIsoDateTime } from './iso-datetime.validators';
import { numericTransformer } from './numeric.transformer';

describe('body measurement metrics and mapping', () => {
  it('requires at least one numeric metric and rejects notes-only payloads', () => {
    expect(hasAtLeastOneMetric({ notes: 'hello' } as never)).toBe(false);
    expect(hasAtLeastOneMetric({ bodyWeightKg: 82.5 })).toBe(true);
    expect(
      hasAtLeastOneMetric({ waistCm: null, bodyFatPercentage: 16.5 }),
    ).toBe(true);
  });

  it('maps PostgreSQL NUMERIC strings to JS numbers without extra rounding', () => {
    expect(numericTransformer.from('82.40')).toBe(82.4);
    expect(numericTransformer.from(null)).toBeNull();
    expect(
      toBodyMeasurementResponse({
        id: 'm-1',
        measuredAt: new Date('2026-08-01T12:00:00.000Z'),
        bodyWeightKg: '82.40' as unknown as number,
        bodyFatPercentage: '16.50' as unknown as number,
        neckCm: null,
        shouldersCm: null,
        chestCm: null,
        waistCm: '85.00' as unknown as number,
        hipsCm: null,
        leftArmCm: null,
        rightArmCm: null,
        leftThighCm: null,
        rightThighCm: null,
        leftCalfCm: null,
        rightCalfCm: null,
        notes: null,
        createdAt: new Date('2026-08-01T12:00:00.000Z'),
        updatedAt: new Date('2026-08-01T12:00:00.000Z'),
      } as BodyMeasurement),
    ).toMatchObject({
      bodyWeightKg: 82.4,
      bodyFatPercentage: 16.5,
      waistCm: 85,
    });
  });

  it('parses timezone-aware timestamps and rejects naive datetimes', () => {
    expect(
      parseStrictIsoDateTime('2026-08-01T12:00:00.000Z')?.toISOString(),
    ).toBe('2026-08-01T12:00:00.000Z');
    expect(parseStrictIsoDateTime('2026-08-01T12:00:00')).toBeNull();
    expect(parseStrictIsoDateTime('2026-08-01')).toBeNull();
  });

  it('rejects notes-only and out-of-bound create DTOs', async () => {
    const notesOnly = plainToInstance(CreateBodyMeasurementDto, {
      notes: 'hello',
    });
    expect(await validate(notesOnly)).not.toHaveLength(0);

    const tooHeavy = plainToInstance(CreateBodyMeasurementDto, {
      bodyWeightKg: 500.01,
    });
    expect(await validate(tooHeavy)).not.toHaveLength(0);

    const zero = plainToInstance(CreateBodyMeasurementDto, { waistCm: 0 });
    expect(await validate(zero)).not.toHaveLength(0);

    const fat = plainToInstance(CreateBodyMeasurementDto, {
      bodyFatPercentage: 100.01,
    });
    expect(await validate(fat)).not.toHaveLength(0);

    const ok = plainToInstance(CreateBodyMeasurementDto, {
      bodyWeightKg: 82.4,
      waistCm: 84.2,
    });
    expect(await validate(ok)).toHaveLength(0);
  });
});
