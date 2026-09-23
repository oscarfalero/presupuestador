/**
 * Single entry point for the PDF renderer. The top-level dynamic import
 * keeps @react-pdf/renderer out of every static import graph: this module
 * is only ever reached through the editor's on-demand
 * `import(\"./BudgetPdfDocument\")`, so the heavy library ships exclusively
 * inside the export chunk, never in the initial bundle.
 */
const R = await import("@react-pdf/renderer");

export const { Document, Image, Page, Path, StyleSheet, Svg, Text, View } = R;
