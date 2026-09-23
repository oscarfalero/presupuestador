import type { StringKey } from "@/lib/i18n";
import type { CompanyProfile } from "@/lib/company";
import { formatPhone } from "@/lib/phone";
import { pdfBase } from "./base";

// See base.ts: top-level await keeps the heavy renderer out of static imports.
const R = await import("@react-pdf/renderer");
const { Image, Path, Svg, Text, View } = R;

type T = Record<StringKey, string>;

function PinIcon() {
  return (
    <Svg style={pdfBase.companyIcon} viewBox="0 0 24 24">
      <Path
        d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        fill="#71717a"
      />
    </Svg>
  );
}

function PhoneIcon() {
  return (
    <Svg style={pdfBase.companyIcon} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
        fill="#71717a"
      />
    </Svg>
  );
}

/** Issuer header: logo, name, NIF, address and phone. */
export function PdfCompanyHeader({ company, t }: { company: CompanyProfile; t: T }) {
  if (!company.name && !company.logoDataUrl) return null;
  return (
    <View style={pdfBase.companyRow}>
      {/* Logo is decorative in the PDF context (company name follows as text) */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {company.logoDataUrl ? <Image style={pdfBase.logo} src={company.logoDataUrl} /> : null}
      <View>
        {company.name ? <Text style={pdfBase.companyName}>{company.name}</Text> : null}
        {company.taxId ? (
          <Text style={pdfBase.companyLine}>
            {t["export.nif"]} {company.taxId}
          </Text>
        ) : null}
        {company.address ? (
          <View style={pdfBase.companyIconRow}>
            <PinIcon />
            <Text style={pdfBase.companyLine}>{company.address}</Text>
          </View>
        ) : null}
        {company.phone ? (
          <View style={pdfBase.companyIconRow}>
            <PhoneIcon />
            <Text style={pdfBase.companyLine}>{formatPhone(company.phone)}</Text>
          </View>
        ) : null}
        {company.web ? <Text style={pdfBase.companyLine}>{company.web}</Text> : null}
      </View>
    </View>
  );
}
