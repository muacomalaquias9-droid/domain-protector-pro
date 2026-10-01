import { createFileRoute } from "@tanstack/react-router";
import { serveFile } from "@/lib/hosting.server";

export const Route = createFileRoute("/h/$slug/$")({
  server: {
    handlers: {
      GET: async ({ params }) => serveFile(params.slug, params._splat ?? ""),
    },
  },
});
