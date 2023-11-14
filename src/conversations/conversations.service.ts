import { ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
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
    const conversation = await this.prisma.conversation.findUnique({
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

    return conversation;
  }

  update(id: number, updateConversationDto: UpdateConversationDto) {
    console.log(
      'ConversationsService ~ update ~ updateConversationDto:',
      updateConversationDto,
    );
    return `This action updates a #${id} conversation`;
  }

  remove(id: number) {
    return `This action removes a #${id} conversation`;
  }
}
