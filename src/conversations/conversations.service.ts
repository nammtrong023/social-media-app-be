import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { PrismaService } from 'src/prisma.service';
import { Conversation } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    currentUserId: string,
    createConversationDto: CreateConversationDto,
  ) {
    const { userId } = createConversationDto;
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (userId === currentUserId) {
      throw new ForbiddenException();
    }

    const existingConversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          {
            userIds: {
              equals: [currentUserId, userId],
            },
          },
          {
            userIds: {
              equals: [userId, currentUserId],
            },
          },
        ],
      },
    });

    const singleConversation = existingConversations[0];

    if (singleConversation) {
      return singleConversation;
    }

    const newConversation = await this.prisma.conversation.create({
      data: {
        users: {
          connect: [
            {
              id: currentUserId,
            },
            {
              id: userId,
            },
          ],
        },
      },
      include: {
        users: true,
      },
    });

    return newConversation;
  }

  async findAll(currentUserId: string): Promise<Conversation[]> {
    const conversations = await this.prisma.conversation.findMany({
      orderBy: {
        lastMessageAt: 'desc',
      },
      where: {
        userIds: {
          has: currentUserId,
        },
      },
      include: {
        users: true,
        messages: {
          include: {
            sender: true,
          },
        },
      },
    });

    return conversations;
  }

  async findOne(conversationId: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
      },
      include: {
        users: true,
        messages: {
          include: {
            sender: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new HttpException('Not found conversation', 404);
    }

    return conversation;
  }

  async remove(convoId: string, currentUserId: string) {
    const conversation = await this.findOne(convoId);

    if (!conversation.userIds.includes(currentUserId)) {
      throw new ForbiddenException();
    }

    await this.prisma.conversation.delete({
      where: {
        id: convoId,
      },
    });

    throw new HttpException('Deleted conversation successfully', 200);
  }
}
