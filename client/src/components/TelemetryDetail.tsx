import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  FolderTree,
  List,
  MemoryStick,
  Search,
  ShieldAlert,
  Skull,
  Terminal,
  X,
} from "lucide-react";
import { TelemetrySection } from "./TelemetrySection";
import { Modal } from "./ui/Modal";
import { fmtSize } from "../utils/telemetryFormat";
import { timeAgo } from "../lib/format";
import { api } from "../lib/api";
import { useAuth, useUi } from "../stores/store";
import type { DetailedProcess, ProcInfo, ServerDetail } from "../lib/types/host";

// Inspection & Termination modal for a single host process
function ProcessDetailModal({
  pid,
  onClose,
  onTerminated,
}: {
  pid: number;
  onClose: () => void;
  onTerminated?: () => void;
}) {
  const { user } = useAuth();
  const { pushToast } = useUi();
  const [data, setData] = useState<DetailedProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [signal, setSignal] = useState<"SIGTERM" | "SIGKILL">("SIGTERM");
  const [killing, setKilling] = useState(false);

  const canKill = user?.role === "admin" || user?.role === "operator";

  useEffect(() => {
    let alive = true;
    api
      .processDetail(pid)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        if (alive) {
          pushToast(`Failed to read process ${pid} details`, true);
          onClose();
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pid, onClose, pushToast]);

  const copyCmd = () => {
    if (!data?.cmdline) return;
    void navigator.clipboard.writeText(data.cmdline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKill = async () => {
    setKilling(true);
    try {
      const res = await api.killProcess(pid, signal);
      pushToast(res.message || `Process ${pid} terminated`);
      onTerminated?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate process";
      pushToast(msg, true);
    } finally {
      setKilling(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      {loading ? (
        <div className="py-8 text-center font-mono text-[12px] text-muted dark:text-fog">
          Inspecting process {pid}…
        </div>
      ) : !data ? (
        <div className="py-8 text-center font-mono text-[12px] text-brick">
          Process {pid} not found
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-line dark:border-edge pb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-accent dark:text-ember shrink-0" />
                <h3 className="text-[16px] font-semibold text-ink dark:text-bone truncate">
                  {data.name}
                </h3>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-paper dark:bg-abyss border border-line dark:border-edge text-muted dark:text-fog">
                  PID {data.pid}
                </span>
              </div>
              <div className="font-mono text-[11px] text-muted dark:text-fog mt-1">
                Owner: <span className="text-ink dark:text-bone font-medium">{data.username || "system"}</span>
                {data.ppid ? ` · Parent PID ${data.ppid}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted dark:text-fog hover:text-ink dark:hover:text-bone p-1 rounded-md"
            >
              <X size={16} />
            </button>
          </div>

          {/* Protected process warning banner */}
          {data.isProtected && (
            <div className="p-3 rounded-lg bg-brick/10 border border-brick/30 text-brick text-[12px] flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>
                <strong>Protected System Process:</strong> This process is critical to host stability or ServerHub itself and cannot be terminated.
              </span>
            </div>
          )}

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-paper/60 dark:bg-abyss/60 border border-line dark:border-edge rounded-lg p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">CPU</div>
              <div className="font-mono text-[13px] font-semibold text-ink dark:text-bone mt-0.5">
                {(data.cpuPercent ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-paper/60 dark:bg-abyss/60 border border-line dark:border-edge rounded-lg p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Memory (RSS)</div>
              <div className="font-mono text-[13px] font-semibold text-ink dark:text-bone mt-0.5">
                {fmtSize(data.memMB)}
              </div>
            </div>
            <div className="bg-paper/60 dark:bg-abyss/60 border border-line dark:border-edge rounded-lg p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Memory %</div>
              <div className="font-mono text-[13px] font-semibold text-ink dark:text-bone mt-0.5">
                {(data.memPct ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-paper/60 dark:bg-abyss/60 border border-line dark:border-edge rounded-lg p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Threads</div>
              <div className="font-mono text-[13px] font-semibold text-ink dark:text-bone mt-0.5">
                {data.numThreads ?? 1}
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 font-mono text-[11.5px]">
            {data.createTime ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Started</span>
                <span className="text-ink dark:text-bone">
                  {new Date(data.createTime).toLocaleString()} ({timeAgo(new Date(data.createTime).toISOString())})
                </span>
              </div>
            ) : null}

            {data.exe && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Executable Path</span>
                <span className="text-ink dark:text-bone break-all bg-paper/60 dark:bg-abyss/60 p-1.5 rounded border border-line dark:border-edge text-[11px]">
                  {data.exe}
                </span>
              </div>
            )}

            {data.cwd && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Working Directory</span>
                <span className="text-ink dark:text-bone break-all bg-paper/60 dark:bg-abyss/60 p-1.5 rounded border border-line dark:border-edge text-[11px]">
                  {data.cwd}
                </span>
              </div>
            )}

            {data.cmdline && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted dark:text-fog">Command Line</span>
                  <button
                    type="button"
                    onClick={copyCmd}
                    className="inline-flex items-center gap-1 text-[10.5px] text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
                  >
                    {copied ? <Check size={11} className="text-moss" /> : <Copy size={11} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-2 bg-paper/80 dark:bg-abyss/80 border border-line dark:border-edge rounded text-[11px] text-ink dark:text-bone whitespace-pre-wrap break-all max-h-28 overflow-y-auto font-mono">
                  {data.cmdline}
                </pre>
              </div>
            )}
          </div>

          {/* Kill / Termination Actions */}
          <div className="border-t border-line dark:border-edge pt-3 mt-1">
            {!canKill ? (
              <div className="text-[11px] text-muted dark:text-fog italic text-center">
                Operator or Administrator role required to terminate processes.
              </div>
            ) : data.isProtected ? (
              <div className="text-[11px] text-muted dark:text-fog italic text-center">
                Termination disabled for protected process.
              </div>
            ) : confirmKill ? (
              <div className="p-3 bg-red-500/10 border border-brick/40 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-brick text-[12px] font-semibold">
                  <AlertTriangle size={15} />
                  <span>Terminate process {data.name} (PID {data.pid})?</span>
                </div>

                <div className="flex items-center gap-2 text-[11.5px] font-mono">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="signal"
                      value="SIGTERM"
                      checked={signal === "SIGTERM"}
                      onChange={() => setSignal("SIGTERM")}
                      className="accent-brick"
                    />
                    <span>SIGTERM (Graceful)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="signal"
                      value="SIGKILL"
                      checked={signal === "SIGKILL"}
                      onChange={() => setSignal("SIGKILL")}
                      className="accent-brick"
                    />
                    <span>SIGKILL (Force)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmKill(false)}
                    disabled={killing}
                    className="px-3 py-1.5 rounded-md text-[11.5px] font-medium border border-line dark:border-edge bg-white dark:bg-panel text-ink dark:text-bone hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleKill}
                    disabled={killing}
                    className="px-3 py-1.5 rounded-md text-[11.5px] font-medium bg-brick text-white hover:bg-brick-deep flex items-center gap-1.5 shadow-xs"
                  >
                    <Skull size={12} />
                    <span>{killing ? "Terminating…" : `Confirm ${signal}`}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-mono text-muted dark:text-fog">
                  Status: <span className="uppercase text-ink dark:text-bone font-medium">{data.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmKill(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium border border-brick/40 text-brick hover:bg-red-500/10 transition-colors"
                >
                  <Skull size={13} />
                  <span>Kill Process</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

type ProcessTreeNode = {
  proc: ProcInfo;
  children: ProcessTreeNode[];
  depth: number;
};

function buildProcessTree(procs: ProcInfo[]): ProcessTreeNode[] {
  const map = new Map<number, ProcessTreeNode>();
  for (const p of procs) {
    map.set(p.pid, { proc: p, children: [], depth: 0 });
  }

  const roots: ProcessTreeNode[] = [];
  for (const p of procs) {
    const node = map.get(p.pid)!;
    if (p.ppid && map.has(p.ppid) && p.ppid !== p.pid) {
      map.get(p.ppid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const setDepths = (nodes: ProcessTreeNode[], d: number) => {
    for (const n of nodes) {
      n.depth = d;
      if (n.children.length > 0) {
        setDepths(n.children, d + 1);
      }
    }
  };
  setDepths(roots, 0);
  return roots;
}

type FlatTreeItem = {
  node: ProcessTreeNode;
  isLast: boolean;
  parentHasNext: boolean[];
};

function flattenTree(
  nodes: ProcessTreeNode[],
  collapsed: Set<number>,
  out: FlatTreeItem[] = [],
  ancestorHasNext: boolean[] = []
): FlatTreeItem[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    out.push({ node, isLast, parentHasNext: ancestorHasNext });
    if (!collapsed.has(node.proc.pid) && node.children.length > 0) {
      flattenTree(node.children, collapsed, out, [...ancestorHasNext, !isLast]);
    }
  }
  return out;
}

// Host process manager section: dense process list, hierarchical process tree,
// top resource consumers, real-time search filter, inspection modal and termination support.
export function TelemetryProcesses({
  detail,
  onRefresh,
}: {
  detail: ServerDetail;
  onRefresh?: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [inspectPid, setInspectPid] = useState<number | null>(null);
  const [collapsedPids, setCollapsedPids] = useState<Set<number>>(new Set());

  // Filtered process list
  const procs = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return detail.processes.top;
    return detail.processes.top.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        String(p.pid).includes(term) ||
        (p.username && p.username.toLowerCase().includes(term))
    );
  }, [detail.processes.top, filter]);

  // Hierarchical process tree
  const treeRoots = useMemo(() => buildProcessTree(procs), [procs]);
  const flatTree = useMemo(
    () => flattenTree(treeRoots, collapsedPids),
    [treeRoots, collapsedPids]
  );

  // Top resource consumers
  const topCpu = useMemo(() => {
    const sorted = [...detail.processes.top].sort(
      (a, b) => (b.cpuPercent ?? 0) - (a.cpuPercent ?? 0)
    );
    return sorted[0]?.cpuPercent ? sorted[0] : null;
  }, [detail.processes.top]);

  const topMem = useMemo(() => {
    const sorted = [...detail.processes.top].sort((a, b) => b.memMB - a.memMB);
    return sorted[0]?.memMB ? sorted[0] : null;
  }, [detail.processes.top]);

  const toggleCollapse = (pid: number) => {
    setCollapsedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5">
      <TelemetrySection
        icon={<Terminal size={14} />}
        title="Active Processes & Process Tree"
        meta={`${detail.processes.total} total on host · ${detail.processes.running} running`}
      >
        {/* Top resource consumer callouts */}
        {(topCpu || topMem) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
            {topCpu && (
              <div className="bg-paper dark:bg-abyss border border-orange-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-orange-500/10 text-orange-500 shrink-0">
                    <Flame size={13} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-fog block leading-tight">
                      Top CPU Consumer
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink dark:text-bone truncate block">
                      {topCpu.name} <span className="text-muted dark:text-fog font-normal">(PID {topCpu.pid})</span>
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-accent dark:text-ember">
                  {topCpu.cpuPercent?.toFixed(1)}%
                </span>
              </div>
            )}

            {topMem && (
              <div className="bg-paper dark:bg-abyss border border-emerald-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 shrink-0">
                    <MemoryStick size={13} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted dark:text-fog block leading-tight">
                      Top Memory Consumer
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink dark:text-bone truncate block">
                      {topMem.name} <span className="text-muted dark:text-fog font-normal">(PID {topMem.pid})</span>
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-moss">
                  {fmtSize(topMem.memMB)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Toolbar: status chips, search input, and view switcher */}
        <div className="flex items-center justify-between gap-3 flex-wrap my-3">
          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
            <span className="inline-flex items-center gap-1 bg-tint dark:bg-emboss border border-line dark:border-edge text-ink dark:text-bone rounded-md px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-moss" />
              {detail.processes.running} running
            </span>
            <span className="inline-flex items-center gap-1 bg-tint dark:bg-emboss border border-line dark:border-edge text-muted dark:text-fog rounded-md px-2 py-0.5">
              {detail.processes.sleeping} sleeping
            </span>
            {detail.processes.zombie > 0 && (
              <span className="inline-flex items-center gap-1 bg-tint dark:bg-emboss border border-brick/40 text-brick rounded-md px-2 py-0.5">
                {detail.processes.zombie} zombie
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time search filter */}
            <div className="relative min-w-[200px]">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted dark:text-fog pointer-events-none"
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name, PID, user…"
                className="w-full pl-7 pr-7 py-1 text-[11px] font-mono bg-paper dark:bg-abyss border border-line dark:border-edge rounded-md text-ink dark:text-bone placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-bone"
                  title="Clear search"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* View Mode Switcher: Table vs Tree */}
            <div className="inline-flex items-center bg-paper dark:bg-abyss border border-line dark:border-edge rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-white dark:bg-panel text-ink dark:text-bone font-semibold shadow-xs"
                    : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
                }`}
                title="Sortable flat process table"
              >
                <List size={12} />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "tree"
                    ? "bg-white dark:bg-panel text-ink dark:text-bone font-semibold shadow-xs"
                    : "text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
                }`}
                title="Hierarchical process tree (PPID parent-child structure)"
              >
                <FolderTree size={12} />
                <span className="hidden sm:inline">Tree</span>
              </button>
            </div>
          </div>
        </div>

        {/* Processes View: Table or Tree */}
        <div className="overflow-x-auto border border-line dark:border-edge rounded-xl">
          <table className="w-full min-w-[560px] sm:min-w-0 border-collapse text-[13px]">
            <thead>
              <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog">
                <th className="text-left px-3.5 py-2">
                  {viewMode === "tree" ? "Process Hierarchy" : "Process"}
                </th>
                <th className="hidden sm:table-cell text-left px-3.5 py-2">PID</th>
                {viewMode === "tree" && (
                  <th className="hidden sm:table-cell text-left px-3.5 py-2">PPID</th>
                )}
                <th className="hidden md:table-cell text-left px-3.5 py-2">User</th>
                <th className="text-left px-3.5 py-2">CPU</th>
                <th className="text-right px-3.5 py-2">Memory</th>
                <th className="text-right px-3.5 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "table" ? (
                procs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3.5 py-6 text-center font-mono text-[12px] text-muted dark:text-fog"
                    >
                      No matching processes found
                    </td>
                  </tr>
                ) : (
                  procs.map((p) => (
                    <tr
                      key={p.pid}
                      className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40 font-mono transition-colors"
                    >
                      <td className="px-3.5 py-2.5 align-middle max-w-[220px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            className="text-left text-ink dark:text-bone font-medium hover:text-accent dark:hover:text-ember truncate hover:underline"
                            title="Click to inspect process details"
                          >
                            {p.name}
                          </button>
                        </div>
                        <div className="sm:hidden text-[10px] text-muted dark:text-fog mt-0.5">
                          PID {p.pid} {p.username ? `· ${p.username}` : ""}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3.5 py-2.5 align-middle text-muted dark:text-fog text-[11px]">
                        {p.pid}
                      </td>
                      <td className="hidden md:table-cell px-3.5 py-2.5 align-middle text-muted dark:text-fog text-[11px] truncate max-w-[100px]">
                        {p.username || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-[12px]">
                        {p.cpuPercent !== undefined && p.cpuPercent > 0 ? (
                          <span className="text-accent dark:text-ember font-semibold inline-flex items-center gap-1">
                            <Flame size={11} className="inline -mt-0.5" />
                            {p.cpuPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted dark:text-fog">0.0%</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-right text-ink dark:text-bone text-[12px]">
                        <div>{fmtSize(p.memMB)}</div>
                        {p.memPct > 0 && (
                          <div className="text-[10px] text-muted dark:text-fog">
                            {p.memPct.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            title="Inspect process details"
                            className="p-1 rounded text-muted dark:text-fog hover:text-ink dark:hover:text-bone hover:bg-paper dark:hover:bg-abyss transition-colors"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            title="Terminate / Kill process"
                            className="p-1 rounded text-muted dark:text-fog hover:text-brick hover:bg-red-500/10 transition-colors"
                          >
                            <Skull size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : flatTree.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3.5 py-6 text-center font-mono text-[12px] text-muted dark:text-fog"
                  >
                    No matching processes in tree
                  </td>
                </tr>
              ) : (
                flatTree.map(({ node, isLast }) => {
                  const p = node.proc;
                  const hasChildren = node.children.length > 0;
                  const isCollapsed = collapsedPids.has(p.pid);
                  return (
                    <tr
                      key={p.pid}
                      className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40 font-mono transition-colors"
                    >
                      <td className="px-3.5 py-2 align-middle max-w-[280px]">
                        <div
                          className="flex items-center gap-1.5 truncate"
                          style={{ paddingLeft: `${node.depth * 18}px` }}
                        >
                          {node.depth > 0 && (
                            <span className="text-muted/60 dark:text-fog/40 select-none text-[11px]">
                              {isLast ? "└─" : "├─"}
                            </span>
                          )}

                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleCollapse(p.pid)}
                              className="p-0.5 rounded hover:bg-paper dark:hover:bg-abyss text-muted dark:text-fog hover:text-ink dark:hover:text-bone"
                              title={isCollapsed ? "Expand subprocesses" : "Collapse subprocesses"}
                            >
                              {isCollapsed ? (
                                <ChevronRight size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>
                          ) : (
                            <span className="w-3 inline-block" />
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            className="text-left text-ink dark:text-bone font-medium hover:text-accent dark:hover:text-ember truncate hover:underline"
                            title="Click to inspect process details"
                          >
                            {p.name}
                          </button>

                          {hasChildren && (
                            <span className="text-[10px] text-muted dark:text-fog font-normal bg-tint dark:bg-emboss px-1.5 py-0.2 rounded border border-line dark:border-edge">
                              {node.children.length} sub
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3.5 py-2 align-middle text-muted dark:text-fog text-[11px]">
                        {p.pid}
                      </td>
                      <td className="hidden sm:table-cell px-3.5 py-2 align-middle text-muted dark:text-fog text-[11px]">
                        {p.ppid ?? "—"}
                      </td>
                      <td className="hidden md:table-cell px-3.5 py-2 align-middle text-muted dark:text-fog text-[11px] truncate max-w-[100px]">
                        {p.username || "—"}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-[12px]">
                        {p.cpuPercent !== undefined && p.cpuPercent > 0 ? (
                          <span className="text-accent dark:text-ember font-semibold inline-flex items-center gap-1">
                            <Flame size={11} className="inline -mt-0.5" />
                            {p.cpuPercent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted dark:text-fog">0.0%</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-right text-ink dark:text-bone text-[12px]">
                        <div>{fmtSize(p.memMB)}</div>
                        {p.memPct > 0 && (
                          <div className="text-[10px] text-muted dark:text-fog">
                            {p.memPct.toFixed(1)}%
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2 align-middle text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            title="Inspect process details"
                            className="p-1 rounded text-muted dark:text-fog hover:text-ink dark:hover:text-bone hover:bg-paper dark:hover:bg-abyss transition-colors"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectPid(p.pid)}
                            title="Terminate / Kill process"
                            className="p-1 rounded text-muted dark:text-fog hover:text-brick hover:bg-red-500/10 transition-colors"
                          >
                            <Skull size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TelemetrySection>

      {/* Process inspection modal */}
      {inspectPid !== null && (
        <ProcessDetailModal
          key={inspectPid}
          pid={inspectPid}
          onClose={() => setInspectPid(null)}
          onTerminated={onRefresh}
        />
      )}
    </div>
  );
}

// Backwards-compatible alias for TelemetryProcesses
export const TelemetryDetail = TelemetryProcesses;
