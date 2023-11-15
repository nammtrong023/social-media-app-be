import { Comment } from '@prisma/client';
import { parseFilters } from 'utils/filters';
import { PrismaService } from 'src/prisma.service';
import { CommentPaginationType, FilterType } from 'types';
import { HttpException, Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async getCommentsByPostId(
    postId: string,
    filter: FilterType,
  ): Promise<CommentPaginationType> {
    const { itemsPerPage, page, skip } = parseFilters(filter);

    const comments = await this.prisma.comment.findMany({
      take: itemsPerPage,
      skip,
      where: { postId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!comments.length) throw new HttpException('No comments found', 404);

    const totalComments = comments.length;

    return {
      data: comments,
      currentPage: page,
      itemsPerPage,
      total: totalComments,
    };
  }

  async createComment(
    data: CreateCommentDto,
    currentUserId: string,
  ): Promise<Comment> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    const post = await this.prisma.post.findUnique({
      where: { id: data.postId },
    });

    if (!post) throw new HttpException('No post found', 404);

    const comment = await this.prisma.comment.create({
      data: {
        content: data.content,
        postId: data.postId,
        userId: currentUserId,
      },
      include: {
        user: true,
      },
    });

    // BEGIN NOTIFICATION
    const isPostAuthor = currentUser.id === post.userId;
    if (isPostAuthor) return;

    await this.prisma.notification.create({
      data: {
        type: 'COMMENT',
        postId: data.postId,
        senderId: currentUserId,
        message: `${currentUser.name} đã bình luận bài viết của bạn!`,
        receiverId: post.userId,
      },
    });
    // END NOTIFICATION

    return comment;
  }

  async updateComment(
    commentId: string,
    data: UpdateCommentDto,
    currentUserId: string,
  ): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, userId: currentUserId },
    });

    if (!comment) throw new HttpException('Not found comment', 404);

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: data,
      include: { user: true },
    });

    return updatedComment;
  }

  async deleteComment(commentId: string, currentUserId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, userId: currentUserId },
    });

    if (!comment) throw new HttpException('No comment found', 404);

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    throw new HttpException('Comment deleted', 200);
  }
}
