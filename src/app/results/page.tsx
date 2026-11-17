"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface TestResult {
  id: string;
  testId: string;
  score: number;
  percentCorrect: number;
  completedAt: string;
}

export default function ResultsPage() {
  const { user } = useApp();
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    if (!user) return;
    api<{ results: TestResult[] }>("/api/results")
      .then((data) => setResults(data.results))
      .catch(() => {});
  }, [user]);

  if (!user) return <p>Войдите, чтобы увидеть результаты.</p>;

  return (
    <div>
      <h1 className="page-title">Результаты</h1>
      {results.length === 0 && <p className="muted">Результатов пока нет.</p>}
      {results.map((r) => (
        <div className="card" key={r.id}>
          <span className="score">{r.percentCorrect}%</span>
          <p className="muted">
            Верно: {r.score} ·{" "}
            {new Date(r.completedAt).toLocaleString("ru-RU")}
          </p>
        </div>
      ))}
    </div>
  );
}
