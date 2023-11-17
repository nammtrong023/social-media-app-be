import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(user: User, token: string) {
    const url = `http://localhost:3000/confirm?reset-token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: '🔒 Reset your password.',
      template: './templates/confirmation.hbs',
      context: {
        name: user.name,
        url,
      },
    });
  }
}
