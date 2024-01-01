import { Socket } from 'socket.io';
import { ChatConfigService } from 'src/events/chat-config.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private chatConfigService: ChatConfigService) {}
  canActivate(context: ExecutionContext): any {
    if (context.getType() !== 'ws') {
      return true;
    }

    const client = context.switchToWs().getClient<Socket>();
    const { authorization } = client.handshake.headers;
    const payload = this.chatConfigService.isValidAuthHeader(authorization);

    return payload;
  }
}
