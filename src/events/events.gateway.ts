import {
  SubscribeMessage,
  WebSocketGateway,
  // SubscribeMessage,
  // MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatConfigService } from 'src/events/chat-config.service';
import { socketAuthMiddleware } from 'src/auth/ws-auth.mw';
import { UseGuards } from '@nestjs/common';
import { WsGuard } from 'src/common/guard/ws.guard';
import { Message } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsGuard)
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private configService: ChatConfigService) {}

  afterInit(client: Socket) {
    client.use(socketAuthMiddleware(this.configService) as any);
  }

  @SubscribeMessage('createMessage')
  sendNewMessage(message: Message) {
    this.server.emit('newMessage', message);
  }

  // @SubscribeMessage('removeEvent')
  // remove(@MessageBody() id: number) {
  //   return this.eventsService.remove(id);
  // }
}
