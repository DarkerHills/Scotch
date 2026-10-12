import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components / Activity is intentionally disabled: this demo keeps all
  // state in a client store, and preserved (hidden) routes would leave dialogs
  // and transient UI open across navigations. Filters live in the URL instead.
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
