import type { MetadataRoute } from "next";

/** Closed beta: keep crawlers out (the login gate blocks them anyway). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
