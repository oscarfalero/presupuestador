import type { StringKey } from "@/lib/i18n";
import { pdfBase } from "./base";

// See base.ts: top-level await keeps the heavy renderer out of static imports.
const R = await import("@react-pdf/renderer");
const { StyleSheet, Text, View } = R;

const styles = StyleSheet.create({
  signBlock: { marginTop: 24 },
  signCols: { flexDirection: "row", gap: 48, marginTop: 56 },
  signCol: { flex: 1 },
});

type T = Record<StringKey, string>;

/** Acceptance signature: bare Cliente / Empresa labels, no lines. */
export function PdfSignature({ t }: { t: T }) {
  return (
    <View style={styles.signBlock} wrap={false}>
      <Text style={pdfBase.sectionTitle}>{t["export.signature"].toUpperCase()}</Text>
      <View style={styles.signCols}>
        <View style={styles.signCol}>
          <Text>{t["export.signClient"]}</Text>
        </View>
        <View style={styles.signCol}>
          <Text>{t["export.signCompany"]}</Text>
        </View>
      </View>
    </View>
  );
}
