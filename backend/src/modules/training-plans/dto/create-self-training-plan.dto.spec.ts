import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSelfTrainingPlanDto } from './create-self-training-plan.dto';

const firstTemplateId = 'c0a80101-0000-4000-8000-000000000001';
const secondTemplateId = 'c0a80101-0000-4000-8000-000000000002';

describe('CreateSelfTrainingPlanDto', () => {
  it.each([
    { workouts: [] },
    {
      workouts: Array.from({ length: 8 }, (_, index) => ({
        workoutTemplateId: `c0a80101-0000-4000-8000-00000000000${index + 1}`,
      })),
    },
    {
      workouts: [
        { workoutTemplateId: firstTemplateId },
        { workoutTemplateId: firstTemplateId },
      ],
    },
  ])('rejects invalid workout selections', async (input) => {
    const dto = plainToInstance(CreateSelfTrainingPlanDto, input);

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts one to seven distinct template ids', async () => {
    const dto = plainToInstance(CreateSelfTrainingPlanDto, {
      workouts: [
        { workoutTemplateId: firstTemplateId },
        { workoutTemplateId: secondTemplateId },
      ],
    });

    expect(await validate(dto)).toHaveLength(0);
  });
});
