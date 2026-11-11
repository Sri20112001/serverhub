import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Command,
  Copy,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  SquareTerminal,
  X,
} from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { absoluteApiBase, api } from "../lib/api";
import type { Service } from "../lib/types/projects";
import { ConfirmModal } from "./ui/ConfirmModal";
import { Field } from "./ui/Field";
import { Kicker } from "./ui/Kicker";

function wsBase(): string {
  return absoluteApiBase().replace(/^http/, "ws");
}

type CommandPreset = {
  label: string;
  cmd: string;
  category: "system" | "network" | "files";
  hint: string;
};

const PRESETS: CommandPreset[] = [
  { label: "ps aux", cmd: "ps aux", category: "system", hint: "List container processes" },
  { label: "df -h", cmd: "df -h", category: "system", hint: "Container disk space" },
  { label: "free -m", cmd: "free -m || cat /proc/meminfo | head -n 5", category: "system", hint: "Memory usage" },
  { label: "top (snapshot)", cmd: "top -b -n 1 | head -n 20", category: "system", hint: "Top CPU/RAM processes" },
  { label: "env", cmd: "env | sort", category: "network", hint: "Environment variables" },
  { label: "open ports", cmd: "netstat -tlpn 2>/dev/null || ss -tlpn 2>/dev/null", category: "network", hint: "Listening network ports" },
  { label: "os-release", cmd: "cat /etc/os-release 2>/dev/null || uname -a", category: "network", hint: "Container OS distro & kernel" },
  { label: "ls -la", cmd: "ls -la", category: "files", hint: "List files with details" },
  { label: "pwd & id", cmd: "pwd && id", category: "files", hint: "Working dir and active user" },
];

export function TerminalModal({
  projectName,
  services,
  initialContainer,
  onClose,
}: {
  projectName: string;
  services: Service[];
  initialContainer?: string;
  onClose: () => void;
}) {
  const candidates = services.filter((s) => s.containerName);
  const [container, setContainer] = useState(
    initialContainer ?? candidates[0]?.containerName ?? "",
  );
  const [shell, setShell] = useState("/bin/sh");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [customCmd, setCustomCmd] = useState("");
  const [showPalette, setShowPalette] = useState(true);
  const [copied, setCopied] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const sendCommand = (cmd: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(`${cmd}\r`);
      termRef.current?.focus();
    }
  };

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customCmd.trim()) return;
    sendCommand(customCmd.trim());
    setCustomCmd("");
  };

  const clearTerminal = () => {
    sendCommand("clear");
  };

  const copyBuffer = () => {
    const term = termRef.current;
    if (!term) return;
    term.selectAll();
    const sel = term.getSelection();
    term.clearSelection();
    if (sel) {
      void navigator.clipboard.writeText(sel).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  useEffect(() => {
    if (!confirmed || !container) return;
    const box = boxRef.current;
    if (!box) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: "#171512",
        foreground: "#EDE8E4",
        cursor: "#EA580C",
        selectionBackground: "rgba(234, 88, 12, 0.35)",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(box);
    termRef.current = term;
    setStatus("connecting");
    setError(null);

    let ws: WebSocket | null = null;
    let alive = true;

    (async () => {
      try {
        const grant = await api.execToken(container, shell);
        if (!alive) return;
        try {
          fit.fit();
        } catch {
          /* sized on first frame */
        }
        const dims = fit.proposeDimensions();
        ws = new WebSocket(`${wsBase()}/server-hub/api/exec/${grant.token}`);
        wsRef.current = ws;
        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
          if (!alive) return;
          setStatus("connected");
          if (dims) ws?.send(JSON.stringify({ cols: dims.cols, rows: dims.rows }));
          term.focus();
        };
        ws.onmessage = (ev) => {
          if (!alive) return;
          const data = ev.data as string | ArrayBuffer;
          if (typeof data === "string") {
            term.write(data);
          } else {
            new Blob([data]).text().then((t) => {
              if (alive) term.write(t);
            });
          }
        };
        const end = () => {
          if (!alive) return;
          setStatus("ended");
          term.write("\r\n\x1b[33m[session ended]\x1b[0m\r\n");
        };
        ws.onclose = end;
        ws.onerror = () => {
          if (!alive) return;
          setError("Socket error — the session dropped.");
        };
        term.onData((chunk) => {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send(chunk);
        });
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not open terminal");
        setStatus("ended");
      }
    })();

    const onResize = () => {
      try {
        fit.fit();
        const dims = fit.proposeDimensions();
        if (dims && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ cols: dims.cols, rows: dims.rows }));
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      window.removeEventListener("resize", onResize);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      term.dispose();
      termRef.current = null;
    };
  }, [confirmed, container, shell]);

  if (!confirmed) {
    return (
      <ConfirmModal
        title={`Open a shell in ${container || "this station"}?`}
        body="This opens an interactive shell INSIDE the container via Docker exec. It never touches the host shell. The session is audit-logged as a high-risk operation."
        confirmLabel="Open terminal"
        onClose={onClose}
        onConfirm={() => setConfirmed(true)}
      />
    );
  }

  const selectCls =
    "bg-white dark:bg-panel border border-line dark:border-edge rounded-input font-body text-[12px] text-ink dark:text-bone px-2 py-1.5 outline-none focus:border-accent dark:focus:border-ember cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4 bg-[rgba(28,25,23,0.28)] dark:bg-[rgba(0,0,0,0.55)] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-panel border border-line dark:border-edge rounded-t-2xl sm:rounded-card w-full sm:max-w-[920px] p-4 sm:p-5 shadow-chrome max-h-[95dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-2 min-[480px]:justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SquareTerminal size={17} className="text-accent dark:text-ember" />
            <h3 className="text-[17px] font-semibold text-ink dark:text-bone">
              {projectName} / {container || "terminal"}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full font-mono text-[11px] border whitespace-nowrap ${
                status === "connected"
                  ? "bg-moss/10 border-moss/30 text-moss"
                  : "bg-paper dark:bg-abyss border-line dark:border-edge text-muted dark:text-fog"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "connected" ? "bg-moss animate-pulse" : "bg-stone"
                }`}
              />
              {status}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {candidates.length > 1 && (
              <select
                className={selectCls}
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                aria-label="Station"
              >
                {candidates.map((s) => (
                  <option key={s.id} value={s.containerName}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-input border border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone hover:bg-paper dark:hover:bg-abyss transition-colors"
              onClick={onClose}
              aria-label="Close terminal"
              title="Close terminal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Sub-toolbar: Shell selector, Palette toggle, Clear & Copy */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Field label="Shell">
              <select
                className={selectCls}
                value={shell}
                onChange={(e) => setShell(e.target.value)}
                aria-label="Shell"
              >
                <option value="/bin/sh">/bin/sh</option>
                <option value="/bin/bash">/bin/bash</option>
              </select>
            </Field>

            <button
              type="button"
              onClick={() => setShowPalette(!showPalette)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-input text-xs font-medium border transition-colors ${
                showPalette
                  ? "bg-accent/10 dark:bg-ember/15 border-accent dark:border-ember text-accent dark:text-ember font-semibold"
                  : "bg-paper dark:bg-abyss border-line dark:border-edge text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
              }`}
            >
              <Command size={12} />
              <span>Quick Exec</span>
              {showPalette ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={clearTerminal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-input text-xs font-mono text-muted dark:text-fog hover:text-ink dark:hover:text-bone bg-paper dark:bg-abyss border border-line dark:border-edge transition-colors"
              title="Clear terminal screen"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              type="button"
              onClick={copyBuffer}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-input text-xs font-mono text-muted dark:text-fog hover:text-ink dark:hover:text-bone bg-paper dark:bg-abyss border border-line dark:border-edge transition-colors"
              title="Copy terminal contents"
            >
              {copied ? <Check size={12} className="text-moss" /> : <Copy size={12} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Quick Exec Command Palette Drawer */}
        {showPalette && (
          <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-fog flex items-center gap-1.5">
                <Sparkles size={12} className="text-accent dark:text-ember" />
                Quick Commands (click to run)
              </span>
              <span className="font-mono text-[10.5px] text-muted dark:text-fog">
                dispatches directly into container pty
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.cmd}
                  type="button"
                  disabled={status !== "connected"}
                  onClick={() => sendCommand(p.cmd)}
                  title={p.hint}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-[11px] bg-white dark:bg-panel border border-line dark:border-edge text-ink dark:text-bone hover:border-accent dark:hover:border-ember hover:text-accent dark:hover:text-ember transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  <Play size={9} className="opacity-70" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Custom command runner */}
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={customCmd}
                onChange={(e) => setCustomCmd(e.target.value)}
                placeholder="Type custom command to send (e.g. cat app.log, grep -i error)..."
                disabled={status !== "connected"}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-panel border border-line dark:border-edge rounded-md text-ink dark:text-bone placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={status !== "connected" || !customCmd.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent dark:bg-ember text-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Send size={11} />
                <span>Run</span>
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 rounded-input px-3 py-2 text-[12.5px] mb-2.5">
            {error}
          </div>
        )}

        {/* Terminal screen container */}
        <div
          ref={boxRef}
          className="rounded-xl overflow-hidden border border-line dark:border-edge h-[50dvh] min-h-[280px] max-h-[440px] p-2 bg-[#171512] shadow-inner"
        />

        <div className="mt-2 flex items-center justify-between text-muted dark:text-fog text-[11px]">
          <Kicker>PTY · docker exec · single-use token · audit-logged</Kicker>
          <span className="font-mono text-[10.5px]">press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
