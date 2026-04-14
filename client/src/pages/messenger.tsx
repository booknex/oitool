import { useState, useRef, useEffect } from "react";
import { Send, Search, Plus, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  text: string;
  fromMe: boolean;
  time: string;
  read: boolean;
}

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

// ─── Seed data ────────────────────────────────────────────────────────────────

function now(offsetMin = 0) {
  const d = new Date(Date.now() - offsetMin * 60000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const INITIAL_CONVOS: Conversation[] = [
  {
    id: 1,
    name: "Maria Lopez",
    avatar: "ML",
    lastMessage: "I'll be at the property by 9am.",
    lastTime: now(3),
    unread: 2,
    online: true,
    messages: [
      { id: 1, text: "Hey, what time is checkout today?", fromMe: false, time: now(20), read: true },
      { id: 2, text: "Checkout is at 11am for the Ridgedale property.", fromMe: true, time: now(18), read: true },
      { id: 3, text: "Got it, thanks!", fromMe: false, time: now(10), read: true },
      { id: 4, text: "I'll be at the property by 9am.", fromMe: false, time: now(3), read: false },
    ],
  },
  {
    id: 2,
    name: "James Carter",
    avatar: "JC",
    lastMessage: "Vacuum bags are running low.",
    lastTime: now(45),
    unread: 1,
    online: false,
    messages: [
      { id: 1, text: "Quick heads up — vacuum bags are running low.", fromMe: false, time: now(60), read: true },
      { id: 2, text: "I'll restock them today.", fromMe: true, time: now(55), read: true },
      { id: 3, text: "Vacuum bags are running low.", fromMe: false, time: now(45), read: false },
    ],
  },
  {
    id: 3,
    name: "Ana Torres",
    avatar: "AT",
    lastMessage: "The Hilltop job is done!",
    lastTime: now(90),
    unread: 0,
    online: true,
    messages: [
      { id: 1, text: "Starting the Hilltop property now.", fromMe: false, time: now(150), read: true },
      { id: 2, text: "Let me know when you're done.", fromMe: true, time: now(145), read: true },
      { id: 3, text: "The Hilltop job is done!", fromMe: false, time: now(90), read: true },
      { id: 4, text: "Awesome, great work!", fromMe: true, time: now(85), read: true },
    ],
  },
  {
    id: 4,
    name: "Team General",
    avatar: "TG",
    lastMessage: "Don't forget the team meeting Friday.",
    lastTime: "Yesterday",
    unread: 0,
    online: false,
    messages: [
      { id: 1, text: "Team reminder: supplies audit this Thursday.", fromMe: true, time: "Yesterday", read: true },
      { id: 2, text: "Got it!", fromMe: false, time: "Yesterday", read: true },
      { id: 3, text: "Don't forget the team meeting Friday.", fromMe: true, time: "Yesterday", read: true },
    ],
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  ML: "bg-pink-500",
  JC: "bg-blue-500",
  AT: "bg-amber-500",
  TG: "bg-purple-500",
};

function Avatar({ initials, size = "md", online }: { initials: string; size?: "sm" | "md"; online?: boolean }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
  const color = AVATAR_COLORS[initials] ?? "bg-gray-500";
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold`}>
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Messenger() {
  const [convos, setConvos] = useState<Conversation[]>(INITIAL_CONVOS);
  const [activeId, setActiveId] = useState<number>(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = convos.find(c => c.id === activeId)!;

  const filtered = convos.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, active?.messages.length]);

  function selectConvo(id: number) {
    setActiveId(id);
    setConvos(prev => prev.map(c =>
      c.id === id ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
    ));
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function sendMessage() {
    if (!draft.trim()) return;
    const msg: Message = {
      id: Date.now(),
      text: draft.trim(),
      fromMe: true,
      time: now(),
      read: false,
    };
    setConvos(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text, lastTime: msg.time }
        : c
    ));
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-border bg-background">
        {/* Header */}
        <div className="px-4 pt-16 pb-3 border-b border-border">
          <h1 className="text-xl font-bold text-foreground mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => selectConvo(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 hover-elevate ${
                c.id === activeId ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
              }`}
              data-testid={`convo-${c.id}`}
            >
              <Avatar initials={c.avatar} size="md" online={c.online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${c.unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                    {c.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">{c.lastTime}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={`text-xs truncate ${c.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {c.lastMessage}
                  </span>
                  {c.unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New conversation button */}
        <div className="p-3 border-t border-border">
          <Button variant="outline" className="w-full" data-testid="button-new-conversation">
            <Plus className="w-4 h-4 mr-2" /> New Conversation
          </Button>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background flex-shrink-0 pt-16">
          <Avatar initials={active.avatar} size="sm" online={active.online} />
          <div>
            <p className="font-semibold text-sm text-foreground">{active.name}</p>
            <p className="text-xs text-muted-foreground">{active.online ? "Online" : "Offline"}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {active.messages.map((msg, i) => {
            const showAvatar = !msg.fromMe && (i === 0 || active.messages[i - 1].fromMe);
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.fromMe ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                {!msg.fromMe && (
                  <div className="w-7 flex-shrink-0">
                    {showAvatar && <Avatar initials={active.avatar} size="sm" />}
                  </div>
                )}
                <div className={`max-w-[68%] ${msg.fromMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.fromMe
                      ? "bg-emerald-500 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-1 px-1 ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {msg.fromMe && (
                      msg.read
                        ? <CheckCheck className="w-3 h-3 text-emerald-500" />
                        : <Check className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background flex-shrink-0">
          <Input
            ref={inputRef}
            placeholder={`Message ${active.name}…`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
