import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
