"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/components/providers";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  id: string;
  type: string;
  text: string;
  explanation: string | null;
  options: Option[];
}
interface Test {
  id: string;
  title: string;
  status: string;
  questions: Question[];
}
interface Material {
  id: string;
  title: string;
}

export default function TestPage() {
  const { user } = useApp();
  const params = useParams<{ id: string }>();
  const testId = params.id;

  const [test, setTest] = useState<Test | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ score: number; percentCorrect: number } | null>(null);

  const [materialId, setMaterialId] = useState("");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ test: Test }>(`/api/tests/${testId}`);
      setTest(data.test);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, [testId]);

  useEffect(() => {
    void load();
    api<{ materials: Material[] }>("/api/materials")
      .then((data) => setMaterials(data.materials))
      .catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      await api(`/api/tests/${testId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          materialId,
          count,
          types: ["MULTIPLE_CHOICE", "TRUE_FALSE"],
        }),
      });
      // опрашиваем статус, пока генерация не завершится
      pollRef.current = setInterval(async () => {
        const data = await api<{ test: Test }>(`/api/tests/${testId}`);
        setTest(data.test);
        if (data.test.status === "READY" || data.test.status === "ERROR") {
          if (pollRef.current) clearInterval(pollRef.current);
          setGenerating(false);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
      setGenerating(false);
    }
  }

  function toggleOption(questionId: string, optionId: string, multi: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [questionId]: current.filter((x) => x !== optionId) };
      }
      return {
        ...prev,
        [questionId]: multi ? [...current, optionId] : [optionId],
      };
    });
  }

  async function handleSubmit() {
    const answersArr = Object.entries(answers).map(([questionId, optionIds]) => ({
      questionId,
      optionIds,
    }));
    try {
      const data = await api<{ result: { score: number; percentCorrect: number } }>(
        `/api/tests/${testId}/submit`,
        { method: "POST", body: JSON.stringify({ answers: answersArr }) }
      );
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    }
  }

  if (!user) return <p>Войдите, чтобы проходить тесты.</p>;
  if (!test) return <p className="muted">Загрузка…</p>;

  const hasQuestions = test.questions.length > 0;
  const statusLabel =
    test.status === "PROCESSING"
      ? "Идёт генерация…"
      : test.status === "ERROR"
        ? "Ошибка генерации"
        : "";

  return (
    <div>
      <h1 className="page-title">{test.title}</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {statusLabel && <p className="muted">{statusLabel}</p>}

      {result && (
        <div className="card">
          <h3>Результат</h3>
          <div className="score">{result.percentCorrect}%</div>
          <p className="muted">Верных ответов: {result.score}</p>
        </div>
      )}

      {!hasQuestions && !result && (
        <div className="card">
          <h3>Сгенерировать вопросы</h3>
          <div className="form-group">
            <label>Материал</label>
            <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">— выберите материал —</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Количество вопросов</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating || !materialId}
          >
            {generating ? "Генерация…" : "Сгенерировать"}
          </button>
        </div>
      )}

      {hasQuestions && !result && (
        <div>
          {test.questions.map((q) => {
            const multi = q.type === "MULTIPLE_CHOICE";
            const selected = answers[q.id] ?? [];
            return (
              <div className="card" key={q.id}>
                <h3>{q.text}</h3>
                {q.options.map((o) => (
                  <div
                    key={o.id}
                    className={`option ${selected.includes(o.id) ? "selected" : ""}`}
                    onClick={() => toggleOption(q.id, o.id, multi)}
                  >
                    <input
                      type={multi ? "checkbox" : "radio"}
                      checked={selected.includes(o.id)}
                      readOnly
                    />
                    <span>{o.text}</span>
                  </div>
                ))}
              </div>
            );
          })}
          <button className="btn btn-primary" onClick={handleSubmit}>
            Завершить тест
          </button>
        </div>
      )}
    </div>
  );
}
