import ExcelJS from "exceljs";
import { budgetSubtotal, budgetTotalWithIva, chapterSubtotal, itemAmount } from "./calc";
import type { Budget } from "./budget-types";

/**
 * Client-facing Excel export.
 * The internal price breakdown is NEVER included (editor-only).
 */
export async function exportBudgetToExcel(budget: Budget): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Presupuestador";
  const ws = wb.addWorksheet("Budget");

  ws.columns = [
    { header: "Code", key: "code", width: 10 },
    { header: "Title", key: "title", width: 42 },
    { header: "Description", key: "description", width: 50 },
    { header: "UM", key: "um", width: 8 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Price", key: "price", width: 14 },
    { header: "Amount", key: "amount", width: 16 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true };

  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const items = [...budget.items];

  for (const ch of chapters) {
    const chItems = items
      .filter((i) => i.chapterId === ch.id)
      .sort((a, b) => a.order - b.order);
    const titleRow = ws.addRow({ title: `${ch.order + 1}. ${ch.title}` });
    titleRow.font = { bold: true };
    for (const item of chItems) {
      ws.addRow({
        code: item.code,
        title: item.title,
        description: item.description,
        um: item.um,
        qty: item.quantity,
        price: item.price,
        amount: itemAmount(item),
      });
    }
    const subtotalRow = ws.addRow({ title: `Subtotal ${ch.title}`, amount: chapterSubtotal(items, ch.id) });
    subtotalRow.font = { italic: true };
  }

  const subtotal = budgetSubtotal(budget.items);
  ws.addRow({});
  ws.addRow({ title: "Subtotal", amount: subtotal });
  ws.addRow({ title: `VAT ${budget.ivaPct}%`, amount: subtotal * (budget.ivaPct / 100) });
  const totalRow = ws.addRow({ title: "TOTAL", amount: budgetTotalWithIva(subtotal, budget.ivaPct) });
  totalRow.font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(budget.name) || "budget"}.xlsx`;
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
