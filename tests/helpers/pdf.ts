// Сборка простейшего PDF для тестов: одна страница с одной строкой текста.
// Нужен, чтобы проверить извлечение текста без внешних файлов.
//
// Важно: используется стандартный шрифт Helvetica, а он поддерживает только
// латиницу. Поэтому текст для теста должен быть латинским — иначе в PDF
// попадёт не кириллица, а её байты.

/** Возвращает PDF-файл с латинским текстом `text` в виде Buffer. */
export function buildSamplePdf(text = "Hello PDF text"): Buffer {
  const stream = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R " +
      "/Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
