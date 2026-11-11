import { FolderTree, Pencil, Play, Power, RotateCcw, Terminal, Trash2 } from "lucide-react";
// DEPLOY: Rocket icon only used by the paused "Ship it" action.
// import { Rocket } from "lucide-react";
import { Kicker } from "./ui/Kicker";
import type { ProjectDetails } from "../hooks/useProjectDetails";

// Helm card: lifecycle actions (ship it, wake, nap, fresh start), the shell
// shortcut, plus edit / delete ship.
export function ProjectHelmActions({
  d,
  onEdit,
  onDelete,
}: {
  d: ProjectDetails;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5 mt-5">
      <Kicker>Helm</Kicker>
      <div className="grid grid-cols-2 gap-2 mt-2.5 sm:flex sm:items-center sm:flex-wrap">
        {/* DEPLOY: "Ship it" launches a deployment — paused for now.
        <button
          className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-accent dark:bg-ember text-white dark:text-black hover:bg-accent-hover dark:hover:bg-ember-hover px-3 py-1.5 text-xs"
          disabled={d.busy}
          onClick={() => void d.shipIt()}
        >
          <Rocket size={13} /> Ship it
        </button>
        */}
        <button className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs" disabled={d.busy} onClick={() => void d.runLifecycle("start")}>
          <Play size={13} /> Wake up
        </button>
        <button className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs" disabled={d.busy} onClick={() => d.setPending("stop")}>
          <Power size={13} /> Nap
        </button>
        <button className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs" disabled={d.busy} onClick={() => d.setPending("restart")}>
          <RotateCcw size={13} /> Fresh start
        </button>
        <button className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs" disabled={d.busy || d.services.filter((s) => s.containerName).length === 0} onClick={() => d.setShowTerminal(true)} title="Open an interactive shell in a station container">
          <Terminal size={13} /> Terminal
        </button>
        <button className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs" disabled={d.busy || d.services.filter((s) => s.containerName).length === 0} onClick={() => d.setShowFiles(true)} title="Browse container filesystem and view/download files">
          <FolderTree size={13} /> Files
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-input text-[13px] font-medium px-4 py-2 cursor-pointer border border-transparent whitespace-nowrap transition-colors duration-150 disabled:opacity-55 disabled:cursor-not-allowed bg-white dark:bg-panel border-line dark:border-edge text-ink dark:text-bone hover:bg-paper dark:hover:bg-emboss px-3 py-1.5 text-xs ml-auto"
          disabled={d.busy}
          onClick={onEdit}
        >
          <Pencil size={13} /> Edit ship
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-input text-[13px] font-medium cursor-pointer border border-brick/40 text-brick hover:bg-brick hover:text-white transition-colors px-3 py-1.5 text-xs"
          disabled={d.busy}
          onClick={onDelete}
        >
          <Trash2 size={13} /> Delete ship
        </button>
      </div>
    </div>
  );
}
