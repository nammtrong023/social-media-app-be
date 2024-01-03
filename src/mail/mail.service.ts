import { hash } from 'bcryptjs';
import { CodeType, User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async sendUserConfirmation(user: User, token: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const url = `${frontendUrl}/password-recovery?reset-token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: '🔒 Đặt lại mật khẩu.',
      template: './templates/confirmation.hbs',
      context: {
        name: user.name,
        url,
      },
    });
  }

  async sendOTPVerification(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('Email not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await hash(otp, 10);

    await this.mailerService.sendMail({
      to: email,
      subject: `${otp} là mã xác minh của bạn.`,
      template: './templates/verify-email.hbs',
      context: {
        otp,
        name: user.name,
      },
    });

    const hour = 1000 * 60 * 60;
    const futureTimestamp = Date.now() + hour * 24;

    await this.prisma.code.create({
      data: {
        expiredAt: new Date(futureTimestamp),
        type: CodeType.OTP,
        code: hashedOTP,
        userId: user.id,
      },
    });

    return new HttpException('Otp has been sent', 201);
  }
}
