import type { Budget } from "@/lib/budget-types";
import { toClientBudget } from "@/lib/clientExport";
import { getStrings } from "@/lib/i18n";
import { useLocaleStore } from "@/lib/locale";
import { useCompanyStore } from "@/lib/company";
import { formatPhone } from "@/lib/phone";
import { pdfBase } from "./pdf/base";
import { PdfCompanyHeader } from "./pdf/PdfCompanyHeader";
import { PdfSummary } from "./pdf/PdfSummary";
import { PdfChapter } from "./pdf/PdfChapter";
import { PdfSignature } from "./pdf/PdfSignature";
import { Document, Page, StyleSheet, Text, View } from "./pdf/runtime";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
});

/**
 * Client-facing PDF shell. Page 1: company header -> budget info ->
 * title/intro -> executive summary (totals, terms, payment) ->
 * signature. Page 2+: chapters and items. Internal breakdown
 * excluded by design (editor-only).
 */
export function BudgetPdfDocument({ budget }: { budget: Budget }) {
  const t = getStrings(useLocaleStore.getState().locale);
  const company = useCompanyStore.getState().profile;
  const client = toClientBudget(budget);
  const footerBits = [company.phone ? formatPhone(company.phone) : "", company.email, company.web].filter((s) => s && s.trim() !== "");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfCompanyHeader company={company} t={t} />
        <Text style={pdfBase.h1}>{client.name}</Text>
        {client.number ? (
          <Text style={pdfBase.meta}>
            {t["export.number"]} {client.number}
          </Text>
        ) : null}
        {client.date ? <Text style={pdfBase.meta}>{client.date}</Text> : null}
        {client.clientName ? (
          <Text style={pdfBase.meta}>
            {t["export.client"]} {client.clientName}
          </Text>
        ) : null}
        {client.address ? (
          <Text style={pdfBase.meta}>
            {t["meta.address"]}: {client.address}
          </Text>
        ) : null}
        {client.intro ? (
          <View wrap={false}>
            <Text style={pdfBase.pre}>{client.intro}</Text>
          </View>
        ) : null}
        <Text style={pdfBase.sectionTitle}>{t["section.summary"].toUpperCase()}</Text>
        <PdfSummary client={client} t={t} />
        <PdfSignature t={t} />
        <View break />
        <View style={pdfBase.sectionHead}>
          <Text style={pdfBase.sectionHeadText}>{t["section.chapters"].toUpperCase()}</Text>
          <Text style={pdfBase.sectionHeadText}>
            {t["export.total"]}: {client.total.toFixed(2)}€
          </Text>
        </View>
        {client.chapters.map((ch) => (
          <PdfChapter key={ch.number} ch={ch} t={t} />
        ))}
        {footerBits.length > 0 ? (
          <Text style={styles.footer} fixed>
            {[company.name, ...footerBits].filter((s) => s && s.trim() !== "").join(" · ")}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
