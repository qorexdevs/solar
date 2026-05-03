/**
 * Scenario report exporters (PDF + Excel).
 *
 * Re-exported for ergonomic imports from `@/lib/exporters`.
 */
export { buildExcelWorkbook, downloadExcel, type ExcelOptions } from './excel';
export { buildPdf, downloadPdf, type PdfOptions } from './pdf';
export {
  buildPPATermSheet,
  downloadPPATermSheet,
  type PPATermSheetInputs,
} from './ppa';
