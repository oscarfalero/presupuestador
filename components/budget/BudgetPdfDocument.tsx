import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Budget } from "@/lib/budget-types";
import { toClientBudget } from "@/lib/clientExport";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 18, marginBottom: 4, fontWeight: "bold" },
  meta: { marginBottom: 12, color: "#555" },
  chapter: { marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: "bold" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  code: { width: 36 },
  title: { flex: 1 },
  num: { width: 60, textAlign: "right" },
  total: { marginTop: 12, textAlign: "right", fontSize: 12, fontWeight: "bold" },
  subtotal: { textAlign: "right", marginTop: 4 },
});

/**
 * Client-facing PDF, built from the client-safe model.
 * Internal breakdown excluded by design (editor-only).
 */
export function BudgetPdfDocument({ budget }: { budget: Budget }) {
  const client = toClientBudget(budget);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{client.name}</Text>
        <Text style={styles.meta}>
          {client.clientName ? `Client: ${client.clientName} · ` : ""}{client.date} · VAT {client.ivaPct}%
        </Text>
        {client.details ? <Text style={styles.meta}>{client.details}</Text> : null}
        {client.chapters.map((ch) => (
          <View key={ch.number}>
            <Text style={styles.chapter}>
              {ch.number}. {ch.title}
            </Text>
            {ch.items.map((item) => (
              <View key={item.code} style={styles.row}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.title}>
                  {item.title} — {item.quantity} {item.um} x {item.price.toFixed(2)}€
                </Text>
                <Text style={styles.num}>{item.amount.toFixed(2)}€</Text>
              </View>
            ))}
            <Text style={styles.subtotal}>Subtotal: {ch.subtotal.toFixed(2)}€</Text>
          </View>
        ))}
        <Text style={styles.subtotal}>Subtotal: {client.subtotal.toFixed(2)}€</Text>
        <Text style={styles.subtotal}>VAT {client.ivaPct}%: {client.vatAmount.toFixed(2)}€</Text>
        <Text style={styles.total}>TOTAL: {client.total.toFixed(2)}€</Text>
      </Page>
    </Document>
  );
}
