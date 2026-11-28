import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// PDFKit resolves built-in AFM files relative to the bundled API route
// on Vercel. Place the required font metrics beside that route bundle.
const source = resolve("node_modules/pdfkit/js/data");
const destination = resolve(".next/server/app/api/kri/report/data");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

console.log("Copied PDFKit AFM font metrics into the KRI report route bundle.");

