import { Activity, Boxes, Network } from "lucide-react";
import { TelemetrySection } from "./TelemetrySection";
import { DriveBadge } from "./ui/DriveBadge";
import { fmtBytesTotal, fmtSize } from "../utils/telemetryFormat";
import type { ContainerStat, ServerDetail } from "../lib/types/host";

// Network interface, disk I/O and per-container resource tables. Each table
// renders only when its data is present, in a clean and dense format.
export function TelemetryInventory({
  detail,
  cstats,
}: {
  detail: ServerDetail | null;
  cstats: ContainerStat[] | null;
}) {
  return (
    <>
      {detail && detail.network.length > 0 && (
        <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5">
          <TelemetrySection
            icon={<Network size={14} />}
            title="Network Interfaces"
            meta={`${detail.network.length} active`}
          >
            <div className="overflow-x-auto border border-line dark:border-edge rounded-xl my-3">
              <table className="w-full min-w-[480px] sm:min-w-0 border-collapse text-[13px]">
                <thead>
                  <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog">
                    <th className="text-left px-3.5 py-2">Interface</th>
                    <th className="text-left px-3.5 py-2">Received</th>
                    <th className="text-left px-3.5 py-2">Transmitted</th>
                    <th className="text-right px-3.5 py-2">Errors (Rx/Tx)</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.network.map((n) => (
                    <tr key={n.name} className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40 font-mono">
                      <td className="px-3.5 py-2.5 align-middle text-ink dark:text-bone font-medium">
                        {n.name}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-muted dark:text-fog">
                        ↓ {fmtBytesTotal(n.rxBytes)}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-muted dark:text-fog">
                        ↑ {fmtBytesTotal(n.txBytes)}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-right text-[11px] text-muted dark:text-fog">
                        {n.rxErrors || n.txErrors ? (
                          <span className="text-brick font-medium">{n.rxErrors} / {n.txErrors}</span>
                        ) : (
                          <span className="text-moss">0 / 0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TelemetrySection>
        </div>
      )}

      {detail && detail.diskIO.length > 0 && (
        <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5">
          <TelemetrySection
            icon={<Activity size={14} />}
            title="Disk I/O Totals"
            meta={`${detail.diskIO.length} drives tracked`}
          >
            <div className="overflow-x-auto border border-line dark:border-edge rounded-xl my-3">
              <table className="w-full min-w-[500px] sm:min-w-0 border-collapse text-[13px]">
                <thead>
                  <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog">
                    <th className="text-left px-3.5 py-2">Device & Media</th>
                    <th className="text-left px-3.5 py-2">Data Read</th>
                    <th className="text-left px-3.5 py-2">Data Written</th>
                    <th className="text-right px-3.5 py-2">Operations (IOPS)</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.diskIO.map((d) => (
                    <tr key={d.device} className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40 font-mono">
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-ink dark:text-bone font-medium">{d.device}</span>
                          {d.kind && <DriveBadge kind={d.kind} />}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-muted dark:text-fog">
                        📖 {fmtSize(d.readMB)}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-muted dark:text-fog">
                        ✍️ {fmtSize(d.writeMB)}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-right text-[11px] text-muted dark:text-fog">
                        {d.readOps.toLocaleString()} r · {d.writeOps.toLocaleString()} w
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TelemetrySection>
        </div>
      )}

      {cstats !== null && cstats.length > 0 && (
        <div className="bg-white dark:bg-panel border border-line dark:border-edge rounded-card p-4 sm:p-5">
          <TelemetrySection
            icon={<Boxes size={14} />}
            title="Container Resources"
            meta={`${cstats.length} running`}
          >
            <div className="overflow-x-auto border border-line dark:border-edge rounded-xl my-3">
              <table className="w-full min-w-[560px] md:min-w-0 border-collapse text-[13px]">
                <thead>
                  <tr className="bg-paper dark:bg-abyss text-[10.5px] font-semibold tracking-[0.08em] uppercase text-muted dark:text-fog">
                    <th className="text-left px-3.5 py-2">Container</th>
                    <th className="text-left px-3.5 py-2">CPU</th>
                    <th className="hidden sm:table-cell text-left px-3.5 py-2">Memory</th>
                    <th className="text-right px-3.5 py-2">Net ↓↑</th>
                  </tr>
                </thead>
                <tbody>
                  {cstats.map((c) => (
                    <tr key={c.id} className="group border-t border-line dark:border-edge hover:bg-paper/40 dark:hover:bg-emboss/40">
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="font-mono text-ink dark:text-bone font-medium">{c.name}</div>
                        <div className="font-mono text-muted dark:text-fog text-[11px] truncate max-w-[240px]">
                          {c.image}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 align-middle font-mono text-muted dark:text-fog">
                        {c.cpuPercent.toFixed(1)}%
                      </td>
                      <td className="hidden sm:table-cell px-3.5 py-2.5 align-middle font-mono text-muted dark:text-fog">
                        {fmtSize(c.memMB)}
                        {c.memLimitMB > 0 ? ` / ${fmtSize(c.memLimitMB)}` : ""}
                      </td>
                      <td className="px-3.5 py-2.5 align-middle text-right font-mono text-muted dark:text-fog">
                        ↓ {fmtSize(c.netRxMB)} / ↑ {fmtSize(c.netTxMB)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TelemetrySection>
        </div>
      )}
    </>
  );
}
