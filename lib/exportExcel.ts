import type ExcelJS from "exceljs";
import { toClientBudget, type ClientBudget } from "./clientExport";
import { fmt, getStrings } from "./i18n";
import { useLocaleStore } from "./locale";
import { useCompanyStore, type CompanyProfile } from "./company";
import type { Budget } from "./budget-types";

/**
 * Client-facing Excel export, built from the client-safe model plus the
 * company profile. The internal price breakdown is NEVER included.
 * Document order: company header -> budget info -> intro ->
 * chapters/totals -> terms -> payment.
 */
export async function exportBudgetToExcel(budget: Budget): Promise<void> {
  await exportClientBudgetToExcel(
    toClientBudget(budget),
    useCompanyStore.getState().profile,
  );
}

function tallRow(ws: ExcelJS.Worksheet, values: Record<string, string | number>, lines = 1) {
  const row = ws.addRow(values);
  if (lines > 1) row.height = 15 * lines;
  return row;
}

function blockLines(text: string): number {
  return text.split("\n").length;
}

export async function exportClientBudgetToExcel(
  client: ClientBudget,
  company: CompanyProfile,
): Promise<void> {
  // Loaded on demand so editing never pays the spreadsheet library cost.
  const { default: ExcelJS } = await import("exceljs");
  const t = getStrings(useLocaleStore.getState().locale);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Presupuestador";
  const ws = wb.addWorksheet(t["export.sheet"]);

  ws.columns = [
    { key: "code", width: 10 },
    { key: "title", width: 42 },
    { key: "description", width: 50 },
    { key: "um", width: 8 },
    { key: "qty", width: 10 },
    { key: "price", width: 14 },
    { key: "amount", width: 16 },
  ];

  // Company header: logo, name, NIF, phone, web.
  if (company.logoDataUrl && company.logoExt) {
    const imgId = wb.addImage({
      base64: company.logoDataUrl.split(",")[1] ?? "",
      extension: company.logoExt,
    });
    ws.addImage(imgId, "E1:G4");
    for (let r = 1; r <= 4; r++) ws.getRow(r).height = 28;
  }
  if (company.name) {
    const r = ws.addRow({ title: company.name });
    r.font = { bold: true, size: 14 };
  }
  if (company.taxId) ws.addRow({ title: `${t["export.nif"]} ${company.taxId}` });
  if (company.phone) ws.addRow({ title: company.phone });
  if (company.web) ws.addRow({ title: company.web });
  if (company.address) {
    const r = tallRow(ws, { title: company.address }, blockLines(company.address));
    r.alignment = { wrapText: true };
  }

  // Budget info block: number, date, client, address.
  ws.addRow({});
  if (client.number) {
    const r = ws.addRow({ title: `${t["export.number"]} ${client.number}` });
    r.font = { bold: true };
  }
  if (client.date) ws.addRow({ title: client.date });
  if (client.clientName) ws.addRow({ title: `${t["export.client"]} ${client.clientName}` });
  if (client.address) {
    const r = tallRow(ws, { title: `${t["meta.address"]}: ${client.address}` }, blockLines(client.address));
    r.alignment = { wrapText: true };
  }

  // Job title block.
  ws.addRow({});
  const titleRow = ws.addRow({ title: client.name });
  titleRow.font = { bold: true, size: 16 };
  if (client.intro) {
    const r = tallRow(ws, { title: client.intro }, blockLines(client.intro));
    r.alignment = { wrapText: true };
  }

  if (client.terms) {
    const label = ws.addRow({ title: t["section.terms"] });
    label.font = { bold: true };
    const r = tallRow(ws, { title: client.terms }, blockLines(client.terms));
    r.alignment = { wrapText: true };
    ws.addRow({});
  }
  const chaptersTitle = ws.addRow({ title: t["section.chapters"].toUpperCase() });
  chaptersTitle.font = { bold: true, size: 12 };
  const headerRow = ws.addRow({
    code: t["col.code"],
    title: t["col.title"],
    description: t["col.description"],
    um: t["col.um"],
    qty: t["col.qty"],
    price: t["col.price"],
    amount: t["col.amount"],
  });
  headerRow.font = { bold: true };

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

  if (client.payment) {
    ws.addRow({});
    const label = ws.addRow({ title: t["section.payment"] });
    label.font = { bold: true };
    const r = tallRow(ws, { title: client.payment }, blockLines(client.payment));
    r.alignment = { wrapText: true };
  }

  ws.addRow({});
  const signLabel = ws.addRow({ title: t["export.signature"] });
  signLabel.font = { bold: true };
  ws.addRow({});
  ws.addRow({});
  ws.addRow({ title: `${t["export.signClient"]}:` });
  ws.addRow({ title: `${t["export.sign"]} ________________________      ${t["export.signDate"]} ____________` });
  ws.addRow({});
  ws.addRow({ title: `${t["export.signCompany"]}:` });
  ws.addRow({ title: `${t["export.sign"]} ________________________` });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(client.number || client.name) || "budget"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}
