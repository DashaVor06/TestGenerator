"use client";

import Link from "next/link";
import { useApp } from "./providers";

export function Header() {
  const { user } = useApp();

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/catalog" className="logo">
          Генератор тестов
        </Link>
        <nav className="nav">
          <Link href="/catalog">Каталог</Link>
          {user ? (
            <>
              <Link href="/materials">Материалы</Link>
              <Link href="/results">Результаты</Link>
              <Link href="/profile">{user.username}</Link>
            </>
          ) : (
            <>
              <Link href="/login">Вход</Link>
              <Link href="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
