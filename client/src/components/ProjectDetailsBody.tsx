import { useState } from "react";
import { api } from "../lib/api";
import type { Project } from "../lib/types/projects";
import { useUi } from "../stores/store";
import { ConfirmModal } from "./ui/ConfirmModal";
import { Kicker } from "./ui/Kicker";
import { Page } from "./ui/Page";
import { PageHeader } from "./ui/PageHeader";
import { StatusPill } from "./ui/StatusPill";
import { TerminalModal } from "./TerminalModal";
import { ContainerFileExplorerModal } from "./ContainerFileExplorerModal";
import { EditShipModal } from "./EditShipModal";
// DEPLOY: import { DeployProgress } from "./DeployProgress";
import { useProjectDetails } from "../hooks/useProjectDetails";
import { ProjectHelmActions } from "./ProjectHelmActions";
import { ProjectRigging } from "./ProjectRigging";
import { ProjectStationsTable } from "./ProjectStationsTable";
import { ProjectLiveLogs } from "./ProjectLiveLogs";
// DEPLOY: import { ProjectLaunchLog } from "./ProjectLaunchLog";
import { ProjectVault } from "./ProjectVault";
import { ProjectSnapshots } from "./ProjectSnapshots";
import { ProjectConfirmModals } from "./ProjectConfirmModals";
import { CountUp } from "./ui/CountUp";

// Composed ship manifest: header, helm, rigging, stations, logs, launches,
// vault and snapshots, plus the terminal / progress / edit / delete chrome.
export function ProjectDetailsBody({
  project,
  onBack,
  onChanged,
}: {
  project: Project;
  onBack: () => void;
  onChanged: () => void;
}) {
  const pushToast = useUi((s) => s.pushToast);
  const d = useProjectDetails(project, onChanged);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleDeleteProject = async () => {
    setDeleteBusy(true);
    try {
      await api.deleteProject(project.id);
      pushToast(`Ship "${project.name}" deleted from fleet.`);
      onBack();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Failed to delete ship", true);
    } finally {
      setDeleteBusy(false);
      setConfirmDeleteProject(false);
    }
  };

  return (
    <Page width="default">
      <PageHeader
        className="mb-0"
        back={{ label: "Back", onClick: onBack }}
        kicker="Ship manifest"
        title={project.name}
        status={<StatusPill status={project.status} />}
      />

      {/* Manifest counts moved here from the summary drawer */}
      <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-5 mt-5">
        <Kicker>Manifest</Kicker>
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ["Stations", d.services.length],
            // DEPLOY: launches are hidden while deploy surfaces are paused.
            // ["Launches", d.deployments.length],
            ["Secrets sealed", d.secrets.length],
            ["Snapshots", d.backups.length],
          ] as Array<[string, number]>).map(([k, v]) => (
            <div
              key={k}
              className="bg-paper dark:bg-abyss border border-line dark:border-edge rounded-xl px-4 py-3"
            >
              <CountUp
                value={v}
                className="font-head text-[22px] font-bold text-ink dark:text-bone"
              />
              <div className="text-muted dark:text-fog text-xs mt-0.5">{k}</div>
            </div>
          ))}
        </div>
      </div>

      <ProjectHelmActions
        d={d}
        onEdit={() => setShowEdit(true)}
        onDelete={() => setConfirmDeleteProject(true)}
      />
      <ProjectRigging project={project} />
      <ProjectStationsTable d={d} />
      <ProjectLiveLogs d={d} />
      {/* DEPLOY: launch history hidden while deploy surfaces are paused.
      <ProjectLaunchLog d={d} />
      */}
      <ProjectVault d={d} />
      <ProjectSnapshots d={d} />

      {d.showTerminal && (
        <TerminalModal
          projectName={project.name}
          services={d.services}
          onClose={() => d.setShowTerminal(false)}
        />
      )}

      {d.showFiles && (
        <ContainerFileExplorerModal
          projectName={project.name}
          services={d.services}
          onClose={() => d.setShowFiles(false)}
        />
      )}

      {/* DEPLOY: deployment progress hidden while deploy surfaces are paused.
      {d.progress && (
        <DeployProgress
          projectName={project.name}
          operationId={d.progress.id}
          onClose={() => d.setProgress(null)}
          onDone={() => {
            onChanged();
            void d.refreshLists();
          }}
        />
      )}
      */}

      <ProjectConfirmModals d={d} projectName={project.name} />

      {showEdit && (
        <EditShipModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(saved) => {
            setShowEdit(false);
            pushToast(`Ship "${saved.name}" refitted.`);
            onChanged();
          }}
        />
      )}
      {confirmDeleteProject && (
        <ConfirmModal
          title={`Delete ship "${project.name}"?`}
          body="This will remove the project registration from the fleet registry. Any running containers and project files on disk are preserved."
          confirmLabel={deleteBusy ? "Deleting…" : "Delete ship"}
          busy={deleteBusy}
          onClose={() => setConfirmDeleteProject(false)}
          onConfirm={() => void handleDeleteProject()}
        />
      )}
    </Page>
  );
}
