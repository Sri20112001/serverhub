import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Download,
  File,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FolderTree,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import type { ContainerFileEntry, ContainerFileReadResult } from "../lib/api/operations";
import type { Service } from "../lib/types/projects";
import { useUi } from "../stores/store";

function fmtFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder size={15} className="text-amber-500 fill-amber-500/20" />;
  const ext = name.split(".").pop()?.toLowerCase();
  if (["js", "ts", "jsx", "tsx", "py", "go", "json", "yaml", "yml", "sh", "sql", "html", "css"].includes(ext ?? "")) {
    return <FileCode size={15} className="text-accent dark:text-ember" />;
  }
  if (["txt", "md", "log", "conf", "cfg", "env", "ini"].includes(ext ?? "")) {
    return <FileText size={15} className="text-cyan-500" />;
  }
  return <File size={15} className="text-muted dark:text-fog" />;
}

export function ContainerFileExplorerModal({
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
  const { pushToast } = useUi();
  const candidates = services.filter((s) => s.containerName);
  const [container, setContainer] = useState(
    initialContainer ?? candidates[0]?.containerName ?? ""
  );

  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<ContainerFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // File Preview State
  const [viewingFile, setViewingFile] = useState<ContainerFileReadResult | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!container) return;

    api
      .containerFiles(container, currentPath)
      .then((res) => {
        if (alive) {
          setEntries(res.entries);
          setCurrentPath(res.path);
          setError(null);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : "Failed to load directory");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [container, currentPath]);

  const handleNavigate = (path: string) => {
    setLoading(true);
    setFilter("");
    setError(null);
    setCurrentPath(path);
  };

  const handleParent = () => {
    if (currentPath === "/" || currentPath === "") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parent = "/" + parts.join("/");
    handleNavigate(parent);
  };

  const handleFileClick = (entry: ContainerFileEntry) => {
    if (entry.isDir) {
      handleNavigate(entry.path);
    } else {
      // Preview file
      setFileLoading(true);
      api
        .containerReadFile(container, entry.path)
        .then((res) => {
          setViewingFile(res);
        })
        .catch((err) => {
          pushToast(err instanceof Error ? err.message : "Failed to read file", true);
        })
        .finally(() => {
          setFileLoading(false);
        });
    }
  };

  const handleCopyFileContent = () => {
    if (!viewingFile?.content) return;
    void navigator.clipboard.writeText(viewingFile.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadFile = () => {
    if (!viewingFile) return;
    const blob = new Blob([viewingFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = viewingFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  const filteredEntries = entries.filter((e) =>
    filter ? e.name.toLowerCase().includes(filter.toLowerCase()) : true
  );

  const selectCls =
    "bg-white dark:bg-panel border border-line dark:border-edge rounded-input font-body text-[12px] text-ink dark:text-bone px-2 py-1.5 outline-none focus:border-accent dark:focus:border-ember cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4 bg-[rgba(28,25,23,0.28)] dark:bg-[rgba(0,0,0,0.55)] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-panel border border-line dark:border-edge rounded-t-2xl sm:rounded-card w-full sm:max-w-[960px] p-4 sm:p-5 shadow-chrome max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center gap-2 min-[480px]:justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FolderTree size={18} className="text-accent dark:text-ember" />
            <h3 className="text-[17px] font-semibold text-ink dark:text-bone">
              {projectName} / File Explorer
            </h3>
            <span className="font-mono text-[11px] text-muted dark:text-fog bg-tint dark:bg-emboss px-2 py-0.5 rounded border border-line dark:border-edge">
              {container}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {candidates.length > 1 && (
              <select
                className={selectCls}
                value={container}
                onChange={(e) => {
                  setContainer(e.target.value);
                  setLoading(true);
                }}
                aria-label="Station container"
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
              aria-label="Close explorer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Path Navigation & Breadcrumbs Bar */}
        <div className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            <button
              type="button"
              disabled={currentPath === "/"}
              onClick={handleParent}
              className="p-1 rounded text-muted dark:text-fog hover:text-ink dark:hover:text-bone disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-panel transition-colors"
              title="Go to parent directory"
            >
              <ArrowUp size={14} />
            </button>

            {/* Breadcrumb pills */}
            <div className="flex items-center gap-1 flex-wrap font-mono text-xs">
              <button
                type="button"
                onClick={() => handleNavigate("/")}
                className="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-panel text-ink dark:text-bone font-bold"
              >
                /
              </button>
              {breadcrumbs.map((seg, idx) => {
                const segPath = "/" + breadcrumbs.slice(0, idx + 1).join("/");
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <div key={segPath} className="flex items-center gap-1">
                    <ChevronRight size={11} className="text-muted/60" />
                    <button
                      type="button"
                      onClick={() => handleNavigate(segPath)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        isLast
                          ? "font-bold text-accent dark:text-ember bg-white dark:bg-panel shadow-2xs"
                          : "text-ink dark:text-bone hover:bg-white dark:hover:bg-panel"
                      }`}
                    >
                      {seg}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleNavigate(currentPath)}
              className="p-1.5 rounded-md text-muted dark:text-fog hover:text-ink dark:hover:text-bone bg-white dark:bg-panel border border-line dark:border-edge transition-colors shadow-2xs"
              title="Refresh current directory"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="relative min-w-[140px] sm:min-w-[180px]">
              <Search
                size={11}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted dark:text-fog pointer-events-none"
              />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter files..."
                className="w-full pl-7 pr-2.5 py-1 text-[11px] font-mono bg-white dark:bg-panel border border-line dark:border-edge rounded-md text-ink dark:text-bone placeholder:text-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {viewingFile ? (
          // File Preview Mode
          <div className="flex-1 flex flex-col min-h-0 border border-line dark:border-edge rounded-xl bg-paper dark:bg-abyss p-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line dark:border-edge shrink-0 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewingFile(null)}
                  className="p-1 rounded-md text-muted hover:text-ink dark:hover:text-bone bg-white dark:bg-panel border border-line dark:border-edge transition-colors"
                  title="Back to file listing"
                >
                  <ArrowLeft size={13} />
                </button>
                <div className="min-w-0">
                  <div className="font-mono text-xs font-bold text-ink dark:text-bone truncate">
                    {viewingFile.name}
                  </div>
                  <div className="font-mono text-[10.5px] text-muted dark:text-fog truncate">
                    {viewingFile.path} · {fmtFileSize(viewingFile.size)} {viewingFile.truncated && "(truncated)"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyFileContent}
                  disabled={!viewingFile.isText}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-white dark:bg-panel border border-line dark:border-edge text-ink dark:text-bone hover:border-accent transition-colors shadow-2xs disabled:opacity-40"
                >
                  {copied ? <Check size={12} className="text-moss" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-accent dark:bg-ember text-white dark:text-black font-semibold hover:opacity-90 transition-opacity shadow-2xs"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto mt-2 rounded-lg bg-[#171512] p-3 text-stone-200 font-mono text-[11.5px] leading-relaxed shadow-inner">
              {viewingFile.isText ? (
                <pre className="whitespace-pre overflow-x-auto selection:bg-orange-600/40">
                  {viewingFile.content || "(empty file)"}
                </pre>
              ) : (
                <div className="p-8 text-center text-muted">
                  <File size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-sm">Binary File</p>
                  <p className="text-xs text-muted/70 mt-1">This file cannot be previewed as text. Use the download button above.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Directory Listing Mode
          <div className="flex-1 overflow-auto border border-line dark:border-edge rounded-xl min-h-[300px]">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted dark:text-fog font-mono text-xs">
                <Loader2 size={20} className="animate-spin text-accent dark:text-ember" />
                <span>Reading container filesystem...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-brick font-mono text-xs">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => handleNavigate("/")}
                  className="mt-3 px-3 py-1 rounded bg-paper dark:bg-abyss border border-line dark:border-edge text-ink dark:text-bone hover:underline"
                >
                  Go to root /
                </button>
              </div>
            ) : (
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-wider uppercase text-muted dark:text-fog border-b border-line dark:border-edge sticky top-0">
                    <th className="text-left px-3.5 py-2">Name</th>
                    <th className="text-right px-3.5 py-2">Size</th>
                    <th className="hidden sm:table-cell text-left px-3.5 py-2">Permissions</th>
                    <th className="hidden md:table-cell text-left px-3.5 py-2">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPath !== "/" && (
                    <tr
                      onClick={handleParent}
                      className="border-b border-line/60 dark:border-edge/60 hover:bg-paper/50 dark:hover:bg-emboss/40 cursor-pointer"
                    >
                      <td colSpan={4} className="px-3.5 py-2 text-muted dark:text-fog flex items-center gap-2 font-bold">
                        <FolderOpen size={14} className="text-amber-500" />
                        <span>.. (parent directory)</span>
                      </td>
                    </tr>
                  )}

                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3.5 py-8 text-center text-muted dark:text-fog">
                        Directory is empty
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => (
                      <tr
                        key={e.path}
                        onClick={() => handleFileClick(e)}
                        className="group border-b border-line/60 dark:border-edge/60 hover:bg-paper/50 dark:hover:bg-emboss/40 cursor-pointer transition-colors"
                      >
                        <td className="px-3.5 py-2 align-middle">
                          <div className="flex items-center gap-2 truncate max-w-[280px] sm:max-w-[420px]">
                            {getFileIcon(e.name, e.isDir)}
                            <span
                              className={`truncate ${
                                e.isDir
                                  ? "font-bold text-ink dark:text-bone group-hover:text-accent dark:group-hover:text-ember"
                                  : "text-ink/90 dark:text-bone/90"
                              }`}
                            >
                              {e.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2 align-middle text-right text-muted dark:text-fog">
                          {e.isDir ? "—" : fmtFileSize(e.size)}
                        </td>
                        <td className="hidden sm:table-cell px-3.5 py-2 align-middle text-muted dark:text-fog text-[11px]">
                          {e.mode}
                        </td>
                        <td className="hidden md:table-cell px-3.5 py-2 align-middle text-muted dark:text-fog text-[11px]">
                          {e.modTime}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-2.5 flex items-center justify-between text-muted dark:text-fog text-[11px] shrink-0 font-mono">
          <span>Click any directory to navigate, click a file to preview</span>
          {fileLoading && (
            <span className="flex items-center gap-1 text-accent dark:text-ember">
              <Loader2 size={12} className="animate-spin" /> Loading file...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
