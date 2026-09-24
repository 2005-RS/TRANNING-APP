import {
  useExerciseMediaCreateUploadRequest,
  useExerciseMediaFinalize,
  useExerciseMediaRemove,
} from '@/generated/exercise-media/exercise-media';

export function useExerciseMediaMutations() {
  const createUpload = useExerciseMediaCreateUploadRequest();
  const finalize = useExerciseMediaFinalize();
  const remove = useExerciseMediaRemove();
  return { createUpload, finalize, remove };
}
