"use client";

// Глобальное состояние приложения: текущий пользователь, язык интерфейса,
// тема оформления и уведомления, приходящие по WebSocket.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  translations,
  type Language,
  type TranslationKey,
} from "@/i18n/dictionary";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  language: Language;
}

export interface Notification {
  type: string;
  message: string;
  timestamp: string;
}

type Theme = "light" | "dark";

type Params = Record<string, string | number>;

interface AppContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  notifications: Notification[];
  language: Language;
  setLanguage: (language: Language) => void;
  /** Перевод по ключу словаря. */
  t: (key: TranslationKey, params?: Params) => string;
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Сколько живёт всплывающее уведомление. */
const TOAST_LIFETIME_MS = 6000;
/** Через сколько переподключаться к WebSocket после обрыва. */
const WS_RECONNECT_MS = 5000;

/** Записывает значение в cookie на год. */
function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

/** Подставляет параметры в строку вида «Всего вопросов: {count}». */
function format(template: string, params?: Params): string {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function AppProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: Language;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [language, setLanguageState] = useState<Language>(
    isLanguage(initialLanguage) ? initialLanguage : DEFAULT_LANGUAGE
  );
  const [theme, setTheme] = useState<Theme>("light");

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Загружает текущего пользователя. */
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = (await response.json()) as { user: User | null };
        setUser(data.user);
        if (data.user?.language && isLanguage(data.user.language)) {
          setLanguageState(data.user.language);
        }
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

  /** Тема берётся из атрибута html — его выставляет скрипт в layout до отрисовки. */
  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const current = document.documentElement.dataset.theme;
    const next: Theme = current === "dark" || stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next: Theme = previous === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  /** Смена языка: сохраняем в cookie и, если пользователь вошёл, в профиль. */
  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      setCookie("lang", next);
      if (user) {
        void fetch("/api/profile/language", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: next }),
        });
      }
    },
    [user]
  );

  /** Перевод по ключу. */
  const t = useCallback(
    (key: TranslationKey, params?: Params) => {
      const dictionary = translations[language] ?? translations[DEFAULT_LANGUAGE];
      return format(dictionary[key] ?? key, params);
    },
    [language]
  );

  /** Подключение к WebSocket для уведомлений. */
  useEffect(() => {
    if (!user) {
      return;
    }

    let stopped = false;

    const connect = () => {
      if (stopped) {
        return;
      }

      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as Notification;
          setNotifications((previous) => [...previous, data]);
          setTimeout(() => {
            setNotifications((previous) => previous.filter((item) => item !== data));
          }, TOAST_LIFETIME_MS);
        } catch {
          // Некорректные сообщения просто игнорируем.
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!stopped) {
          reconnectRef.current = setTimeout(connect, WS_RECONNECT_MS);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        refresh,
        notifications,
        language,
        setLanguage,
        t,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp должен использоваться внутри AppProvider");
  }
  return context;
}
