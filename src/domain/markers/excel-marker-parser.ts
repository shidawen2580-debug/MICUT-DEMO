export interface ImportedMarkerRow {
  timestampSeconds: number;
  description: string;
}

export interface ExcelParseResult {
  data: ImportedMarkerRow[];
  errors: string[];
}

export type ExcelRow = Record<string, unknown>;

const TIME_SYNONYMS = [
  "timestamp",
  "time",
  "relative_time",
  "relativetime",
  "timestampseconds",
  "timestamp_seconds",
  "时间",
  "时间点",
];

const DESCRIPTION_SYNONYMS = ["description", "desc", "comment", "描述", "备注"];

export function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    if (value < 1) {
      return Math.round(value * 86400);
    }

    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes ?? 0) * 60 + (seconds ?? 0);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
  }

  return null;
}

export function findHeaderSynonym(row: ExcelRow, synonyms: string[]): unknown {
  const keys = Object.keys(row);
  const normalizedKeys = keys.map((key) => key.trim().toLowerCase());

  for (const synonym of synonyms) {
    const index = normalizedKeys.indexOf(synonym.toLowerCase());
    if (index !== -1) {
      const originalKey = keys[index];
      if (originalKey) {
        return row[originalKey];
      }
    }
  }

  return undefined;
}

export function parseExcelMarkerRows(rows: ExcelRow[]): ExcelParseResult {
  const data: ImportedMarkerRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const timestampValue = findHeaderSynonym(row, TIME_SYNONYMS);
    const descriptionValue = findHeaderSynonym(row, DESCRIPTION_SYNONYMS) ?? "";

    if ((timestampValue === undefined || timestampValue === "") && descriptionValue === "") {
      return;
    }

    const timestampSeconds = normalizeTimestamp(timestampValue);
    if (timestampSeconds === null) {
      if (descriptionValue !== "" || (timestampValue !== undefined && timestampValue !== "")) {
        errors.push(`第 ${index + 2} 行: 时间格式无效或缺失 (\"${String(timestampValue)}\")`);
      }
      return;
    }

    data.push({
      timestampSeconds,
      description: String(descriptionValue ?? "").trim(),
    });
  });

  return { data, errors };
}
