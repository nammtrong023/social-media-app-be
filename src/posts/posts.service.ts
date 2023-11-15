import { Post } from '@prisma/client';
import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PostDto } from './dto/create-posts.dto';
import { FilterType, PostPaginationType } from 'types';
import { parseFilters } from 'utils/filters';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async getAllPosts(filters: FilterType): Promise<PostPaginationType> {
    const { itemsPerPage, page, skip } = parseFilters(filters);

    const posts = await this.prisma.post.findMany({
      take: itemsPerPage,
      skip,
      include: {
        images: true,
        user: true,
        comments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: posts,
      itemsPerPage,
      currentPage: page,
      total: posts.length,
    };
  }

  async createPost(userId: string, data: PostDto): Promise<Post> {
    const { images, title } = data;

    const post = await this.prisma.post.create({
      data: {
        images: {
          createMany: {
            data: [...images.map((image: { url: string }) => image)],
          },
        },
        title,
        userId,
      },
      include: {
        images: true,
      },
    });

    return post;
  }

  async getPostById(postId: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: true,
        images: true,
        comments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!post) {
      throw new HttpException('No post found', 404);
    }

    return post;
  }

  async getPostsByUserId(
    userId: string,
    filter: FilterType,
  ): Promise<PostPaginationType> {
    const { page, itemsPerPage, skip } = parseFilters(filter);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw new HttpException('No user found', 404);

    const posts = await this.prisma.post.findMany({
      take: itemsPerPage,
      skip,
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        images: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return {
      data: posts,
      itemsPerPage,
      currentPage: page,
      total: posts.length,
    };
  }

  async updatePost(
    currentUserId: string,
    postId: string,
    data: PostDto,
  ): Promise<Post> {
    try {
      await this.prisma.post.update({
        where: {
          id: postId,
          userId: currentUserId,
        },
        data: {
          title: data.title,
          images: {
            deleteMany: {},
          },
        },
      });

      const post = await this.prisma.post.update({
        where: {
          id: postId,
        },
        data: {
          title: data.title,
          images: {
            createMany: { data: data.images },
          },
        },
        include: {
          images: true,
          comments: true,
        },
      });

      return post;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('No post found', 404);
      }
    }
  }

  async deletePost(postId: string, currentUserId: string) {
    try {
      await this.prisma.post.delete({
        where: {
          id: postId,
          userId: currentUserId,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('No post found', 404);
      }
    }

    throw new HttpException('Post deleted', 200);
  }

  async likePost(currentUserId: string, postId: string) {
    const post = await this.getPostById(postId);

    if (!post) {
      throw new HttpException('No post found', 404);
    }

    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
      },
    });

    const isExistedId = post.likedIds.includes(currentUser.id);
    if (isExistedId) return;

    const updatedLikedIds = [...post.likedIds, currentUser.id];

    await this.prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        likedIds: updatedLikedIds,
      },
    });

    // BEGIN NOTIFICATION
    const isPostAuthor = post.userId === currentUser.id;

    if (!isPostAuthor) {
      await this.prisma.notification.create({
        data: {
          postId,
          type: 'LIKE',
          senderId: currentUserId,
          receiverId: post.userId,
          message: `${currentUser.name} đã thích bài viết của bạn.`,
        },
      });
    }
    // END NOTIFICATION
  }

  async unlikePost(currentUserId: string, postId: string) {
    const post = await this.getPostById(postId);

    if (!post) {
      throw new HttpException('No post found', 404);
    }

    let updatedLikedIds = [...(post.likedIds || [])];
    updatedLikedIds = updatedLikedIds.filter((id) => id !== currentUserId);

    await this.prisma.post.update({
      where: {
        id: postId,
      },

      data: {
        likedIds: updatedLikedIds,
      },
    });
  }
}
