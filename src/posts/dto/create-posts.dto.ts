import {
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PostDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsNotEmpty()
  @ArrayMinSize(1, {
    message: 'images should be an array with at least one item',
  })
  @ValidateNested({ each: true })
  images: { url: string }[];
}
