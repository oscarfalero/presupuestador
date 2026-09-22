import ExcelJS from "exceljs";
import { toClientBudget, type ClientBudget } from "./clientExport";
import { fmt, getStrings } from "./i18n";
import { useLocaleStore } from "./locale";
import type { Budget } from "./budget-types";

/**
 * Client-facing Excel export, built from the client-safe model.
 * The internal price breakdown is NEVER included (editor-only).
 */
export async function exportBudgetToExcel(budget: Budget): Promise<void> {
  await exportClientBudgetToExcel(toClientBudget(budget));
}

export async function exportClientBudgetToExcel(client: ClientBudget): Promise<void> {
  const t = getStrings(useLocaleStore.getState().locale);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Presupuestador";
  const ws = wb.addWorksheet(t["export.sheet"]);

  ws.columns = [
    { header: t["col.code"], key: "code", width: 10 },
    { header: t["col.title"], key: "title", width: 42 },
    { header: t["col.description"], key: "description", width: 50 },
    { header: t["col.um"], key: "um", width: 8 },
    { header: t["col.qty"], key: "qty", width: 10 },
    { header: t["col.price"], key: "price", width: 14 },
    { header: t["col.amount"], key: "amount", width: 16 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true };

  for (const ch of client.chapters) {
    const titleRow = ws.addRow({ title: `${ch.number}. ${ch.title}` });
    titleRow.font = { bold: true };
    for (const item of ch.items) {
      ws.addRow({
        code: item.code,
        title: item.title,
        description: item.description,
        um: item.um,
        qty: item.quantity,
        price: item.price,
        amount: item.amount,
      });
    }
    const subtotalRow = ws.addRow({ title: `${t["export.subtotalChapter"]} ${ch.title}`, amount: ch.subtotal });
    subtotalRow.font = { italic: true };
  }

  ws.addRow({});
  ws.addRow({ title: t["export.subtotal"], amount: client.subtotal });
  ws.addRow({ title: fmt(t["export.vat"], { n: client.ivaPct }), amount: client.vatAmount });
  const totalRow = ws.addRow({ title: t["export.total"], amount: client.total });
  totalRow.font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(client.name) || "budget"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
