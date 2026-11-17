"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

export default function ProfilePage() {
  const { user, refresh } = useApp();
  const router = useRouter();

  async function handleLogout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      await refresh();
      router.push("/login");
    }
  }

  if (!user) return <p>Войдите, чтобы увидеть профиль.</p>;

  return (
    <div>
      <h1 className="page-title">Личный кабинет</h1>
      <div className="card">
        <p>
          <strong>Имя:</strong> {user.username}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <button className="btn btn-danger" onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
