import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AtStrategy } from './stragegies/at.stragegy';
import { RtStrategy } from './stragegies/rt.stragegy';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    JwtService,
    MailService,
    AtStrategy,
    RtStrategy,
  ],
})
export class AuthModule {}
