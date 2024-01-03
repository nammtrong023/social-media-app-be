import {
  Injectable,
  HttpException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { compare, hash } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Tokens } from 'types';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';
import { EmailVerifiedDto, OTPDTo } from './dto/otp.dto';
import { CodeType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async signup(createDto: RegisterDto): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: createDto.email,
        },
      });

      if (user) {
        throw new HttpException('This email has been used.', 400);
      }

      const hashedPassword = await hash(createDto.password, 10);

      const avatar =
        createDto.gender === 'MALE' ? '/male-avatar.png' : '/female-avatar.png';

      const newUser = await this.prisma.user.create({
        data: {
          ...createDto,
          profileImage: avatar,
          password: hashedPassword,
          birth: new Date(createDto.birth),
        },
      });

      await this.mailService.sendOTPVerification(newUser.email);
    } catch (error) {
      console.log(error);
      throw new HttpException('Internal server', 500);
    }
  }

  async login(data: LoginDto): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Account is not existed');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Unverified email');
    }

    const verify = await compare(data.password, user.password);

    if (!verify) {
      throw new HttpException("Password doesn't correct", 400);
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async googleLogin(access_token: string): Promise<Tokens> {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`,
    );

    const data = await response.json();

    if (!data) {
      throw new HttpException('Access denied', 401);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (user && !user.google_id) {
      await this.prisma.user.update({
        where: {
          email: data.email,
        },
        data: {
          google_id: data.sub,
        },
      });
    }

    if (user) {
      const tokens = await this.generateTokens(user.id, user.email);
      await this.updateRtHash(user.id, tokens.refreshToken);

      return tokens;
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        profileImage: data.picture,
        google_id: data.sub,
      },
    });

    const tokens = await this.generateTokens(newUser.id, newUser.email);
    await this.updateRtHash(newUser.id, tokens.refreshToken);

    return tokens;
  }

  async generateRedirectUrl(res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');

    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');

    const redirectUrl = `${frontendUrl}/sign-in`;

    const oAuthClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUrl,
    );

    const authorizeUrl = oAuthClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      prompt: 'consent',
    });

    return authorizeUrl;
  }

  async getDataFromGG(code: string): Promise<Tokens> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/sign-in`;

    const oAuthClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUrl,
    );

    const res = await oAuthClient.getToken(code);
    oAuthClient.setCredentials(res.tokens);

    const user = oAuthClient.credentials;

    return await this.googleLogin(user.access_token);
  }

  async verifyEmail(data: EmailVerifiedDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new NotFoundException('Not found email');
    }

    const payload = { email: user.email };
    const expiredAt = this.config.get<string>('EXP_RESET');

    const resetToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('RESET_SECRET'),
      expiresIn: expiredAt,
    });

    const minute = 1000 * 60;
    const timeout = Date.now() + minute + parseInt(expiredAt);

    await this.prisma.code.create({
      data: {
        code: resetToken,
        type: CodeType.RESET,
        userId: user.id,
        expiredAt: new Date(timeout),
      },
    });

    await this.mailService.sendUserConfirmation(user, resetToken);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<Tokens> {
    const { newPassword, confirmNewPassword, resetToken } = resetPasswordDto;

    const decodedToken = this.jwtService.decode(resetToken);

    if (typeof decodedToken !== 'string' && decodedToken.email) {
      const user = await this.prisma.user.findFirst({
        where: { email: decodedToken.email },
      });

      const hasCode = await this.prisma.code.findFirst({
        where: {
          userId: user.id,
        },
      });

      if (!hasCode || !user) {
        throw new UnauthorizedException();
      }

      if (newPassword !== confirmNewPassword) {
        throw new HttpException('Password does not match', 400);
      }

      const hashedPassword = await hash(confirmNewPassword, 10);

      await this.prisma.user.update({
        where: { email: user.email },
        data: {
          emailVerified: true,
          password: hashedPassword,
        },
      });

      await this.prisma.code.deleteMany({
        where: {
          userId: user.id,
          type: CodeType.RESET,
        },
      });

      const tokens = await this.generateTokens(user.id, user.email);
      await this.updateRtHash(user.id, tokens.refreshToken);

      return tokens;
    } else {
      throw new UnauthorizedException();
    }
  }

  async verifyOTP(otpDto: OTPDTo): Promise<Tokens> {
    const { otp, email } = otpDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });

    const hasOTP = await this.prisma.code.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!hasOTP || !user) {
      throw new HttpException('User not found', 404);
    }

    const currentDateTime = new Date(Date.now());
    if (hasOTP.expiredAt < currentDateTime) {
      throw new HttpException('User OTP has expired', 400);
    }

    const otpMatch = await compare(otp, hasOTP.code);
    if (!otpMatch) {
      throw new HttpException('User OTP does not match', 400);
    }

    await this.prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        emailVerified: true,
      },
    });

    await this.prisma.code.deleteMany({
      where: {
        userId: hasOTP.userId,
        type: CodeType.OTP,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async resendOTP(data: EmailVerifiedDto) {
    const hasEmail = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (!hasEmail) {
      throw new HttpException('Not found email', 404);
    }

    return await this.mailService.sendOTPVerification(data.email);
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const rtMatches = await compare(refreshToken, user.refreshToken);
    if (!rtMatches) throw new ForbiddenException('Not matches');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async updateRtHash(userId: string, refreshToken: string): Promise<void> {
    const hashedRt = await hash(refreshToken, 10);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: hashedRt,
      },
    });
  }

  async generateTokens(userId: string, email: string): Promise<Tokens> {
    const jwtPayload = {
      id: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.config.get<string>('AT_SECRET'),
      expiresIn: this.config.get<string>('EXP_AT'),
    });

    const refreshToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.config.get<string>('RT_SECRET'),
      expiresIn: this.config.get<string>('EXP_RT'),
    });

    return { accessToken, refreshToken };
  }
}
