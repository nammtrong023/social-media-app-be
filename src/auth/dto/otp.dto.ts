import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class OTPDTo {
  @IsNotEmpty()
  @IsString()
  @Length(6)
  otp: string;

  @IsEmail()
  email: string;
}

export class EmailVerifiedDto {
  @IsEmail()
  email: string;
}
