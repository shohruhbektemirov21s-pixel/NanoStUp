import JSZip from "jszip";
import { WebsiteSchema } from "../schema/website";

export async function exportToNextApp(schema: WebsiteSchema) {
  const zip = new JSZip();

  // 1. Root Files
  zip.file("package.json", JSON.stringify({
    name: schema.siteName.toLowerCase().replace(/\s+/g, '-'),
    version: "0.1.0",
    scripts: {
      "dev": "next dev",
      "build": "next build",
      "start": "next start"
    },
    dependencies: {
      "next": "14.2.0",
      "react": "^18",
      "react-dom": "^18",
      "lucide-react": "^0.300.0",
      "framer-motion": "^11.0.0",
      "tailwind-merge": "^2.0.0",
      "clsx": "^2.0.0"
    },
    devDependencies: {
      "typescript": "^5",
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
      "postcss": "^8",
      "tailwindcss": "^3.4.1"
    }
  }, null, 2));

  zip.file("tailwind.config.js", `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
      },
    },
  },
  plugins: [],
}
  `);

  zip.file("src/app/globals.css", `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #3b82f6; 
  --secondary: #64748b;
}
  `);

  // 2. Data
  zip.file("src/data/schema.json", JSON.stringify(schema, null, 2));

  // 3. Components (Simplified - in a real app would be more robust)
  // We'll bundle our renderer into the ZIP
  // For the purpose of this task, I'll just write the schema and a basic page that renders it.
  
  zip.file("src/app/page.tsx", `
import { WebsiteRenderer } from "@/components/WebsiteRenderer";
import schema from "@/data/schema.json";

export default function Home() {
  return <WebsiteRenderer schema={schema} />;
}
  `);

  // 4. Generate the ZIP
  const content = await zip.generateAsync({ type: "blob" });
  return content;
}
