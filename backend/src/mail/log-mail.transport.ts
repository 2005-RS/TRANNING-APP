import { Logger } from '@nestjs/common';
import { MailMessage, MailTransport } from './mail-transport.interface';

/**
 * Development and CI transport: nothing leaves the process. Only the subject
 * is logged, because bodies carry single-use links and recipients are PII.
 */
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger(LogMailTransport.name);

  send(message: MailMessage): Promise<void> {
    this.logger.log(`Mail not sent (MAIL_TRANSPORT=log): "${message.subject}"`);
    return Promise.resolve();
  }
}
