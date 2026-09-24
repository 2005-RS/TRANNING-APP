import {
  TrainerResponseDto,
  TrainerUserResponseDto,
} from './dto/trainer-response.dto';
import { TrainerProfile } from './entities/trainer-profile.entity';

export function toTrainerUserResponse(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: TrainerUserResponseDto['role'];
  status: TrainerUserResponseDto['status'];
}): TrainerUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
  };
}

export function toTrainerResponse(profile: TrainerProfile): TrainerResponseDto {
  return {
    id: profile.id,
    user: toTrainerUserResponse(profile.user),
    phone: profile.phone,
    professionalTitle: profile.professionalTitle,
    bio: profile.bio,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
