import { Tokens } from 'types';
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
import { EmailVerifiedDto, OTPDTo } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto): Promise<void> {
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
  verifyEmail(@Body() data: EmailVerifiedDto) {
    return this.authService.verifyEmail(data);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOTP(@Body() otpDto: OTPDTo): Promise<Tokens> {
    return this.authService.verifyOTP(otpDto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOTP(@Body() data: EmailVerifiedDto) {
    return this.authService.resendOTP(data);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<Tokens> {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
