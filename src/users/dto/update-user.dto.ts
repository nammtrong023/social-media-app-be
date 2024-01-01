import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(5)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  bio: string;

  @IsDateString()
  @IsOptional()
  birth: Date;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'], {
    message: "Invalid gender. It must be either 'MALE' or 'FEMALE'.",
  })
  gender: 'MALE' | 'FEMALE';
}

export class UpdateUserImageDto {
  @IsString()
  @IsNotEmpty()
  image: string;

  @IsNotEmpty()
  @IsIn(['profile', 'cover'], {
    message: "Invalid image type. It must be either 'profile' or 'cover'.",
  })
  imageType: 'profile' | 'cover';
}
