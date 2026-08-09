/**
 * Pure utility functions for file-spooder.
 * No side effects, no R2/request dependencies.
 */

import { IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS, DOC_EXTS, ARCHIVE_EXTS, CODE_EXTS } from './config.js';

/**
 * Sanitize a file or folder name.
 * Rejects path traversal sequences and other dangerous characters.
 * @param {string} name
 * @returns {{ valid: boolean, sanitized: string, error?: string }}
 */
export function sanitizeName(name) {
  const trimmed = String(name).trim();
  if (!trimmed) {
    return { valid: false, sanitized: "", error: "Name cannot be empty" };
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { valid: false, sanitized: "", error: "Name cannot contain path separators" };
  }
  if (trimmed.includes("\0")) {
    return { valid: false, sanitized: "", error: "Name cannot contain null bytes" };
  }
  // Only reject parent directory traversal, allow normal dotfiles like .gitignore
  if (trimmed === ".." || trimmed.startsWith("../") || trimmed.includes("/../")) {
    return { valid: false, sanitized: "", error: "Invalid name" };
  }
  // Strip control characters only
  const sanitized = trimmed.replace(/[\x00-\x1f\x7f]/g, "");
  if (!sanitized) {
    return { valid: false, sanitized: "", error: "Invalid name after sanitization" };
  }
  return { valid: true, sanitized };
}

/** Validate an existing R2 object key without modifying it. */
export function isSafeObjectKey(key) {
  if (typeof key !== "string" || !key) return false;
  return key.split("/").every((part) => {
    const result = sanitizeName(part);
    return result.valid && result.sanitized === part;
  });
}

/** Validate a folder prefix (empty is the root; non-root values end in '/'). */
export function isSafeFolderPrefix(prefix) {
  if (prefix === "") return true;
  return typeof prefix === "string" && prefix.endsWith("/") && isSafeObjectKey(prefix.slice(0, -1));
}

/**
 * Generate standard CORS headers for public access.
 * @returns {object}
 */
export function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, x-password"
  };
}

/**
 * Format a byte count into a human-readable string.
 * @param {number|undefined|null} bytes
 * @returns {string}
 */
export function fmtSize(bytes) {
  if (bytes === undefined || bytes === null) return "";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = Number(bytes);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${Math.round(v * 10) / 10} ${units[i]}`;
}

/**
 * Encode a string for use in an href attribute.
 * @param {string} s
 * @returns {string}
 */
export const toHref = (s) => encodeURI(s);

/**
 * Escape HTML special characters to prevent XSS.
 * @param {*} s
 * @returns {string}
 */
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return map[ch] || ch;
});

/**
 * Get the lowercase file extension from a filename.
 * @param {string} filename
 * @returns {string} Lowercase extension without dot, or empty string.
 */
export function getFileExt(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Generate an HTML icon element for a file based on its extension.
 * @param {string} name - filename
 * @param {string} viewUrl - URL for thumbnail preview (images)
 * @returns {string} HTML string for the icon.
 */
export function getFileIcon(name, viewUrl) {
  const ext = getFileExt(name);

  // Image files - show thumbnail
  if (IMAGE_EXTS.includes(ext)) {
    return `<img class="thumb" src="${viewUrl}" alt="" loading="lazy" onerror="this.outerHTML='<svg class=icon width=16 height=16 viewBox=\\'0 0 24 24\\' fill=none><rect x=3 y=3 width=18 height=18 rx=2 stroke=#3a9fd9 stroke-width=1.5/><circle cx=8.5 cy=8.5 r=1.5 fill=#3a9fd9/><path d=\\'M21 15l-5-5L5 21\\' stroke=#3a9fd9 stroke-width=1.5/></svg>'" />`;
  }

  // Video files
  if (VIDEO_EXTS.includes(ext)) {
    return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#e57373" stroke-width="1.5"/>
      <path d="M10 8l6 4-6 4V8z" fill="#e57373"/>
    </svg>`;
  }

  // Audio files
  if (AUDIO_EXTS.includes(ext)) {
    return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V5l12-2v13" stroke="#ba68c8" stroke-width="1.5"/>
      <circle cx="6" cy="18" r="3" stroke="#ba68c8" stroke-width="1.5"/>
      <circle cx="18" cy="16" r="3" stroke="#ba68c8" stroke-width="1.5"/>
    </svg>`;
  }

  // Document files
  if (DOC_EXTS.includes(ext)) {
    return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#4fc3f7" stroke-width="1.5"/>
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="#4fc3f7" stroke-width="1.5"/>
    </svg>`;
  }

  // Archive files
  if (ARCHIVE_EXTS.includes(ext)) {
    return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 8v13H3V3h12l6 5z" stroke="#ffb74d" stroke-width="1.5"/>
      <path d="M10 10h4v2h-4zM10 14h4v2h-4z" stroke="#ffb74d" stroke-width="1.5"/>
    </svg>`;
  }

  // Code files
  if (CODE_EXTS.includes(ext)) {
    return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" stroke="#81c784" stroke-width="1.5"/>
    </svg>`;
  }

  // Default file icon
  return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/>
    <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
}
