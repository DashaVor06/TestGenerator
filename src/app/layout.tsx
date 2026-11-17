import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import { Header } from "@/components/header";
import { Toast } from "@/components/toast";

export const metadata: Metadata = {
  title: "Генератор тестов",
  description: "Веб-приложение для автоматической генерации тестов по материалам",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <AppProvider>
          <Header />
          <main className="container">{children}</main>
          <Toast />
        </AppProvider>
      </body>
    </html>
  );
}
