import { ExerciseResponseDto } from './dto/exercise-response.dto';
import { Exercise } from './entities/exercise.entity';

export function toExerciseResponse(exercise: Exercise): ExerciseResponseDto {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    instructions: exercise.instructions,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    equipmentType: exercise.equipmentType,
    difficultyLevel: exercise.difficultyLevel,
    status: exercise.status,
    createdByUserId: exercise.createdByUserId,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
  };
}
