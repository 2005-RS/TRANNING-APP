import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  NodeEnvironment,
} from '../config/env.validation';
import { createMailTransport } from './create-mail-transport';
import { LogMailTransport } from './log-mail.transport';
import { MailTransportName } from './mail-transport-name.enum';
import { SmtpMailTransport } from './smtp-mail.transport';

function configWith(
  values: Partial<Record<keyof EnvironmentVariables, unknown>>,
): ConfigService<EnvironmentVariables, true> {
  const read = (key: keyof EnvironmentVariables) => values[key];
  return {
    get: read,
    getOrThrow: (key: keyof EnvironmentVariables) => {
      const value = read(key);
      if (value === undefined) {
        throw new Error(`missing ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

describe('createMailTransport', () => {
  it('uses the log transport outside production', () => {
    const transport = createMailTransport(
      configWith({
        NODE_ENV: NodeEnvironment.Development,
        MAIL_TRANSPORT: MailTransportName.Log,
      }),
    );
    expect(transport).toBeInstanceOf(LogMailTransport);
  });

  it('refuses the log transport in production', () => {
    expect(() =>
      createMailTransport(
        configWith({
          NODE_ENV: NodeEnvironment.Production,
          MAIL_TRANSPORT: MailTransportName.Log,
        }),
      ),
    ).toThrow(/not allowed in production/);
  });

  it('builds the SMTP transport from MAIL_* settings', () => {
    const transport = createMailTransport(
      configWith({
        NODE_ENV: NodeEnvironment.Production,
        MAIL_TRANSPORT: MailTransportName.Smtp,
        MAIL_SMTP_HOST: 'smtp.example.com',
        MAIL_SMTP_PORT: 587,
        MAIL_SMTP_SECURE: false,
        MAIL_FROM: 'Training <no-reply@example.com>',
      }),
    );
    expect(transport).toBeInstanceOf(SmtpMailTransport);
  });
});

describe('LogMailTransport', () => {
  it('logs only the subject, never the recipient or the body', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await new LogMailTransport().send({
      to: 'client@example.com',
      subject: 'Reset your password',
      text: 'https://app.example.com/reset-password#token=secret-value',
    });

    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('Reset your password');
    expect(logged).not.toContain('client@example.com');
    expect(logged).not.toContain('secret-value');
    log.mockRestore();
  });
});
