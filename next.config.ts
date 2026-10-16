import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((iface): iface is NonNullable<typeof iface> => Boolean(iface && iface.family === "IPv4"))
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
};

export default nextConfig;
