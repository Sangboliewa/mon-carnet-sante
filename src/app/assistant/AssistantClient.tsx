"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTION_GROUPS = [
  {
    label: "Comprendre mes résultats",
    icon: "🔬",
    items: [
      "Mes résultats montrent CRP élevée, c'est grave ?",
      "Qu'est-ce que l'hémoglobine A1c ?",
      "Mon taux de créatinine est à 120 µmol/L, est-ce normal ?",
    ],
  },
  {
    label: "Médicaments",
    icon: "💊",
    items: [
      "À quoi sert le Coartem ?",
      "Puis-je prendre du paracétamol avec de l'ibuprofène ?",
      "Comment prendre l'amoxicilline correctement ?",
    ],
  },
  {
    label: "Maladies fréquentes",
    icon: "🏥",
    items: [
      "Comment prévenir le paludisme ?",
      "Qu'est-ce que la drépanocytose ?",
      "Qu'est-ce que P. falciparum ?",
    ],
  },
];

interface Props {
  personId: string;
  personName: string;
}

// Simple markdown renderer
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1 my-2 pl-1">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  }

  function renderInline(line: string): React.ReactNode {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={i} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>;
      }
      // Italic: *text*
      const italicParts = p.split(/(\*[^*]+\*)/g);
      return italicParts.map((ip, j) => {
        if (ip.startsWith("*") && ip.endsWith("*") && ip.length > 2) {
          return <em key={j}>{ip.slice(1, -1)}</em>;
        }
        return ip;
      });
    });
  }

  for (const line of lines) {
    // Heading ## or ###
    if (line.startsWith("### ")) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 text-sm mt-3 mb-1">{line.slice(4)}</p>);
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 mt-3 mb-1">{line.slice(3)}</p>);
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 text-base mt-2 mb-1">{line.slice(2)}</p>);
      continue;
    }
    // List item: - or * or •
    const listMatch = line.match(/^[-*•]\s+(.+)/);
    if (listMatch) {
      inList = true;
      listItems.push(
        <li key={key++} className="flex gap-2 text-sm text-gray-800">
          <span className="text-blue-400 mt-0.5 shrink-0">▸</span>
          <span>{renderInline(listMatch[1])}</span>
        </li>
      );
      continue;
    }
    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      inList = true;
      listItems.push(
        <li key={key++} className="flex gap-2 text-sm text-gray-800">
          <span className="text-blue-400 font-semibold shrink-0">{line.match(/^\d+/)?.[0]}.</span>
          <span>{renderInline(numMatch[1])}</span>
        </li>
      );
      continue;
    }
    // Empty line
    if (line.trim() === "") {
      flushList();
      elements.push(<div key={key++} className="h-1" />);
      continue;
    }
    // Normal paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-sm text-gray-800 leading-relaxed">{renderInline(line)}</p>
    );
  }
  flushList();
  return <div className="space-y-0.5">{elements}</div>;
}

export default function AssistantClient({ personId, personName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, personId }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const reply = json.reply ?? "Je n'ai pas pu générer une réponse.";
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: reply };
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Désolée, une erreur s'est produite. Réessaie dans quelques secondes." };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-4">
            {/* Welcome card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🤖</div>
                <div>
                  <p className="font-bold text-white text-base">Bonjour {personName} 👋</p>
                  <p className="text-blue-200 text-xs">By' — Assistante Santé IA</p>
                </div>
              </div>
              <p className="text-blue-100 text-sm leading-relaxed">
                Je peux t&apos;aider à comprendre tes examens, tes médicaments ou répondre à tes questions de santé en français.
              </p>
              <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 text-xs text-blue-200">
                ⚕️ Outil éducatif uniquement — consulte toujours un médecin
              </div>
            </div>

            {/* Suggestion groups */}
            <div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SUGGESTION_GROUPS.map((g, i) => (
                  <button key={i} onClick={() => setActiveGroup(i)}
                    className={"flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors " + (activeGroup === i ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}>
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {SUGGESTION_GROUPS[activeGroup].items.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className="w-full text-left text-sm bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-700 active:bg-blue-50 active:border-blue-300 transition-colors flex items-center justify-between gap-2">
                    <span>{s}</span>
                    <span className="text-gray-300 shrink-0">›</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, i) => (
          <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start") + " gap-2"}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm shrink-0 mt-0.5">🤖</div>
            )}
            <div className={"max-w-[88%] rounded-2xl px-4 py-3 " + (
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-sm text-sm leading-relaxed"
                : "bg-white border border-gray-100 rounded-bl-sm shadow-sm"
            )}>
              {msg.role === "assistant" && msg.content === "" ? (
                <span className="flex gap-1 items-center py-0.5">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : msg.role === "assistant" ? (
                <MarkdownText text={msg.content} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Pose ta question à By'…"
            disabled={loading}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 max-h-32 bg-gray-50"
            style={{ lineHeight: "1.4" }}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 shrink-0 active:scale-95 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-xs text-center text-gray-400 mt-2">
          By' ne remplace pas un médecin · Urgences : <span className="font-semibold text-red-500">185</span>
        </p>
      </div>
    </div>
  );
}
