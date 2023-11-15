import {
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  Controller,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { Comment } from '@prisma/client';
import { CommentPaginationType, FilterType } from 'types';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('posts/:postId')
  @HttpCode(HttpStatus.OK)
  getCommentsByPostId(
    @Param('postId') postId: string,
    @Query() filter: FilterType,
  ): Promise<CommentPaginationType> {
    return this.commentsService.getCommentsByPostId(postId, filter);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Body() data: CreateCommentDto,
    @GetCurrentUserId() currentUserId: string,
  ): Promise<Comment> {
    return this.commentsService.createComment(data, currentUserId);
  }

  @Patch(':commentId')
  @HttpCode(HttpStatus.OK)
  updateComment(
    @Param('commentId') commentId: string,
    @Body() data: UpdateCommentDto,
    @GetCurrentUserId() currentUserId: string,
  ): Promise<Comment> {
    return this.commentsService.updateComment(commentId, data, currentUserId);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  deleteComment(
    @Param('commentId') commentId: string,
    @GetCurrentUserId() currentUserId: string,
  ) {
    return this.commentsService.deleteComment(commentId, currentUserId);
  }
}
