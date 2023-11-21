import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          service: 'gmail',
          host: 'smtp.gmail.com',
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"Meetmax" <${config.get('MAIL_USER')}>`,
        },
        template: {
          dir: process.cwd() + '/src/mail/',
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],

  providers: [MailService, PrismaService],
  exports: [MailService],
})
export class MailModule {}
