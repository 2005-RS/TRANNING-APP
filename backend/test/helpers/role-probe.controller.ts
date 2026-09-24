import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../src/modules/auth/decorators/roles.decorator';
import { UserRole } from '../../src/modules/users/enums/user-role.enum';

@Controller('role-probe')
export class RoleProbeController {
  @Get('trainer')
  @Roles(UserRole.TRAINER)
  trainerOnly(): { ok: true } {
    return { ok: true };
  }
}
