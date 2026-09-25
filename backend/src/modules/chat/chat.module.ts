import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AI_PROVIDER } from './ai/ai-provider.interface';
import { createAiProvider } from './ai/create-ai-provider';
import { ChatConnectionAuthService } from './chat-connection-auth.service';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatRateLimiter } from './chat-rate-limiter';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PublicChatGateway } from './public-chat.gateway';
import { PublicChatQuota } from './public-chat-quota';

@Module({
  imports: [AuthModule],
  providers: [
    ChatGateway,
    PublicChatGateway,
    ChatService,
    ChatConnectionAuthService,
    ChatConversationStore,
    ChatRateLimiter,
    PublicChatQuota,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: createAiProvider,
    },
  ],
})
export class ChatModule {}
