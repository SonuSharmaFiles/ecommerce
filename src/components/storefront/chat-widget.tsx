"use client";

import { useState } from "react";
import { Bot, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string }

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm the ShopFlow assistant. Ask me about orders, returns, or products." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMsg.content }),
      });
      const json = await res.json();
      if (json.sessionId) setSessionId(json.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: json.reply ?? "Sorry, I hit an error." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach the server." }]);
    } finally { setSending(false); }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl transition-all",
          open ? "h-[480px] opacity-100" : "pointer-events-none h-0 opacity-0"
        )}
      >
        <header className="border-b bg-muted/40 p-4">
          <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4" /> ShopFlow assistant</div>
          <p className="text-xs text-muted-foreground">Typically replies in seconds</p>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("mb-2 flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="text-xs text-muted-foreground">Assistant is typing…</div>}
        </div>

        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending}><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </>
  );
}
