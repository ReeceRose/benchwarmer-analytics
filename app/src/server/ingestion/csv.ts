import { Readable } from "node:stream";
import { parse } from "csv-parse";

// Field types:
// - int: 32-bit integer (strict integer text)
// - decimal: kept as the exact source text so numeric columns are stored
//   without a float round-trip
// - double: parsed to a JS number
// - string
// A trailing "?" marks a nullable field: empty text becomes null. For a
// non-nullable field, empty text is an error.
export type FieldType =
  | "int"
  | "int?"
  | "decimal"
  | "decimal?"
  | "double"
  | "double?"
  | "string"
  | "string?";

export interface FieldSpec {
  key: string;
  // Header name, or 0-based column index (validated against expectedHeaders).
  column: string | number;
  type: FieldType;
}

type BaseValue<T extends FieldType> = T extends "int" | "int?" | "double" | "double?" ? number : string;

type FieldValue<T extends FieldType> = T extends `${string}?` ? BaseValue<T> | null : BaseValue<T>;

export type ParsedRecord<F extends readonly FieldSpec[]> = {
  [K in F[number] as K["key"]]: FieldValue<K["type"]>;
};

const INT_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export class CsvValueError extends Error {}

// Value used when a column is missing from the file entirely: null for
// nullable fields, otherwise zero or an empty string.
function defaultValue(type: FieldType): number | string | null {
  if (type.endsWith("?")) return null;
  if (type === "string") return "";
  if (type === "decimal") return "0";
  return 0;
}

export function convertValue(raw: string, type: FieldType): number | string | null {
  const text = raw.trim();
  const nullable = type.endsWith("?");
  if (text === "") {
    if (nullable) return null;
    if (type === "string") return "";
    throw new CsvValueError(`empty value for non-nullable ${type}`);
  }
  switch (type) {
    case "string":
    case "string?":
      return raw;
    case "int":
    case "int?": {
      if (!INT_RE.test(text)) throw new CsvValueError(`invalid int "${raw}"`);
      const value = Number(text);
      if (!Number.isSafeInteger(value) || Math.abs(value) > 2 ** 31) {
        throw new CsvValueError(`int out of range "${raw}"`);
      }
      return value;
    }
    case "decimal":
    case "decimal?":
      if (!DECIMAL_RE.test(text)) throw new CsvValueError(`invalid decimal "${raw}"`);
      return text;
    case "double":
    case "double?": {
      const value = Number(text);
      if (!DECIMAL_RE.test(text) || !Number.isFinite(value)) {
        throw new CsvValueError(`invalid double "${raw}"`);
      }
      return value;
    }
  }
}

export interface ParseOptions {
  // For index-bound specs: the header name(s) accepted at each index, so a
  // MoneyPuck column reorder fails loudly instead of shifting data.
  expectedHeaders?: Record<number, string | readonly string[]>;
  // Called once with header names the spec expects but the file lacks.
  onMissingColumns?: (columns: string[]) => void;
}

type Source = ReadableStream<Uint8Array> | Readable | string;

function toReadable(source: Source): Readable {
  if (typeof source === "string") return Readable.from([source]);
  if (source instanceof Readable) return source;
  return Readable.fromWeb(source as import("node:stream/web").ReadableStream<Uint8Array>);
}

// Streams typed records from CSV text or a byte stream.
export async function* parseCsv<F extends readonly FieldSpec[]>(
  source: Source,
  fields: F,
  options: ParseOptions = {},
): AsyncGenerator<ParsedRecord<F>> {
  const parser = toReadable(source).pipe(parse({ bom: true, relax_column_count: true }));
  let indexes: (number | undefined)[] | undefined;
  let line = 1;

  for await (const row of parser as AsyncIterable<string[]>) {
    if (!indexes) {
      indexes = resolveColumns(row, fields, options);
      continue;
    }
    line++;
    const record: Record<string, number | string | null> = {};
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const index = indexes[i];
      if (index === undefined) {
        record[field.key] = defaultValue(field.type);
        continue;
      }
      try {
        record[field.key] = convertValue(row[index] ?? "", field.type);
      } catch (error) {
        if (error instanceof CsvValueError) {
          throw new CsvValueError(`line ${line}, column ${String(field.column)}: ${error.message}`);
        }
        throw error;
      }
    }
    yield record as ParsedRecord<F>;
  }
}

function resolveColumns(header: string[], fields: readonly FieldSpec[], options: ParseOptions) {
  const byName = new Map<string, number>();
  header.forEach((name, i) => {
    if (!byName.has(name)) byName.set(name, i);
  });

  for (const [index, expected] of Object.entries(options.expectedHeaders ?? {})) {
    const actual = header[Number(index)];
    const accepted = typeof expected === "string" ? [expected] : expected;
    if (!accepted.includes(actual)) {
      throw new CsvValueError(`expected header "${accepted.join('" or "')}" at column ${index}, found "${actual ?? "<none>"}"`);
    }
  }

  const missing: string[] = [];
  const indexes = fields.map((field) => {
    if (typeof field.column === "number") {
      if (field.column < header.length) return field.column;
      missing.push(`#${field.column}`);
      return undefined;
    }
    const index = byName.get(field.column);
    if (index === undefined) missing.push(field.column);
    return index;
  });
  if (missing.length > 0) options.onMissingColumns?.(missing);
  return indexes;
}
