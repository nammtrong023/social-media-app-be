import {
  Post,
  Body,
  HttpCode,
  Controller,
  HttpStatus,
  UseGuards,
  Param,
  Get,
  Delete,
  Patch,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { AtGuard } from 'src/common/guard/at.guard';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { PostDto } from './dto/create-posts.dto';
import { Post as PostModel } from '@prisma/client';
import { FilterType, PostPaginationType } from 'types';

@Controller('posts')
@UseGuards(AtGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@Query() params: FilterType): Promise<PostPaginationType> {
    return this.postsService.getAllPosts(params);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @GetCurrentUserId() userId: string,
    @Body() data: PostDto,
  ): Promise<PostModel> {
    return this.postsService.createPost(userId, data);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getPostById(@Param('id') postId: string): Promise<PostModel> {
    return this.postsService.getPostById(postId);
  }

  @Get('users/:userId')
  @HttpCode(HttpStatus.OK)
  getPostsByUserId(
    @Param('userId') userId: string,
    @Query() filter: FilterType,
  ): Promise<PostPaginationType> {
    return this.postsService.getPostsByUserId(userId, filter);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updatePost(
    @Body() data: PostDto,
    @Param('id') postId: string,
    @GetCurrentUserId() userId: string,
  ): Promise<PostModel> {
    return this.postsService.updatePost(userId, postId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deletePost(@Param('id') postId: string, @GetCurrentUserId() userId: string) {
    return this.postsService.deletePost(postId, userId);
  }

  @Post('like/:id')
  @HttpCode(HttpStatus.CREATED)
  likePost(@Param('id') postId: string, @GetCurrentUserId() userId: string) {
    return this.postsService.likePost(userId, postId);
  }

  @Patch('unlike/:id')
  @HttpCode(HttpStatus.OK)
  unlikePost(@Param('id') postId: string, @GetCurrentUserId() userId: string) {
    return this.postsService.unlikePost(userId, postId);
  }
}
