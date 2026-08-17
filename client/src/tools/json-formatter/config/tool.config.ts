// client/src/tools/json-formatter/config/tool.config.ts

export const toolConfig = {
  id: "json-formatter",
  name: "JSON Formatter",
  slug: "json-formatter",
  category: "Formatters",
  description: "Format, validate and inspect JSON quickly.",
  shortDescription: "Fast JSON formatting and validation.",
  version: "1.0.0",
  status: "active",
  route: "/tools/json-formatter",
  icon: "braces",
  theme: {
    mode: "both",
    accent: "#f97316",
  },
  features: [
    "One-click JSON beautification with configurable indent",
    "Minify JSON for production use",
    "Real-time syntax validation with error indicators",
    "Syntax-highlighted output",
    "Copy to clipboard with one click",
    "JSON path explorer",
  ],
  capabilities: [
    "offline-first",
    "sub-10ms-latency",
  ],
  seo: {
    title: "JSON Formatter & Validator — Free Online Tool | Acklet",
    description: "Format, validate, minify and inspect JSON directly in your browser.",
    keywords: ["json", "formatter", "beautify", "minify", "validator"],
  },
  analytics: {
    enabled: true,
    toolId: "json-formatter",
  },
};
