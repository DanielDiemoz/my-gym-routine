import { createStart, createMiddleware } from "@tanstack/react-start";
import { isRedirect } from "@tanstack/react-router";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // TanStack Router re-throws redirect()/notFound() as plain objects, not
    // Error instances. Without this branch, the previous `"statusCode" in error`
    // check would re-throw them up to h3, which then wraps them into
    // `{unhandled:true,"message":"HTTPError"}` JSON — and `normalizeCatastrophicSsrResponse`
    // in src/server.ts turns that into the "This page didn't load" page.
    if (isRedirect(error)) throw error;
    if (error && typeof error === "object" && "isNotFound" in error) throw error;

    // Proper H3Error (or Error with statusCode): let it propagate naturally.
    if (error instanceof Error && "statusCode" in error) throw error;

    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
