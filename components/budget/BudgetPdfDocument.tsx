import { Document, Image, Page, Path, Svg, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Budget } from "@/lib/budget-types";
import { toClientBudget } from "@/lib/clientExport";
import { fmt, getStrings } from "@/lib/i18n";
import { useLocaleStore } from "@/lib/locale";
import { useCompanyStore } from "@/lib/company";
import { formatPhone } from "@/lib/phone";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  companyRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logo: { width: 90, marginRight: 12, objectFit: "contain" },
  companyName: { fontSize: 14, fontWeight: "bold" },
  companyLine: { color: "#555", marginTop: 1 },
  companyIconRow: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  companyIcon: { width: 12, marginRight: 3 },
  h1: { fontSize: 18, marginTop: 8, marginBottom: 4, fontWeight: "bold" },
  meta: { marginBottom: 6, color: "#555" },
  pre: { marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 10, marginBottom: 3 },
  sectionBody: { marginBottom: 6 },
  signBlock: { marginTop: 24 },
  signCols: { flexDirection: "row", gap: 48, marginTop: 56 },
  signCol: { flex: 1 },
  signLine: { marginTop: 4 },
  chapterBox: { borderWidth: 0.5, borderColor: "#e4e4e7", borderRadius: 6, marginTop: 12 },
  chapterHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e4e4e7",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  chapterTitle: { flex: 1, fontSize: 12, fontWeight: "bold" },
  chapterSubtotal: { fontSize: 10, fontWeight: "bold" },
  chapterBody: { paddingHorizontal: 8, paddingBottom: 6 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: "bold",
    color: "#555",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  cellCode: { width: 30 },
  cellTitle: { flex: 1, paddingRight: 6 },
  cellUm: { width: 28, textAlign: "center" },
  cellQty: { width: 36, textAlign: "right" },
  cellPrice: { width: 52, textAlign: "right" },
  cellAmount: { width: 60, textAlign: "right" },
  itemDesc: { fontSize: 8, color: "#555", marginTop: 1 },
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

function PinIcon() {
  return (
    <Svg style={styles.companyIcon} viewBox="0 0 24 24">
      <Path
        d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        fill="#71717a"
      />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg style={styles.companyIcon} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
        fill="#71717a"
      />
    </Svg>
  );
}

/**
 * Client-facing PDF. Page 1: company header -> budget info ->
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
        {(company.name || company.logoDataUrl) && (
          <View style={styles.companyRow}>
            {/* Logo is decorative in the PDF context (company name follows as text) */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {company.logoDataUrl ? <Image style={styles.logo} src={company.logoDataUrl} /> : null}
            <View>
              {company.name ? <Text style={styles.companyName}>{company.name}</Text> : null}
              {company.taxId ? <Text style={styles.companyLine}>{t["export.nif"]} {company.taxId}</Text> : null}
              {company.address ? (
                <View style={styles.companyIconRow}>
                  <PinIcon />
                  <Text style={styles.companyLine}>{company.address}</Text>
                </View>
              ) : null}
              {company.phone ? (
                <View style={styles.companyIconRow}>
                  <PhoneIcon />
                  <Text style={styles.companyLine}>{formatPhone(company.phone)}</Text>
                </View>
              ) : null}
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
        {client.intro ? (
          <View wrap={false}>
            <Text style={styles.pre}>{client.intro}</Text>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>{t["section.summary"].toUpperCase()}</Text>
        <Text style={styles.subtotal}>
          {t["export.subtotal"]}: {client.subtotal.toFixed(2)}€
        </Text>
        {client.ivaIncluded ? (
          <Text style={styles.subtotal}>
            {fmt(t["export.vat"], { n: client.ivaPct })}: {client.vatAmount.toFixed(2)}€
          </Text>
        ) : null}
        <Text style={styles.total}>
          {t["export.total"]}: {client.total.toFixed(2)}€
          {client.ivaIncluded ? "" : ` (${t["totals.vatExcluded"].toUpperCase()})`}
        </Text>
        {client.terms ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t["section.terms"].toUpperCase()}</Text>
            <Text style={styles.sectionBody}>{client.terms}</Text>
          </View>
        ) : null}
        {client.payment ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>{t["section.payment"].toUpperCase()}</Text>
            <Text style={styles.sectionBody}>{client.payment}</Text>
          </View>
        ) : null}
        <View style={styles.signBlock} wrap={false}>
          <Text style={styles.sectionTitle}>{t["export.signature"].toUpperCase()}</Text>
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
        <View break />
        <Text style={styles.sectionTitle}>{t["section.chapters"].toUpperCase()}</Text>
        {client.chapters.map((ch) => (
          <View key={ch.number} style={styles.chapterBox} wrap={false}>
            <View style={styles.chapterHead}>
              <Text style={styles.chapterTitle}>
                {ch.number}. {ch.title}
              </Text>
              <Text style={styles.chapterSubtotal}>
                {t["export.subtotal"]}: {ch.subtotal.toFixed(2)}€
              </Text>
            </View>
            <View style={styles.chapterBody}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellCode}>{t["col.code"]}</Text>
              <Text style={styles.cellTitle}>{t["col.title"]}</Text>
              <Text style={styles.cellUm}>{t["col.um"]}</Text>
              <Text style={styles.cellQty}>{t["col.qty"]}</Text>
              <Text style={styles.cellPrice}>{t["col.price"]}</Text>
              <Text style={styles.cellAmount}>{t["col.amount"]}</Text>
            </View>
            {ch.items.map((item) => (
              <View key={item.code} style={styles.tableRow} wrap={false}>
                <Text style={styles.cellCode}>{item.code}</Text>
                <View style={styles.cellTitle}>
                  <Text>{item.title}</Text>
                  {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                </View>
                <Text style={styles.cellUm}>{item.um}</Text>
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellPrice}>{item.price.toFixed(2)}€</Text>
                <Text style={styles.cellAmount}>{item.amount.toFixed(2)}€</Text>
              </View>
            ))}
            </View>
          </View>
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
