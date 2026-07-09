import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X } from "lucide-react";
import { useCircle, type CircleMessage } from "@/hooks/useCircle";
import { format } from "date-fns";
import { it } from "date-fns/locale/it";

interface CircleChatProps {
  circleId: string;
  circleName: string;
  userId: string;
}

export function CircleChat({ circleId, circleName, userId }: CircleChatProps) {
  const [open, setOpen] = useState(false);
  const { useMessages, sendMessage, isSending, useUnreadCount, markAsRead } =
    useCircle(userId);
  const { data: messages, isLoading } = useMessages(circleId);
  const { data: unreadCount } = useUnreadCount(circleId);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      markAsRead(circleId);
    }
  }, [open, circleId, markAsRead]);

  useEffect(() => {
    if (open && messages) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      await sendMessage(circleId, text);
    } catch {
      /* toast handled by hook */
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col bg-background sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-2xl sm:shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Chat
                </p>
                <h2 className="truncate text-lg font-bold">{circleName}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Chiudi chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  Caricamento...
                </div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={msg.user_id === userId}
                    />
                  ))}
                  <div ref={endRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  Nessun messaggio. Inizia tu!
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrivi un messaggio..."
                  rows={1}
                  className="max-h-24 min-h-[40px] flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  aria-label="Invia messaggio"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg active:scale-95"
        aria-label="Apri chat"
      >
        <MessageCircle className="h-4 w-4" />
        Chat
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: CircleMessage;
  isOwn: boolean;
}) {
  const time = format(new Date(message.created_at), "HH:mm", { locale: it });
  const initials = (message.display_name ?? "?")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
        {initials}
      </div>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && message.display_name && (
          <p className="mb-0.5 px-1 text-[10px] font-semibold text-muted-foreground">
            {message.display_name}
          </p>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md bg-muted"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p className={`mt-0.5 px-1 text-[10px] text-muted-foreground ${isOwn ? "text-right" : ""}`}>
          {time}
        </p>
      </div>
    </div>
  );
}

export function ChatBubbleButton({
  circleId,
  userId,
  onClick,
}: {
  circleId: string;
  userId: string;
  onClick?: () => void;
}) {
  const { useUnreadCount } = useCircle(userId);
  const { data: unreadCount } = useUnreadCount(circleId);

  return (
    <button
      onClick={onClick}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted"
      aria-label="Chat"
    >
      <MessageCircle className="h-4 w-4" />
      {(unreadCount ?? 0) > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold leading-none text-destructive-foreground">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
