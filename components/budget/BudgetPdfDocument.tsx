import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { budgetSubtotal, budgetTotalWithIva, chapterSubtotal, itemAmount } from "@/lib/calc";
import type { Budget } from "@/lib/budget-types";

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
 * Client-facing PDF. Internal breakdown excluded by design (editor-only).
 */
export function BudgetPdfDocument({ budget }: { budget: Budget }) {
  const chapters = [...budget.chapters].sort((a, b) => a.order - b.order);
  const subtotal = budgetSubtotal(budget.items);
  const total = budgetTotalWithIva(subtotal, budget.ivaPct);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{budget.name}</Text>
        <Text style={styles.meta}>
          {budget.clientName ? `Client: ${budget.clientName} · ` : ""}{budget.date} · VAT {budget.ivaPct}%
        </Text>
        {budget.details ? <Text style={styles.meta}>{budget.details}</Text> : null}
        {chapters.map((ch) => {
          const chItems = budget.items
            .filter((i) => i.chapterId === ch.id)
            .sort((a, b) => a.order - b.order);
          return (
            <View key={ch.id}>
              <Text style={styles.chapter}>
                {ch.order + 1}. {ch.title}
              </Text>
              {chItems.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.code}>{item.code}</Text>
                  <Text style={styles.title}>
                    {item.title} — {item.quantity} {item.um} x {item.price.toFixed(2)}€
                  </Text>
                  <Text style={styles.num}>{itemAmount(item).toFixed(2)}€</Text>
                </View>
              ))}
              <Text style={styles.subtotal}>
                Subtotal: {chapterSubtotal(budget.items, ch.id).toFixed(2)}€
              </Text>
            </View>
          );
        })}
        <Text style={styles.subtotal}>Subtotal: {subtotal.toFixed(2)}€</Text>
        <Text style={styles.subtotal}>VAT {budget.ivaPct}%: {(total - subtotal).toFixed(2)}€</Text>
        <Text style={styles.total}>TOTAL: {total.toFixed(2)}€</Text>
      </Page>
    </Document>
  );
}
