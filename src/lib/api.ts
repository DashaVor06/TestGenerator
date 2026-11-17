// Клиентский хелпер для обращения к REST API.

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(typeof options.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const data = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Ошибка ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}
