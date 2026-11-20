import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Search,
  X,
  List,
  GitBranch,
  ChevronRight,
  ChevronDown,
  Trash2,
  Terminal,
  ShieldAlert,
} from "lucide-react-native";
import type { ProcInfo, DetailedProcess } from "../types/telemetry";
import { telemetryApi } from "../api/telemetry";
import { colors } from "../theme/colors";

interface ProcessExplorerProps {
  processes: ProcInfo[];
  onRefreshProcesses?: () => void;
}

interface TreeNode {
  proc: ProcInfo;
  children: TreeNode[];
  depth: number;
}

export function ProcessExplorer({ processes, onRefreshProcesses }: ProcessExplorerProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
  const [collapsedPids, setCollapsedPids] = useState<Set<number>>(new Set());

  // Modal inspection state
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailedProcess | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [killing, setKilling] = useState(false);

  // Toggle collapse for tree branch
  const toggleCollapse = (pid: number) => {
    setCollapsedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  // Inspect process
  const openProcessDetail = async (pid: number) => {
    setSelectedPid(pid);
    setDetailLoading(true);
    try {
      const res = await telemetryApi.processDetail(pid);
      setDetail(res);
    } catch {
      // fallback to basic info from list
      const basic = processes.find((p) => p.pid === pid);
      if (basic) setDetail({ ...basic });
    } finally {
      setDetailLoading(false);
    }
  };

  // Kill action
  const handleKill = (signal: "SIGTERM" | "SIGKILL") => {
    if (!selectedPid) return;
    Alert.alert(
      `Terminate Process (PID ${selectedPid})?`,
      `Send ${signal} to ${detail?.name ?? "process"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Kill (${signal})`,
          style: "destructive",
          onPress: async () => {
            setKilling(true);
            try {
              const res = await telemetryApi.killProcess(selectedPid, signal);
              Alert.alert("Success", res.message || "Process terminated.");
              setSelectedPid(null);
              setDetail(null);
              onRefreshProcesses?.();
            } catch (err) {
              Alert.alert(
                "Failed",
                err instanceof Error ? err.message : "Unable to kill process.",
              );
            } finally {
              setKilling(false);
            }
          },
        },
      ],
    );
  };

  // Filtered flat list
  const filteredProcs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.pid.toString().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q)),
    );
  }, [processes, search]);

  // Hierarchical Tree computation
  const treeNodes = useMemo(() => {
    if (viewMode !== "tree" || search.trim().length > 0) return [];

    const procMap = new Map<number, ProcInfo>();
    const childrenMap = new Map<number, ProcInfo[]>();

    for (const p of processes) {
      procMap.set(p.pid, p);
    }

    const rootProcs: ProcInfo[] = [];

    for (const p of processes) {
      const parentId = p.ppid;
      if (parentId && parentId !== p.pid && procMap.has(parentId)) {
        const list = childrenMap.get(parentId) ?? [];
        list.push(p);
        childrenMap.set(parentId, list);
      } else {
        rootProcs.push(p);
      }
    }

    const buildTree = (proc: ProcInfo, depth: number): TreeNode => {
      const children = (childrenMap.get(proc.pid) ?? []).map((child) =>
        buildTree(child, depth + 1),
      );
      return { proc, children, depth };
    };

    return rootProcs.map((r) => buildTree(r, 0));
  }, [processes, viewMode, search]);

  // Flatten visible tree considering collapsed nodes
  const flattenedVisibleTree = useMemo(() => {
    if (viewMode !== "tree" || search.trim().length > 0) return [];

    const result: TreeNode[] = [];

    const traverse = (node: TreeNode) => {
      result.push(node);
      if (!collapsedPids.has(node.proc.pid)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    for (const root of treeNodes) {
      traverse(root);
    }

    return result;
  }, [treeNodes, collapsedPids, viewMode, search]);

  return (
    <View className="bg-panel border border-edge rounded-card p-4 mb-4">
      {/* Title & Flat / Tree Mode Toggle */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Terminal size={16} color={colors.ember} />
          <Text className="font-head font-bold text-[16px] text-bone">
            Process Explorer
          </Text>
          <View className="px-1.5 py-0.5 rounded bg-emboss border border-edge">
            <Text className="text-[10px] font-mono text-fog">
              {processes.length} active
            </Text>
          </View>
        </View>

        {/* Tree / List Switcher */}
        <View className="flex-row items-center bg-abyss border border-edge rounded-lg p-0.5">
          <TouchableOpacity
            onPress={() => setViewMode("tree")}
            className={`flex-row items-center gap-1 px-2.5 py-1 rounded-md ${
              viewMode === "tree" ? "bg-panel" : "bg-transparent"
            }`}
          >
            <GitBranch size={12} color={viewMode === "tree" ? colors.ember : colors.fog} />
            <Text
              className={`text-[10.5px] font-mono font-semibold ${
                viewMode === "tree" ? "text-ember" : "text-fog"
              }`}
            >
              Tree
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("flat")}
            className={`flex-row items-center gap-1 px-2.5 py-1 rounded-md ${
              viewMode === "flat" ? "bg-panel" : "bg-transparent"
            }`}
          >
            <List size={12} color={viewMode === "flat" ? colors.ember : colors.fog} />
            <Text
              className={`text-[10.5px] font-mono font-semibold ${
                viewMode === "flat" ? "text-ember" : "text-fog"
              }`}
            >
              Flat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View className="flex-row items-center bg-abyss border border-edge rounded-input px-3 py-2 mb-3">
        <Search size={14} color={colors.fog} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by name, PID, or user..."
          placeholderTextColor={colors.fog}
          className="flex-1 text-bone text-[12.5px] ml-2 font-mono"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <X size={14} color={colors.fog} />
          </TouchableOpacity>
        )}
      </View>

      {/* Process List / Tree Content */}
      <View className="border border-edge rounded-lg overflow-hidden bg-abyss/40">
        {/* Table Header */}
        <View className="flex-row items-center px-3 py-2 bg-emboss/50 border-b border-edge">
          <Text className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-fog flex-1">
            Process / Command
          </Text>
          <Text className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-fog w-16 text-right">
            PID
          </Text>
          <Text className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-fog w-16 text-right">
            RAM
          </Text>
          <Text className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-fog w-14 text-right">
            CPU
          </Text>
        </View>

        {/* Flat Mode (or active search filter) */}
        {(viewMode === "flat" || search.trim().length > 0) && (
          <>
            {filteredProcs.slice(0, 40).map((proc, idx) => (
              <TouchableOpacity
                key={`${proc.pid}-${idx}`}
                onPress={() => openProcessDetail(proc.pid)}
                className="flex-row items-center px-3 py-2.5 border-b border-edge/60 active:bg-panel"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-bone text-[12px] font-mono font-semibold" numberOfLines={1}>
                    {proc.name}
                  </Text>
                  <Text className="text-fog text-[10px] font-mono">
                    {proc.username ?? "system"} · PPID: {proc.ppid ?? "—"}
                  </Text>
                </View>
                <Text className="text-fog text-[11px] font-mono w-16 text-right">
                  {proc.pid}
                </Text>
                <Text className="text-bone text-[11px] font-mono w-16 text-right font-medium">
                  {proc.memMB.toFixed(0)} MB
                </Text>
                <Text className="text-ember text-[11px] font-mono w-14 text-right font-bold">
                  {(proc.cpuPercent ?? 0).toFixed(1)}%
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Tree Mode (hierarchical branches) */}
        {viewMode === "tree" && search.trim().length === 0 && (
          <>
            {flattenedVisibleTree.slice(0, 60).map((node) => {
              const hasChildren = node.children.length > 0;
              const isCollapsed = collapsedPids.has(node.proc.pid);
              const indent = Math.min(node.depth * 14, 70);

              return (
                <TouchableOpacity
                  key={`tree-${node.proc.pid}`}
                  onPress={() => openProcessDetail(node.proc.pid)}
                  className="flex-row items-center px-3 py-2.5 border-b border-edge/60 active:bg-panel"
                >
                  <View style={{ paddingLeft: indent }} className="flex-1 flex-row items-center mr-2">
                    {hasChildren ? (
                      <TouchableOpacity
                        onPress={() => toggleCollapse(node.proc.pid)}
                        className="w-5 h-5 items-center justify-center mr-1 -ml-1 rounded hover:bg-emboss"
                      >
                        {isCollapsed ? (
                          <ChevronRight size={13} color={colors.ember} />
                        ) : (
                          <ChevronDown size={13} color={colors.ember} />
                        )}
                      </TouchableOpacity>
                    ) : (
                      <Text className="text-fog/40 font-mono text-[10px] mr-1.5">
                        {node.depth > 0 ? "├─" : "•"}
                      </Text>
                    )}

                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-bone text-[12px] font-mono font-semibold" numberOfLines={1}>
                          {node.proc.name}
                        </Text>
                        {hasChildren && isCollapsed && (
                          <View className="px-1 rounded bg-emboss">
                            <Text className="text-[9px] font-mono text-fog">
                              +{node.children.length}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-fog text-[10px] font-mono">
                        {node.proc.username ?? "system"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-fog text-[11px] font-mono w-16 text-right">
                    {node.proc.pid}
                  </Text>
                  <Text className="text-bone text-[11px] font-mono w-16 text-right font-medium">
                    {node.proc.memMB.toFixed(0)} MB
                  </Text>
                  <Text className="text-ember text-[11px] font-mono w-14 text-right font-bold">
                    {(node.proc.cpuPercent ?? 0).toFixed(1)}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>

      {/* Process Detail & Kill Modal */}
      <Modal visible={selectedPid !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-4">
          <View className="w-full max-w-sm bg-panel border border-edge rounded-card p-5">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <Terminal size={18} color={colors.ember} />
                <Text className="font-head font-bold text-[18px] text-bone">
                  Process Details
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPid(null)}>
                <X size={18} color={colors.fog} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator color={colors.ember} size="large" className="my-8" />
            ) : detail ? (
              <View>
                <View className="bg-abyss border border-edge rounded-lg p-3 mb-4">
                  <Text className="text-fog text-[11px] font-mono uppercase tracking-wider mb-1">
                    Command / Executable
                  </Text>
                  <Text className="text-bone text-[13px] font-mono font-semibold mb-2">
                    {detail.name}
                  </Text>
                  {detail.cmdline && (
                    <Text className="text-fog text-[11px] font-mono bg-panel/80 p-2 rounded border border-edge/60">
                      {detail.cmdline}
                    </Text>
                  )}
                </View>

                {/* Details Grid */}
                <View className="flex-row flex-wrap gap-2 mb-4">
                  <View className="flex-1 min-w-[45%] bg-abyss p-2.5 rounded-lg border border-edge">
                    <Text className="text-fog text-[10px] font-mono uppercase">PID</Text>
                    <Text className="text-bone text-[14px] font-mono font-bold">{detail.pid}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-abyss p-2.5 rounded-lg border border-edge">
                    <Text className="text-fog text-[10px] font-mono uppercase">PPID</Text>
                    <Text className="text-bone text-[14px] font-mono font-bold">{detail.ppid ?? "—"}</Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-abyss p-2.5 rounded-lg border border-edge">
                    <Text className="text-fog text-[10px] font-mono uppercase">CPU Load</Text>
                    <Text className="text-ember text-[14px] font-mono font-bold">
                      {(detail.cpuPercent ?? 0).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[45%] bg-abyss p-2.5 rounded-lg border border-edge">
                    <Text className="text-fog text-[10px] font-mono uppercase">Memory</Text>
                    <Text className="text-emerald-400 text-[14px] font-mono font-bold">
                      {detail.memMB.toFixed(0)} MB
                    </Text>
                  </View>
                </View>

                {/* Kill Actions */}
                <View className="pt-2 border-t border-edge">
                  <Text className="text-fog text-[11px] font-mono uppercase tracking-wider mb-2">
                    Process Control
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      disabled={killing}
                      onPress={() => handleKill("SIGTERM")}
                      className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-input bg-amber-500/15 border border-amber-500/40"
                    >
                      <Trash2 size={13} color="#f59e0b" />
                      <Text className="text-amber-400 font-mono text-[11.5px] font-bold">
                        SIGTERM (15)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={killing}
                      onPress={() => handleKill("SIGKILL")}
                      className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-input bg-rose-500/15 border border-rose-500/40"
                    >
                      <ShieldAlert size={13} color="#f43f5e" />
                      <Text className="text-rose-400 font-mono text-[11.5px] font-bold">
                        SIGKILL (9)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
