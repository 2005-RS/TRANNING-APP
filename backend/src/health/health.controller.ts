import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { StorageHealthIndicator } from './storage.health';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly postgres: TypeOrmHealthIndicator,
    private readonly storage: StorageHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary:
      'Application availability, PostgreSQL connectivity, and object-storage bucket reachability',
  })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        try {
          return await this.postgres.pingCheck('postgres', { timeout: 1500 });
        } catch {
          throw new HealthCheckError('postgres unavailable', {
            postgres: { status: 'down' },
          });
        }
      },
      () => this.storage.pingCheck('storage'),
    ]);
  }
}
