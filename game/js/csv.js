export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

export function csvRowsToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, "").trim());

  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

export function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function objectsToCsv(objects, headers) {
  const resolvedHeaders = headers ?? (objects[0] ? Object.keys(objects[0]) : []);
  const lines = [
    resolvedHeaders.map(escapeCsvValue).join(","),
    ...objects.map((object) =>
      resolvedHeaders.map((header) => escapeCsvValue(object[header])).join(",")
    )
  ];
  return lines.join("\r\n");
}
