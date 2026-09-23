import { StyleSheet } from "./runtime";

/**
 * Shared PDF styles. Every file under pdf/ is loaded only through the
 * on-demand BudgetPdfDocument chunk (never in the initial bundle); the
 * renderer itself arrives via the single dynamic import in runtime.ts.
 */
export const pdfBase = StyleSheet.create({
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
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 10,
    marginBottom: 3,
  },
  sectionHeadText: { fontSize: 12, fontWeight: "bold", marginTop: 0, marginBottom: 0 },
});
