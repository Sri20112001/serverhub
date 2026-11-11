import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  ALERT_PREFS_KEY,
  loadAlertPrefs,
  type AlertPrefs,
} from "../lib/alertPrefs";
import { useAuth, useUi } from "../stores/store";
import type { NotifySettings } from "../lib/types/notify";
import type { ServerInfo } from "../lib/types/dashboard";

export type SettingsTab = "profile" | "notifications" | "system" | "users" | "danger";

export interface UserRecord {
  username: string;
  role: string;
  createdAt: string;
}

// All data, per-tab state and actions for the settings page. Tab components
// receive the controller object; the page shell only handles tab routing and
// the confirmation modals.
export function useSettings(setOnline: (v: boolean) => void) {
  const { user } = useAuth();
  const pushToast = useUi((s) => s.pushToast);

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab") as SettingsTab;
      if (t && ["profile", "notifications", "system", "users", "danger"].includes(t)) {
        return t;
      }
    } catch {
      /* fallback */
    }
    return "profile";
  });
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertPrefs>(loadAlertPrefs);

  // Password rotation state
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Modals state
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  // Notification state
  const [notify, setNotify] = useState<NotifySettings | null>(null);
  const [ntBusy, setNtBusy] = useState(false);
  const [ntTest, setNtTest] = useState<{ telegram: string; email: string; push: string } | null>(null);
  const [tgToken, setTgToken] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  // Users administration state
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("operator");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    api
      .server()
      .then((s) => {
        setInfo(s);
        setOnline(true);
      })
      .catch(() => setOnline(false))
      .finally(() => setLoading(false));
    api.notifySettings().then(setNotify).catch(() => setNotify(null));
  }, [setOnline]);

  const loadUsers = useCallback(async () => {
    if (user?.role !== "admin") return;
    setLoadingUsers(true);
    try {
      const res = await api.users();
      setUsersList(res);
    } catch {
      /* ignore */
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (activeTab === "users") {
      // Intentional: refresh the user list when the tab opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadUsers();
    }
  }, [activeTab, loadUsers]);

  const flip = (key: keyof AlertPrefs) => {
    setAlerts((a) => {
      const nextAlerts = { ...a, [key]: !a[key] };
      localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(nextAlerts));
      return nextAlerts;
    });
    pushToast("Signal routing saved.");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) {
      pushToast("New passwords do not match", true);
      return;
    }
    setPwBusy(true);
    try {
      await api.changePassword(current, next);
      pushToast("Master password rotated.");
      setCurrent("");
      setNext("");
      setAgain("");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Rotation failed", true);
    } finally {
      setPwBusy(false);
    }
  };

  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

  const patchNotify = (patch: Partial<NotifySettings>) =>
    setNotify((n) => (n ? { ...n, ...patch } : n));

  const saveNotify = async () => {
    if (!notify) return;
    setNtBusy(true);
    try {
      await api.saveNotifySettings({
        enabled: notify.enabled,
        events: notify.events,
        telegram: { enabled: notify.telegram.enabled, chatId: notify.telegram.chatId, token: tgToken || undefined },
        push: { enabled: notify.push.enabled },
        email: {
          enabled: notify.email.enabled,
          host: notify.email.host,
          port: notify.email.port,
          username: notify.email.username,
          from: notify.email.from,
          to: notify.email.to,
          tls: notify.email.tls,
          password: smtpPass || undefined,
        },
      });
      setTgToken("");
      setSmtpPass("");
      setNtTest(null);
      pushToast("Notification routing saved.");
      const fresh = await api.notifySettings();
      setNotify(fresh);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Save failed", true);
    } finally {
      setNtBusy(false);
    }
  };

  const probeNotify = async () => {
    try {
      const r = await api.testNotify();
      setNtTest(r);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Probe failed", true);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword) return;
    setCreatingUser(true);
    try {
      await api.createUser(newUsername.trim(), newUserPassword, newUserRole);
      pushToast(`User "${newUsername}" created.`);
      setNewUsername("");
      setNewUserPassword("");
      void loadUsers();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to create user", true);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await api.deleteUser(username);
      pushToast(`User "${username}" deleted.`);
      void loadUsers();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to delete user", true);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await api.logoutAll();
      pushToast("All sessions invalidated. Please sign in again.");
      window.location.href = "/login";
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to logout sessions", true);
      setConfirmLogoutAll(false);
    }
  };

  return {
    user,
    pushToast,
    activeTab,
    setActiveTab,
    info,
    loading,
    alerts,
    flip,
    current,
    setCurrent,
    next,
    setNext,
    again,
    setAgain,
    pwBusy,
    showPw,
    setShowPw,
    changePassword,
    confirmWipe,
    setConfirmWipe,
    confirmRestart,
    setConfirmRestart,
    confirmLogoutAll,
    setConfirmLogoutAll,
    notify,
    patchNotify,
    ntBusy,
    ntTest,
    tgToken,
    setTgToken,
    smtpPass,
    setSmtpPass,
    saveNotify,
    probeNotify,
    apiUrl,
    usersList,
    loadingUsers,
    newUsername,
    setNewUsername,
    newUserPassword,
    setNewUserPassword,
    newUserRole,
    setNewUserRole,
    creatingUser,
    handleCreateUser,
    handleDeleteUser,
    handleLogoutAll,
  };
}

export type SettingsController = ReturnType<typeof useSettings>;
