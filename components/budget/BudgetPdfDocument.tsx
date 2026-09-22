import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Budget } from "@/lib/budget-types";
import { toClientBudget } from "@/lib/clientExport";
import { fmt, getStrings } from "@/lib/i18n";
import { useLocaleStore } from "@/lib/locale";
import { useCompanyStore } from "@/lib/company";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  companyRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logo: { width: 90, marginRight: 12, objectFit: "contain" },
  companyName: { fontSize: 14, fontWeight: "bold" },
  companyLine: { color: "#555", marginTop: 1 },
  h1: { fontSize: 18, marginTop: 8, marginBottom: 4, fontWeight: "bold" },
  meta: { marginBottom: 6, color: "#555" },
  pre: { marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 10, marginBottom: 3 },
  sectionBody: { marginBottom: 6 },
  signBlock: { marginTop: 24 },
  signCols: { flexDirection: "row", gap: 48, marginTop: 56 },
  signCol: { flex: 1 },
  signLine: { marginTop: 4 },
  chapter: { marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: "bold" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  code: { width: 36 },
  title: { flex: 1 },
  num: { width: 60, textAlign: "right" },
  total: { marginTop: 12, textAlign: "right", fontSize: 12, fontWeight: "bold" },
  subtotal: { textAlign: "right", marginTop: 4 },
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
 * Client-facing PDF. Document order: company header -> budget info ->
 * intro -> chapters/totals -> terms -> payment. Internal breakdown
 * excluded by design (editor-only).
 */
export function BudgetPdfDocument({ budget }: { budget: Budget }) {
  const t = getStrings(useLocaleStore.getState().locale);
  const company = useCompanyStore.getState().profile;
  const client = toClientBudget(budget);
  const footerBits = [company.phone, company.email, company.web].filter((s) => s && s.trim() !== "");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {(company.name || company.logoDataUrl) && (
          <View style={styles.companyRow}>
            {/* Logo is decorative in the PDF context (company name follows as text) */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {company.logoDataUrl ? <Image style={styles.logo} src={company.logoDataUrl} /> : null}
            <View>
              {company.name ? <Text style={styles.companyName}>{company.name}</Text> : null}
              {company.taxId ? <Text style={styles.companyLine}>{t["export.nif"]} {company.taxId}</Text> : null}
              {company.address ? <Text style={styles.companyLine}>{company.address}</Text> : null}
              {company.phone ? <Text style={styles.companyLine}>{company.phone}</Text> : null}
              {company.web ? <Text style={styles.companyLine}>{company.web}</Text> : null}
            </View>
          </View>
        )}
        <Text style={styles.h1}>{client.name}</Text>
        {client.number ? (
          <Text style={styles.meta}>
            {t["export.number"]} {client.number}
          </Text>
        ) : null}
        {client.date ? <Text style={styles.meta}>{client.date}</Text> : null}
        {client.clientName ? (
          <Text style={styles.meta}>
            {t["export.client"]} {client.clientName}
          </Text>
        ) : null}
        {client.address ? (
          <Text style={styles.meta}>
            {t["meta.address"]}: {client.address}
          </Text>
        ) : null}
        {client.intro ? <Text style={styles.pre}>{client.intro}</Text> : null}
        <Text style={styles.sectionTitle}>{t["section.chapters"].toUpperCase()}</Text>
        {client.chapters.map((ch) => (
          <View key={ch.number} wrap={false}>
            <Text style={styles.chapter}>
              {ch.number}. {ch.title}
            </Text>
            {ch.items.map((item) => (
              <View key={item.code} style={styles.row} wrap={false}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.title}>
                  {item.title} — {item.quantity} {item.um} x {item.price.toFixed(2)}€
                </Text>
                <Text style={styles.num}>{item.amount.toFixed(2)}€</Text>
              </View>
            ))}
            <Text style={styles.subtotal}>
              {t["export.subtotal"]}: {ch.subtotal.toFixed(2)}€
            </Text>
          </View>
        ))}
        <Text style={styles.subtotal}>
          {t["export.subtotal"]}: {client.subtotal.toFixed(2)}€
        </Text>
        <Text style={styles.subtotal}>
          {fmt(t["export.vat"], { n: client.ivaPct })}: {client.vatAmount.toFixed(2)}€
        </Text>
        <Text style={styles.total}>
          {t["export.total"]}: {client.total.toFixed(2)}€
        </Text>
        {client.terms ? (
          <View>
            <Text style={styles.sectionTitle}>{t["section.terms"]}</Text>
            <Text style={styles.sectionBody}>{client.terms}</Text>
          </View>
        ) : null}
        {client.payment ? (
          <View>
            <Text style={styles.sectionTitle}>{t["section.payment"]}</Text>
            <Text style={styles.sectionBody}>{client.payment}</Text>
          </View>
        ) : null}
        <View style={styles.signBlock}>
          <Text style={styles.sectionTitle}>{t["export.signature"]}</Text>
          <View style={styles.signCols}>
            <View style={styles.signCol}>
              <Text>{t["export.signClient"]}:</Text>
              <Text style={styles.signLine}>{t["export.sign"]} ________________________</Text>
              <Text style={styles.signLine}>{t["export.signDate"]} ____________</Text>
            </View>
            <View style={styles.signCol}>
              <Text>{t["export.signCompany"]}:</Text>
              <Text style={styles.signLine}>{t["export.sign"]} ________________________</Text>
            </View>
          </View>
        </View>
        {footerBits.length > 0 ? (
          <Text style={styles.footer} fixed>
            {[company.name, ...footerBits].filter((s) => s && s.trim() !== "").join(" · ")}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
