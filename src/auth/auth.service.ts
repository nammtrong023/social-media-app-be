import { Injectable, HttpException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { compare, hash } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { Tokens } from 'types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

    const hashPassword = await hash(createDto.password, 10);

    const result = await this.prisma.user.create({
      data: { ...createDto, password: hashPassword },
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
      throw new HttpException("Password doesn't correct", 401);
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refreshToken);

    return tokens;
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
