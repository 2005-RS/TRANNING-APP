import { CHAT_MAX_MESSAGE_LENGTH } from '../chat.constants';
import { parseSendChatMessage } from './send-chat-message.dto';

const CLIENT_MESSAGE_ID = '0b8f6a52-6a0e-4c52-9d3c-1f2e3a4b5c6d';
const CONVERSATION_ID = '5f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

describe('parseSendChatMessage', () => {
  it('accepts a valid message and trims it', () => {
    expect(
      parseSendChatMessage({
        message: '  ¿Cómo funciona el entrenamiento?  ',
        conversationId: CONVERSATION_ID,
        clientMessageId: CLIENT_MESSAGE_ID,
        locale: 'en',
      }),
    ).toEqual({
      ok: true,
      value: {
        message: '¿Cómo funciona el entrenamiento?',
        conversationId: CONVERSATION_ID,
        clientMessageId: CLIENT_MESSAGE_ID,
        locale: 'en',
      },
    });
  });

  it('defaults the locale to Spanish', () => {
    const result = parseSendChatMessage({ message: 'Hola' });
    expect(result.ok && result.value.locale).toBe('es');
  });

  it.each([
    ['empty string', { message: '' }],
    ['whitespace only', { message: '   \n ' }],
    ['missing message', {}],
    ['number message', { message: 42 }],
    ['object message', { message: { text: 'hi' } }],
  ])('rejects %s', (_label, payload) => {
    expect(parseSendChatMessage(payload)).toMatchObject({
      ok: false,
      code: 'INVALID_MESSAGE',
    });
  });

  it('rejects excessive length with a specific code', () => {
    expect(
      parseSendChatMessage({
        message: 'a'.repeat(CHAT_MAX_MESSAGE_LENGTH + 1),
        clientMessageId: CLIENT_MESSAGE_ID,
      }),
    ).toEqual({
      ok: false,
      code: 'MESSAGE_TOO_LONG',
      clientMessageId: CLIENT_MESSAGE_ID,
    });
    expect(
      parseSendChatMessage({ message: 'a'.repeat(CHAT_MAX_MESSAGE_LENGTH) }).ok,
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['string', 'hola'],
    ['array', [{ message: 'hola' }]],
    ['unknown field', { message: 'hola', userId: 'someone-else' }],
    ['role injection', { message: 'hola', role: 'ADMIN' }],
    ['bad conversation id', { message: 'hola', conversationId: '1' }],
    ['unsupported locale', { message: 'hola', locale: 'fr' }],
  ])('rejects malformed payload: %s', (_label, payload) => {
    expect(parseSendChatMessage(payload)).toMatchObject({
      ok: false,
      code: 'INVALID_MESSAGE',
    });
  });

  it('only echoes a well-formed client message id', () => {
    expect(
      parseSendChatMessage({ message: '', clientMessageId: '<script>' }),
    ).toMatchObject({ clientMessageId: null });
  });
});
