import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../config/env.validation';
import { LogMailTransport } from './log-mail.transport';
import { MailTransportName } from './mail-transport-name.enum';
import { MailTransport } from './mail-transport.interface';
import { SmtpMailTransport } from './smtp-mail.transport';

export function createMailTransport(
  config: ConfigService<EnvironmentVariables, true>,
): MailTransport {
  const transportName = config.getOrThrow('MAIL_TRANSPORT', { infer: true });

  if (transportName === MailTransportName.Smtp) {
    return new SmtpMailTransport({
      host: config.getOrThrow('MAIL_SMTP_HOST', { infer: true }),
      port: config.getOrThrow('MAIL_SMTP_PORT', { infer: true }),
      secure: config.getOrThrow('MAIL_SMTP_SECURE', { infer: true }),
      user: config.get('MAIL_SMTP_USER', { infer: true }),
      password: config.get('MAIL_SMTP_PASSWORD', { infer: true }),
      from: config.getOrThrow('MAIL_FROM', { infer: true }),
    });
  }

  if (
    config.getOrThrow('NODE_ENV', { infer: true }) ===
    NodeEnvironment.Production
  ) {
    throw new Error('MAIL_TRANSPORT=log is not allowed in production');
  }
  return new LogMailTransport();
}
