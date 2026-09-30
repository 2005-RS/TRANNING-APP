import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMailTransport } from './create-mail-transport';
import { MAIL_TRANSPORT } from './mail-transport.interface';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: createMailTransport,
    },
  ],
  exports: [MAIL_TRANSPORT],
})
export class MailModule {}
