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
import { User } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { Tokens } from 'types';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async signup(createDto: RegisterDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: createDto.email,
      },
    });

    if (user) {
      throw new HttpException('This email has been used.', 400);
    }

    const hashedPassword = await hash(createDto.password, 10);

    const result = await this.prisma.user.create({
      data: { ...createDto, password: hashedPassword },
    });

    return result;
  }

  async login(data: LoginDto): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new HttpException('Account is not existed', 401);
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
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');

    const redirectUrl = 'http://localhost:3000/sign-in';

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
    const redirectUrl = 'http://localhost:3000/sign-in';

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

  async verifyEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
    });

    if ((user && user.google_id) || !user) {
      throw new NotFoundException('Not found email');
    }

    const payload = { email: user.email };

    const resetToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('RESET_SECRET'),
      expiresIn: this.config.get<string>('EXP_RESET'),
    });

    await this.mailService.sendUserConfirmation(user, resetToken);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { newPassword, confirmNewPassword, resetToken } = resetPasswordDto;

    const decodedToken = this.jwtService.decode(resetToken);

    if (typeof decodedToken !== 'string' && decodedToken.email) {
      const user = await this.prisma.user.findFirst({
        where: { email: decodedToken.email },
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      if (newPassword !== confirmNewPassword) {
        throw new HttpException('Password does not match', 400);
      }

      const hashedPassword = await hash(confirmNewPassword, 10);

      const tokens = await this.generateTokens(user.id, user.email);

      await this.prisma.user.update({
        where: { email: user.email },
        data: {
          refreshToken: tokens.refreshToken,
          password: hashedPassword,
        },
      });

      return tokens;
    } else {
      throw new UnauthorizedException();
    }
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
