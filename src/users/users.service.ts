import { hash } from 'bcryptjs';
import { Notification, User } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { UpdateUserDto, UpdateUserImageDto } from './dto/update-user.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { FilterType, UserPaginationType } from 'types';
import { parseFilters } from 'utils/filters';
import { Injectable, HttpException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getCurrentUser(userId: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new HttpException('User is not found', 404);
      }

      return user;
    } catch (err) {
      throw new HttpException('Invalid token', 401);
    }
  }

  async createUser(createUser: RegisterDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: createUser.email,
      },
    });

    if (user) {
      throw new HttpException('This email has been used.', 400);
    }

    const hashedPassword = await hash(createUser.password, 10);

    const avatar =
      createUser.gender === 'MALE' ? 'male-avatar.png' : 'female-avatar.png';

    const newUser = await this.prisma.user.create({
      data: {
        ...createUser,
        profileImage: avatar,
        password: hashedPassword,
        birth: new Date(createUser.birth),
      },
    });

    return newUser;
  }

  async getOtherUsers(
    filters: FilterType,
    email: string,
  ): Promise<UserPaginationType> {
    const { itemsPerPage, page, search, skip } = parseFilters(filters);

    const users = await this.prisma.user.findMany({
      take: itemsPerPage,
      skip,
      where: {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            email: {
              contains: search,
            },
          },
        ],
        NOT: {
          email,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: users,
      itemsPerPage,
      currentPage: page,
      total: users.length,
    };
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new HttpException('Not found user', 404);
    }

    return user;
  }

  async updateUser(
    userId: string,
    data: UpdateUserDto,
    currentUserId: string,
  ): Promise<User> {
    const isMatchesId = userId === currentUserId;

    if (!isMatchesId) throw new HttpException('Unauthorized', 401);

    const isExistingEmail = await this.prisma.user.findUnique({
      where: {
        NOT: {
          id: userId,
        },
        email: data.email,
      },
    });

    if (isExistingEmail) {
      throw new HttpException('Email is already in use', 400);
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });

    if (!user) {
      throw new HttpException('Not found user', 404);
    }

    return user;
  }

  async updateUserImage(
    userId: string,
    currentUserId: string,
    data: UpdateUserImageDto,
  ): Promise<User> {
    const isMatchesId = userId === currentUserId;

    if (!isMatchesId) {
      throw new HttpException('Unauthorized', 401);
    }

    const updateData =
      data.imageType === 'profile'
        ? { profileImage: data.image }
        : { coverImage: data.image };

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
    });

    return user;
  }

  async followUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) return;

    await this.getUserById(userId);

    const currentUser = await this.getUserById(currentUserId);

    const isExistingId = currentUser.followingIds.includes(userId);

    if (isExistingId) return;

    const updatedFollowingIds = [...currentUser.followingIds, userId];

    await this.prisma.user.update({
      where: {
        id: currentUserId,
      },
      data: {
        followingIds: updatedFollowingIds,
      },
    });

    // NOTIFICATION
    await this.prisma.notification.create({
      data: {
        type: 'FOLLOW',
        receiverId: userId,
        senderId: currentUserId,
        message: `${currentUser.name} đã theo dõi bạn!`,
      },
    });
    // END NOTIFICATION
  }

  async unfollowUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) return;
    await this.getUserById(userId);

    const currentUser = await this.getUserById(currentUserId);

    const isExistingId = currentUser.followingIds.includes(userId);

    if (!isExistingId) return;

    const updatedFollowingIds = currentUser.followingIds.filter(
      (id) => id !== userId,
    );

    await this.prisma.user.update({
      where: {
        id: currentUserId,
      },
      data: {
        followingIds: updatedFollowingIds,
      },
    });

    // BEGIN NOTIFICATION
    await this.prisma.notification.deleteMany({
      where: {
        receiverId: userId,
      },
    });
    // END NOTIFICATION
  }

  async getFollowers(userId: string): Promise<User[]> {
    await this.getUserById(userId);

    const followerUsers = await this.prisma.user.findMany({
      where: {
        followingIds: {
          has: userId,
        },
      },
    });

    return followerUsers;
  }

  async getFollowings(userId: string): Promise<User[]> {
    const user = await this.getUserById(userId);

    const followingUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in: user.followingIds,
        },
      },
    });

    return followingUsers;
  }

  async getNotifications(currentUserId: string): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        receiverId: currentUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!notifications) throw new HttpException('No notifications found', 404);

    return notifications;
  }

  async updateNotification(currentUserId: string, notiId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: {
        id: notiId,
        receiverId: currentUserId,
      },
    });

    if (!notification) throw new HttpException('No notification found', 404);

    if (notification.hasSeen) return;

    await this.prisma.notification.update({
      where: {
        id: notiId,
      },
      data: {
        hasSeen: true,
      },
    });
  }
}
