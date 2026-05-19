import { defineConfig } from "astro/config";

const site = process.env.FORK_MARKETING_SITE ?? "https://felixfong227.github.io";
const base = process.env.FORK_MARKETING_BASE ?? "/t3code";

export default defineConfig({
  site,
  base,
  devToolbar: {
    enabled: false,
  },
  server: {
    port: Number(process.env.PORT ?? 4174),
  },
});
