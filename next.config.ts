import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// CSP script-src: prod is strict (no unsafe-eval), dev keeps unsafe-eval
// because Next.js / Turbopack HMR depends on it. `unsafe-inline` stays
// only where Next requires it; move to nonces when feasible.
const scriptSrc = isProd
  ? ["'self'", "'unsafe-inline'"]
  : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    const commonHeaders = [
      // Prevent MIME type sniffing
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Prevent clickjacking
      { key: "X-Frame-Options", value: "DENY" },
      // Control referrer information
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable unnecessary browser features
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "Content-Security-Policy", value: csp },
    ];

    if (isProd) {
      // HSTS only in production — would block local dev without HTTPS
      commonHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [{ source: "/(.*)", headers: commonHeaders }];
  },
};

export default nextConfig;
