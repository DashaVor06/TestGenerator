import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import { Header } from "@/components/header";
import { Toast } from "@/components/toast";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/i18n/dictionary";

export const metadata: Metadata = {
  title: "Генератор тестов",
  description: "Веб-приложение для автоматической генерации тестов по учебным материалам",
};

/**
 * Скрипт выполняется до отрисовки страницы и выставляет тему,
 * чтобы не было «вспышки» светлого фона в тёмной теме.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Язык интерфейса хранится в cookie, чтобы сервер и клиент совпадали.
  const cookieLanguage = cookies().get("lang")?.value;
  const initialLanguage: Language = isLanguage(cookieLanguage)
    ? cookieLanguage
    : DEFAULT_LANGUAGE;

  return (
    <html lang={initialLanguage === "EN" ? "en" : "ru"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider initialLanguage={initialLanguage}>
          <Header />
          <main className="container page">{children}</main>
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
