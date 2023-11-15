import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Message } from '@prisma/client';
import { CreateMessageDto } from './dto/create-message.dto';
import { RemoveMessageDto } from './dto/remove-message.dto';
import { EventsGateway } from 'src/events/events.gateway';
import { MessagePaginationType } from 'types';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async getMessages(
    cursor: string,
    conversationId: string,
  ): Promise<MessagePaginationType> {
    const MESSAGES = 10;

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) throw new HttpException('Not found conversation', 404);

    let messages: Message[] = [];

    if (cursor) {
      messages = await this.prisma.message.findMany({
        take: MESSAGES,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          conversationId,
        },
        include: {
          sender: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      messages = await this.prisma.message.findMany({
        take: MESSAGES,
        where: {
          conversationId,
        },
        include: {
          sender: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    let nextCursor: null | string = null;

    if (messages.length === MESSAGES) {
      nextCursor = messages[MESSAGES - 1].id;
    }

    return {
      data: messages,
      nextCursor,
    };
  }

  async create(
    currentUserId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const { content, image, conversationId } = createMessageDto;

    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) throw new HttpException('No conversation found', 404);

    const message = await this.prisma.message.create({
      include: {
        sender: true,
      },
      data: {
        content: content,
        image: image,
        conversation: {
          connect: { id: conversationId },
        },
        sender: {
          connect: { id: currentUserId },
        },
      },
    });

    this.eventsGateway.sendNewMessage(message);

    return message;
  }

  async remove(removeMessage: RemoveMessageDto) {
    if (!removeMessage.messageId) {
      return new HttpException('MessageId is required', 400);
    }

    if (!removeMessage.conversationId) {
      return new HttpException('ConversationId is required', 400);
    }

    const message = await this.prisma.message.findFirst({
      where: { id: removeMessage.messageId },
    });

    if (!message) throw new HttpException('No message found', 404);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: removeMessage.conversationId },
    });

    if (!conversation) throw new HttpException('No conversation found', 404);

    await this.prisma.message.delete({
      where: {
        id: removeMessage.messageId,
      },
    });

    throw new HttpException('Message deleted', 200);
  }
}
