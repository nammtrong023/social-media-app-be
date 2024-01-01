import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsDateString,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsDateString()
  @IsNotEmpty()
  birth: Date;

  @IsNotEmpty()
  @IsIn(['MALE', 'FEMALE'], {
    message: "Invalid gender. It must be either 'MALE' or 'FEMALE'.",
  })
  gender: 'MALE' | 'FEMALE';
}
