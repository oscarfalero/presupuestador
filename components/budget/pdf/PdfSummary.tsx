import type { StringKey } from "@/lib/i18n";
import type { ClientBudget } from "@/lib/clientExport";
import { pdfBase } from "./base";
import { StyleSheet, Text, View } from "./runtime";

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    fontSize: 14,
    fontWeight: "bold",
  },
  summaryExcluded: { fontSize: 8, color: "#71717a" },
});

type T = Record<StringKey, string>;

/** Page-1 executive summary: stacked totals plus terms and payment. */
export function PdfSummary({ client, t }: { client: ClientBudget; t: T }) {
  return (
    <View>
      <View style={styles.summaryRow}>
        <Text>{t["export.subtotal"]}:</Text>
        <Text>{client.subtotal.toFixed(2)}€</Text>
      </View>
      {client.ivaIncluded ? (
        <View style={styles.summaryRow}>
          <Text>
            {t["meta.vat"]} {client.ivaPct}%:
          </Text>
          <Text>{client.vatAmount.toFixed(2)}€</Text>
        </View>
      ) : null}
      <View style={styles.summaryTotal}>
        <Text>{t["export.total"]}:</Text>
        <Text>{client.total.toFixed(2)}€</Text>
      </View>
      {client.ivaIncluded ? null : (
        <View style={{ ...styles.summaryRow, justifyContent: "flex-end" }}>
          <Text style={styles.summaryExcluded}>{t["totals.vatExcluded"].toUpperCase()}</Text>
        </View>
      )}
      {client.terms ? (
        <View wrap={false}>
          <Text style={pdfBase.sectionTitle}>{t["section.terms"].toUpperCase()}</Text>
          <Text style={pdfBase.sectionBody}>{client.terms}</Text>
        </View>
      ) : null}
      {client.payment ? (
        <View wrap={false}>
          <Text style={pdfBase.sectionTitle}>{t["section.payment"].toUpperCase()}</Text>
          <Text style={pdfBase.sectionBody}>{client.payment}</Text>
        </View>
      ) : null}
    </View>
  );
}
