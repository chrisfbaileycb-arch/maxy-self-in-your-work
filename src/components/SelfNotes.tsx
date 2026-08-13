import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Mic, StickyNote, X } from "lucide-react";
import { toast } from "sonner";

import {
  addSelfNote,
  clearDoneSelfNotes,
  deleteSelfNote,
  listSelfNotes,
  toggleSelfNote,
} from "@/lib/notes.functions";
import { safeArray } from "@/lib/defensive";
import type { NoteRow, SelfNotesProps } from "@/types";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: SpeechRecognitionResult;
    length: number;
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechConstructor = new () => SpeechRecognitionInstance;

function getRecognizerConstructor(): SpeechConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function SelfNotes({ autoMic = false, className = "" }: SelfNotesProps) {
  const runList = useServerFn(listSelfNotes);
  const runAdd = useServerFn(addSelfNote);
  const runToggle = useServerFn(toggleSelfNote);
  const runDelete = useServerFn(deleteSelfNote);
  const runClearDone = useServerFn(clearDoneSelfNotes);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const micSupported = typeof window !== "undefined" && getRecognizerConstructor() !== null;

  useEffect(() => {
    runList()
      .then((rows) => setNotes(safeArray<NoteRow>(rows)))
      .catch(() => setNotes([]));
  }, [runList]);

  async function submit(text: string) {
    const body = text.trim();
    if (!body) return;
    setDraft("");
    try {
      const row = (await runAdd({ data: { body } })) as NoteRow;
      if (row && row.id) {
        setNotes((prev) => [row, ...prev]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save note");
      setDraft(body);
    }
  }

  function startMic() {
    const SpeechCtor = getRecognizerConstructor();
    if (!SpeechCtor) {
      toast.info("Voice input isn't supported here — type it instead.");
      inputRef.current?.focus();
      return;
    }
    const rec = new SpeechCtor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript ?? "";
      }
      setDraft(text);
      if (event.results[event.results.length - 1]?.isFinal) void submit(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stopMic() {
    recRef.current?.stop();
    setListening(false);
  }

  useEffect(() => {
    if (autoMic && micSupported) startMic();
    else if (autoMic) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMic]);

  async function toggle(note: Note) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, done: !n.done } : n)));
    try {
      await runToggle({ data: { id: note.id, done: !note.done } });
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, done: note.done } : n)));
    }
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await runDelete({ data: { id } });
    } catch {
      /* refresh on next load */
    }
  }

  const open = notes.filter((n) => !n.done);
  const done = notes.filter((n) => n.done);

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <StickyNote className="h-4 w-4" />
          Notes to self
          {open.length > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium">
              {open.length}
            </span>
          )}
        </h2>
        <span className="text-xs text-muted-foreground">Never sorted, never exported</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder={listening ? "Listening…" : "Quick reminder…"}
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={listening ? stopMic : startMic}
          aria-label={listening ? "Stop listening" : "Dictate a note"}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-input ${listening ? "bg-primary text-primary-foreground animate-pulse" : "bg-background hover:bg-accent"}`}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:brightness-105"
        >
          Add
        </button>
      </form>

      {(open.length > 0 || done.length > 0) && (
        <ul className="mt-2 space-y-1">
          {[...open, ...done].map((n) => (
            <li key={n.id} className="group flex items-center gap-2 text-sm">
              <button
                onClick={() => void toggle(n)}
                aria-label={n.done ? "Mark as not done" : "Mark as done"}
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${n.done ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}
              >
                {n.done && <Check className="h-3 w-3" />}
              </button>
              <span className={n.done ? "line-through text-muted-foreground" : ""}>{n.body}</span>
              <button
                onClick={() => void remove(n.id)}
                aria-label="Delete note"
                className="ml-auto opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <button
          onClick={async () => {
            await runClearDone();
            setNotes((prev) => prev.filter((n) => !n.done));
          }}
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear {done.length} done
        </button>
      )}
    </section>
  );
}
