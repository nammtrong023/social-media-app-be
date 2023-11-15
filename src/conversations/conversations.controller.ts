import { Get, Post, Body, Param, Delete, Controller } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { Conversation } from '@prisma/client';

@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Post()
  create(
    @GetCurrentUserId() currentUserId: string,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.create(
      currentUserId,
      createConversationDto,
    );
  }

  @Get()
  findAll(@GetCurrentUserId() currentUserId: string): Promise<Conversation[]> {
    return this.conversationsService.findAll(currentUserId);
  }

  @Get(':conversationId')
  findOne(@Param('conversationId') convoId: string): Promise<Conversation> {
    return this.conversationsService.findOne(convoId);
  }

  @Delete(':conversationId')
  remove(
    @GetCurrentUserId() currentUserId: string,
    @Param('conversationId') convoId: string,
  ) {
    return this.conversationsService.remove(convoId, currentUserId);
  }
}
