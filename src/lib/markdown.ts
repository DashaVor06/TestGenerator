// Очень простой рендер Markdown для показа материалов.
// Поддерживает заголовки, списки, жирный и курсивный текст, код и ссылки —
// этого достаточно для конспектов и статей, без внешних библиотек.

/** Экранирует HTML, чтобы текст материала не мог вставить свою разметку. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Разметка внутри строки: код, жирный, курсив, ссылки. */
function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
}

/** Превращает Markdown в HTML для вставки в модальное окно. */
export function renderMarkdown(source: string): string {
  const lines = source.split(/\r?\n/);
  const html: string[] = [];
  const paragraph: string[] = [];
  let listOpened = false;

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph.length = 0;
    }
  }

  function closeList() {
    if (listOpened) {
      html.push("</ul>");
      listOpened = false;
    }
  }

  for (const line of lines) {
    if (line.trim().length === 0) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      // Внутри окна заголовки делаем на два уровня меньше.
      const level = Math.min(heading[1].length + 2, 6);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      flushParagraph();
      if (!listOpened) {
        html.push("<ul>");
        listOpened = true;
      }
      html.push(`<li>${renderInline(listItem[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  return html.join("\n");
}
