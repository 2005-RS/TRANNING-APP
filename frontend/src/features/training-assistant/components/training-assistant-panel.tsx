import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AlertCircle, Bot, RotateCcw, SendHorizontal, X } from 'lucide-react';
import { interpolate } from '@/i18n/format';
import type { TrainingAssistantPlacement } from '@/features/training-assistant/components/training-assistant';
import { useTrainingAssistantCopy } from '@/features/training-assistant/copy';
import {
  useTrainingAssistantChat,
  type ChatConnectionIssue,
  type ChatConnectionStatus,
  type ChatMessage,
} from '@/features/training-assistant/hooks/use-training-assistant-chat';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

const COUNTER_THRESHOLD = 200;

const MEMBER_QUICK_PROMPT_KEYS = ['howItWorks', 'training', 'nutrition', 'progress', 'help'] as const;
const PUBLIC_QUICK_PROMPT_KEYS = [
  'howItWorks',
  'start',
  'plans',
  'training',
  'nutrition',
  'progress',
] as const;

type Copy = ReturnType<typeof useTrainingAssistantCopy>;

function statusDotClass(status: ChatConnectionStatus): string {
  switch (status) {
    case 'CONNECTED':
      return 'bg-success';
    case 'CONNECTING':
    case 'RECONNECTING':
      return 'bg-warning';
    default:
      return 'bg-muted-foreground';
  }
}

function ConnectionBanner({
  status,
  issue,
  copy,
  onReconnect,
}: {
  status: ChatConnectionStatus;
  issue: ChatConnectionIssue | null;
  copy: Copy;
  onReconnect: () => void;
}) {
  if (status === 'CONNECTED' || status === 'CONNECTING') {
    return null;
  }

  if (status === 'RECONNECTING') {
    return (
      <p role="status" className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
        {copy.banner.reconnecting}
      </p>
    );
  }

  const message =
    issue === 'SESSION_EXPIRED'
      ? copy.banner.sessionExpired
      : issue === 'TOO_MANY_CONNECTIONS'
        ? copy.banner.tooManyConnections
        : status === 'DISCONNECTED'
          ? copy.banner.disconnected
          : copy.banner.error;

  return (
    <div role="alert" className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2">
      <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden />
      <p className="min-w-0 flex-1 text-xs text-foreground">{message}</p>
      {issue === 'SESSION_EXPIRED' ? null : (
        <Button variant="outline" size="sm" onClick={onReconnect}>
          {copy.banner.reconnect}
        </Button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  copy,
  canRetry,
  onRetry,
}: {
  message: ChatMessage;
  copy: Copy;
  canRetry: boolean;
  onRetry: (id: string) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <p
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-muted text-foreground',
          isUser && message.status === 'sending' && 'opacity-80',
        )}
      >
        <span className="sr-only">{isUser ? copy.you : copy.name}: </span>
        {message.content}
      </p>
      {isUser && message.status === 'failed' ? (
        <div className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="size-3.5" aria-hidden />
          <span>{copy.errors[message.failure ?? 'GENERIC']}</span>
          {canRetry && message.failure !== 'QUOTA_EXHAUSTED' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-foreground"
              onClick={() => onRetry(message.id)}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {copy.retry}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TrainingAssistantPanel({
  open,
  onClose,
  placement,
}: {
  open: boolean;
  onClose: () => void;
  placement: TrainingAssistantPlacement;
}) {
  const copy = useTrainingAssistantCopy();
  const isPublic = placement === 'public';
  const chat = useTrainingAssistantChat(isPublic ? 'public' : 'member');
  const greeting = isPublic ? copy.public.greeting : copy.greeting;
  const description = isPublic ? copy.public.description : copy.description;
  const quickPrompts: ReadonlyArray<{ key: string; text: string }> = isPublic
    ? PUBLIC_QUICK_PROMPT_KEYS.map((key) => ({ key, text: copy.public.quickPrompts[key] }))
    : MEMBER_QUICK_PROMPT_KEYS.map((key) => ({ key, text: copy.quickPrompts[key] }));
  const titleId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  const connected = chat.status === 'CONNECTED';
  const canSend = connected && !chat.awaitingReply && draft.trim().length > 0;
  const hasUserMessages = chat.messages.some((message) => message.role === 'user');
  const remaining = chat.maxMessageLength - draft.length;
  const counterThreshold = Math.min(COUNTER_THRESHOLD, Math.floor(chat.maxMessageLength / 5));

  useEffect(() => {
    if (open) {
      textareaRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [chat.messages.length, chat.typing]);

  const submit = (text: string) => {
    if (chat.send(text) && text === draft) {
      setDraft('');
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSend) {
      submit(draft);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) {
        submit(draft);
      }
    }
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
      className={cn(
        'fixed inset-0 z-[var(--z-overlay)] flex flex-col overflow-hidden bg-background text-foreground',
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        'sm:inset-auto sm:right-6 sm:h-[min(40rem,calc(100svh-3rem))] sm:w-[25rem] sm:rounded-xl sm:border sm:border-border sm:bg-card sm:pb-0 sm:pt-0 sm:shadow-lg',
        placement === 'client' ? 'sm:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:h-[min(40rem,calc(100svh-7rem))]' : 'sm:bottom-6',
        !open && 'hidden',
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-semibold tracking-tight">
            {copy.name}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('size-2 rounded-full', statusDotClass(chat.status))} aria-hidden />
            <span data-testid="assistant-status">{copy.status[chat.status]}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={copy.closeLabel}
          onClick={onClose}
        >
          <X className="size-5" aria-hidden />
        </Button>
      </header>

      <ConnectionBanner
        status={chat.status}
        issue={chat.issue}
        copy={copy}
        onReconnect={chat.reconnect}
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <p id={descriptionId} className="mb-3 text-center text-[0.7rem] text-muted-foreground">
          {description}
        </p>
        <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
          <MessageBubble
            message={{ id: 'greeting', role: 'assistant', content: greeting, createdAt: '' }}
            copy={copy}
            canRetry={false}
            onRetry={chat.retry}
          />
          {chat.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              copy={copy}
              canRetry={connected && !chat.awaitingReply}
              onRetry={chat.retry}
            />
          ))}
        </div>

        {chat.typing ? (
          <div role="status" className="mt-3 flex items-start">
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  aria-hidden
                  className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce"
                  style={{ animationDelay: `${dot * 150}ms` }}
                />
              ))}
              <span className="sr-only">{copy.typing}</span>
            </span>
          </div>
        ) : null}

        {hasUserMessages ? null : (
          <div role="group" aria-label={copy.quickPromptsLabel} className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt.key}
                variant="outline"
                className="h-11 rounded-full px-4"
                disabled={!connected || chat.awaitingReply}
                onClick={() => submit(prompt.text)}
              >
                {prompt.text}
              </Button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={`${titleId}-composer`}>
            {copy.composer.label}
          </label>
          <textarea
            id={`${titleId}-composer`}
            ref={textareaRef}
            rows={1}
            value={draft}
            maxLength={chat.maxMessageLength}
            placeholder={copy.composer.placeholder}
            aria-describedby={hintId}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKeyDown}
            className={cn(
              'field-sizing-content max-h-32 min-h-11 w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground',
              'placeholder:text-muted-foreground',
            )}
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            aria-label={copy.composer.send}
            disabled={!canSend}
          >
            <SendHorizontal className="size-5" aria-hidden />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[0.7rem] text-muted-foreground">
          <span id={hintId} className="max-sm:sr-only">
            {copy.composer.hint}
          </span>
          {remaining <= counterThreshold ? (
            <span className="font-mono tabular-nums">
              {interpolate(copy.composer.remaining, { count: remaining })}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
