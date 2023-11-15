import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { MessagePaginationType } from 'types';
import { RemoveMessageDto } from './dto/remove-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  findAll(
    @Query()
    { cursor, conversationId }: { cursor: string; conversationId: string },
  ): Promise<MessagePaginationType> {
    return this.messagesService.getMessages(cursor, conversationId);
  }

  @Post()
  create(
    @GetCurrentUserId() currentUserId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagesService.create(currentUserId, createMessageDto);
  }

  @Delete(':messageId')
  remove(@Query() removeMessage: RemoveMessageDto) {
    return this.messagesService.remove(removeMessage);
  }
}
