import { Tokens } from 'types';
import { User } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { GetCurrentUser } from 'src/common/decorator/get-current-user';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { RtGuard } from 'src/common/guard/rt.guard';
import { Public } from 'src/common/decorator/public.decorator';
import {
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Controller,
  Query,
  Get,
  Req,
} from '@nestjs/common';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto): Promise<User> {
    return this.authService.signup(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): Promise<Tokens> {
    return this.authService.login(body);
  }

  @Public()
  @Post('oauth')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Req() response: Response) {
    return this.authService.generateRedirectUrl(response);
  }

  @Public()
  @Get('/oauth/callback')
  @HttpCode(HttpStatus.OK)
  getDataFromGG(@Query() code: string): Promise<Tokens> {
    return this.authService.getDataFromGG(code);
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ): Promise<Tokens> {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() { email }: { email: string }) {
    return this.authService.verifyEmail(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
