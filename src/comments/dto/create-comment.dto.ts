import { IsNotEmpty, IsString } from 'class-validator';
import { UpdateCommentDto } from './update-comment.dto';

export class CreateCommentDto extends UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  postId: string;
}
