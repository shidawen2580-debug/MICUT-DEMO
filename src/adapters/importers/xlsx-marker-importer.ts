import * as XLSX from "xlsx";
import { parseExcelMarkerRows } from "../../domain/markers/excel-marker-parser.js";
import type { MarkerImporter, MarkerImporterResult } from "../../domain/markers/marker-importer.js";

export class XlsxMarkerImporter implements MarkerImporter {
  async parse(input: string | Buffer): Promise<MarkerImporterResult> {
    const buffer = typeof input === "string" ? Buffer.from(input, "base64") : input;
    const workbook = XLSX.read(buffer, { type: "buffer", raw: true, cellNF: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { data: [], errors: ["工作簿中没有工作表"] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return { data: [], errors: ["工作表内容不存在"] };
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
    return parseExcelMarkerRows(rows);
  }
}
