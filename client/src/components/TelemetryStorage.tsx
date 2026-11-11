import { Boxes, FolderTree, HardDrive } from "lucide-react";
import { Meter, SpecGrid, SpecRow, TelemetrySection } from "./TelemetrySection";
import { DriveBadge } from "./ui/DriveBadge";
import { fmtGB, fmtSize } from "../utils/telemetryFormat";
import type { StorageInfo } from "../lib/types/host";

// Storage section: filesystem table with NVMe/SSD/HDD indicators, per-application footprint bars
// and the Docker image/volume/cache breakdown in a dense, space-efficient layout.
export function TelemetryStorage({ storage }: { storage: StorageInfo }) {
  const totalDiskGB = storage.filesystems.reduce((acc, f) => acc + f.totalGB, 0);
  const usedDiskGB = storage.filesystems.reduce((acc, f) => acc + f.usedGB, 0);
  const avgUsedPct = totalDiskGB > 0 ? (usedDiskGB / totalDiskGB) * 100 : 0;

  return (
    <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5">
      <TelemetrySection
        icon={<HardDrive size={14} />}
        title="Storage & Volumes"
        meta={`${fmtGB(usedDiskGB)} / ${fmtGB(totalDiskGB)} (${avgUsedPct.toFixed(0)}% pooled)`}
      >
        <div className="overflow-x-auto border border-line dark:border-edge rounded-xl my-3">
          <table className="w-full min-w-[500px] sm:min-w-0 border-collapse text-[13px]">
            <thead>
              <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog">
                <th className="text-left px-3.5 py-2">Mount & Device</th>
                <th className="text-left px-3.5 py-2">Type</th>
                <th className="text-left px-3.5 py-2">Allocation</th>
                <th className="text-right px-3.5 py-2">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {storage.filesystems.map((f) => (
                <tr key={f.mount} className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40">
                  <td className="px-3.5 py-2.5 align-middle">
                    <div className="flex items-center gap-1.5 font-mono text-[13px] font-medium text-ink dark:text-bone">
                      <span>{f.mount}</span>
                      {f.kind && <DriveBadge kind={f.kind} />}
                    </div>
                    <div className="font-mono text-muted dark:text-fog text-[11px] truncate mt-0.5">
                      {f.device} {f.fstype ? `· ${f.fstype}` : ""}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 align-middle">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted dark:text-fog">
                      {f.kind ? f.kind.toUpperCase() : "Disk"}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 align-middle min-w-[140px]">
                    <div className="flex items-center justify-between font-mono text-[11px] text-muted dark:text-fog mb-1">
                      <span>{f.usedPct.toFixed(1)}%</span>
                      <span>{fmtGB(f.usedGB)} used</span>
                    </div>
                    <Meter
                      pct={f.usedPct}
                      tone={
                        f.usedPct >= 90
                          ? "bg-brick"
                          : f.usedPct >= 75
                            ? "bg-status-amber"
                            : "bg-moss"
                      }
                    />
                  </td>
                  <td className="px-3.5 py-2.5 align-middle text-right font-mono text-[12px] text-ink dark:text-bone">
                    <div>{fmtGB(f.totalGB)}</div>
                    <div className="text-[10.5px] text-muted dark:text-fog">{fmtGB(f.freeGB)} free</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {storage.apps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line dark:border-edge">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog mb-2">
              <FolderTree size={12} className="text-accent dark:text-ember" />
              <span>Application Directories</span>
              <span className="font-mono font-normal lowercase text-[10px]">({storage.appsRoot || "apps"}{storage.appsPartial ? " · partial" : ""})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {(() => {
                const top = Math.max(...storage.apps.map((a) => a.bytesMB), 1);
                return storage.apps.slice(0, 8).map((a) => {
                  const filled = Math.max(
                    a.bytesMB > 0 ? 1 : 0,
                    Math.round((a.bytesMB / top) * 10),
                  );
                  return (
                    <div key={a.path} className="flex items-center gap-2 py-0.5">
                      <span className="font-mono text-[11.5px] text-ink dark:text-bone w-28 truncate shrink-0">{a.name}</span>
                      <span className="flex gap-[2px] flex-1" aria-hidden="true">
                        {Array.from({ length: 10 }, (_, i) => (
                          <span
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i < filled
                                ? "bg-accent dark:bg-ember"
                                : "bg-paper dark:bg-abyss border border-line dark:border-edge"
                            }`}
                          />
                        ))}
                      </span>
                      <span className="font-mono text-[11px] text-muted dark:text-fog w-16 text-right shrink-0">
                        {fmtSize(a.bytesMB)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {storage.docker && (
          <div className="mt-4 pt-3 border-t border-line dark:border-edge">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog mb-2">
              <Boxes size={12} className="text-accent dark:text-ember" />
              <span>Docker Disk Footprint</span>
            </div>
            <div className="bg-paper/50 dark:bg-abyss/50 border border-line dark:border-edge rounded-lg px-3 py-2">
              <SpecGrid>
                <SpecRow label="Images" value={fmtSize(storage.docker.imagesMB)} />
                <SpecRow label="Containers" value={fmtSize(storage.docker.containersMB)} />
                <SpecRow label="Volumes" value={fmtSize(storage.docker.volumesMB)} />
                <SpecRow label="Build Cache" value={fmtSize(storage.docker.buildCacheMB)} />
              </SpecGrid>
            </div>
            {storage.docker.imagesTop.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2.5">
                {storage.docker.imagesTop.slice(0, 6).map((im) => (
                  <div key={im.name} className="flex items-center justify-between gap-2 py-0.5 font-mono text-[11px]">
                    <span className="text-ink dark:text-bone truncate">{im.name}</span>
                    <span className="text-muted dark:text-fog shrink-0">{fmtSize(im.sizeMB)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </TelemetrySection>
    </div>
  );
}
