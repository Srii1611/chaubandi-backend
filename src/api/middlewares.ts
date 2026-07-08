import { defineMiddlewares, authenticate } from "@medusajs/framework/http";

/**
 * Global API Middleware
 * - CORS is handled by projectConfig in medusa-config.ts
 * - Admin routes (/admin/*) are protected by Medusa's built-in auth
 * - Custom store routes that act on behalf of a customer require
 *   an authenticated customer session or bearer token.
 * - /store/appointments/slots stays public (browsable before login).
 */
export default defineMiddlewares({
  routes: [
    // Exact-match regexes: string matchers are prefix-based, which would
    // wrongly require auth on the public /store/appointments/slots route.
    {
      matcher: /^\/store\/appointments$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/appointments\/pay(\/confirm)?$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/measurements$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: /^\/store\/inspiration$/,
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
});
