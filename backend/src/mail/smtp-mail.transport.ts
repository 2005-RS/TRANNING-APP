import { createTransport, Transporter } from 'nodemailer';
import { MailMessage, MailTransport } from './mail-transport.interface';

export interface SmtpMailOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpMailOptions) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user
        ? { user: options.user, pass: options.password }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.options.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
