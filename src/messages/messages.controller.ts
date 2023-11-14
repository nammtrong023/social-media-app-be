import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AtGuard } from 'src/common/guard/at.guard';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { MessagePaginationType } from 'types';

@Controller('messages')
@UseGuards(AtGuard)
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

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.messagesService.remove(+id);
  // }
}
