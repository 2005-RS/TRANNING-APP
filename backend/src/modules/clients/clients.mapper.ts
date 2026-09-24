import {
  ClientResponseDto,
  ClientUserResponseDto,
} from './dto/client-response.dto';
import { ClientProfile } from './entities/client-profile.entity';
import { toIsoDateString } from './iso-date.util';

export function toClientUserResponse(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClientUserResponseDto['role'];
  status: ClientUserResponseDto['status'];
}): ClientUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
  };
}

export function toClientResponse(profile: ClientProfile): ClientResponseDto {
  return {
    id: profile.id,
    user: toClientUserResponse(profile.user),
    phone: profile.phone,
    dateOfBirth: toIsoDateString(profile.dateOfBirth),
    primaryGoal: profile.primaryGoal,
    goalNotes: profile.goalNotes,
    experienceLevel: profile.experienceLevel,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
