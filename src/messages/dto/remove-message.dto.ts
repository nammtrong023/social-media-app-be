import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveMessageDto {
  @IsNotEmpty()
  @IsString()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
