import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFKit loads its built-in AFM font metrics at runtime. Include these
  // assets in the Vercel serverless bundle for the report API route.
  outputFileTracingIncludes: {
    "/api/kri/report": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
