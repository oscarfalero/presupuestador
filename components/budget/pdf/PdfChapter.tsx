import type { StringKey } from "@/lib/i18n";
import type { ClientChapter } from "@/lib/clientExport";
import { StyleSheet, Text, View } from "./runtime";

const styles = StyleSheet.create({
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
});

type T = Record<StringKey, string>;

/** One chapter box: gray header with subtotal plus the items table. */
export function PdfChapter({ ch, t }: { ch: ClientChapter; t: T }) {
  return (
    <View style={styles.chapterBox} wrap={false}>
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
  );
}
