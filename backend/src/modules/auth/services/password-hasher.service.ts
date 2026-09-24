import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  ARGON2_MEMORY_COST_KIB,
  ARGON2_PARALLELISM,
  ARGON2_TIME_COST,
} from '../auth.constants';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: ARGON2_MEMORY_COST_KIB,
  timeCost: ARGON2_TIME_COST,
  parallelism: ARGON2_PARALLELISM,
} as const;

/**
 * Public Argon2id digest used only to keep unknown-email login on the
 * same verify path as a real password check. It is not a credential.
 * Regenerated only if ARGON2_* parameters change.
 */
export const UNKNOWN_USER_TIMING_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$psX3D8Z4pArrXvMD4qwsig$OAA2Lcsm4Oe7+SS+Izvk+YNT75NLWy1Ve8Y8EPECZMU';

@Injectable()
export class PasswordHasherService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyUnknownUser(password: string): Promise<boolean> {
    return this.verify(UNKNOWN_USER_TIMING_HASH, password);
  }
}
