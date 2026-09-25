import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  validateSync,
} from 'class-validator';
import {
  CHAT_DEFAULT_LOCALE,
  CHAT_LOCALES,
  CHAT_MAX_MESSAGE_LENGTH,
} from '../chat.constants';
import {
  ChatErrorCode,
  ChatLocale,
  SendChatMessageInput,
} from '../types/chat.types';

export class SendChatMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHAT_MAX_MESSAGE_LENGTH)
  message!: string;

  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @IsOptional()
  @IsUUID('4')
  clientMessageId?: string;

  @IsOptional()
  @IsIn(CHAT_LOCALES)
  locale?: ChatLocale;
}

export type SendChatMessageParseResult =
  | { ok: true; value: SendChatMessageInput }
  | { ok: false; code: ChatErrorCode; clientMessageId: string | null };

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readClientMessageId(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const value = (payload as Record<string, unknown>).clientMessageId;
  return typeof value === 'string' && UUID_V4.test(value) ? value : null;
}

export function parseSendChatMessage(
  payload: unknown,
): SendChatMessageParseResult {
  const clientMessageId = readClientMessageId(payload);

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return { ok: false, code: 'INVALID_MESSAGE', clientMessageId };
  }

  const dto = plainToInstance(SendChatMessageDto, payload);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const tooLong = errors.some(
      (error) =>
        error.property === 'message' &&
        Object.keys(error.constraints ?? {}).length === 1 &&
        error.constraints?.maxLength !== undefined,
    );
    return {
      ok: false,
      code: tooLong ? 'MESSAGE_TOO_LONG' : 'INVALID_MESSAGE',
      clientMessageId,
    };
  }

  return {
    ok: true,
    value: {
      message: dto.message,
      conversationId: dto.conversationId,
      clientMessageId: dto.clientMessageId,
      locale: dto.locale ?? CHAT_DEFAULT_LOCALE,
    },
  };
}
