/**
 * Authentication middleware for file-spooder.
 * Validates the x-password header against the ADMIN_PASSWORD env var.
 */

/**
 * Check if the request is authorized.
 * @param {Request} request
 * @param {object} env - Worker environment bindings
 * @returns {Response|null} Returns a 401 Response if unauthorized, or null if authorized.
 */
export function requireAuth(request, env) {
  const pass = request.headers.get("x-password") || "";
  // Never treat a missing deployment secret as an empty valid password.
  if (!env.ADMIN_PASSWORD || pass !== env.ADMIN_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
