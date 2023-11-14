import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { ChatConfigService } from 'src/events/chat-config.service';

@Module({
  exports: [EventsGateway],
  providers: [EventsGateway, ChatConfigService],
})
export class EventsModule {}
