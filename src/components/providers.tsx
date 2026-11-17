"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface Notification {
  type: string;
  message: string;
  timestamp: string;
}

interface AppContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => void;
  notifications: Notification[];
}

const AppContext = createContext<AppContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
  notifications: [],
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as { user: User | null };
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/ws?userId=${user.id}`
    );
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Notification;
        setNotifications((prev) => [...prev, data]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n !== data));
        }, 6000);
      } catch {
        // игнорируем некорректные сообщения
      }
    };
    return () => ws.close();
  }, [user?.id]);

  return (
    <AppContext.Provider value={{ user, loading, refresh, notifications }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
