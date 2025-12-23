export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (!path.startsWith("/")) path = "/" + path;

    // === CONFIG ===
    const ADMIN_PASSWORD = "pineapple";

    // === HELPERS ===
    function fmtSize(bytes) {
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

    const toHref = (s) => encodeURI(s);

    // === SERVER-SIDE ACTIONS ===
    // Create Link
    if (request.method === "POST" && url.searchParams.get("createLink") === "1") {
      const pass = request.headers.get("x-password") || "";
      if (pass !== ADMIN_PASSWORD) {
        return new Response("Unauthorized", { status: 401 });
      }

      let data = {};
      try {
        data = await request.json();
      } catch (e) {
        return new Response("Bad JSON", { status: 400 });
      }


      let targetUrl = data.url;
      const linkName = data.name || "link";
      if (!targetUrl) return new Response("No URL provided", { status: 400 });

      // Auto-convert GitHub blob URLs to raw URLs
      const githubBlobRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/;
      const match = targetUrl.match(githubBlobRegex);
      if (match) {
        // match[1]=user, match[2]=repo, match[3]=branch/path
        targetUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
      }

      // Ensure URL has a protocol
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = "https://" + targetUrl;
      }

      const currentPrefix = path.endsWith("/") ? path.slice(1) : "";
      const key = currentPrefix + linkName + ".link";

      // Store the URL as a text file with .link extension
      await env.R2_BUCKET.put(key, targetUrl, {
        httpMetadata: { contentType: "text/plain" }
      });

      return new Response("OK", { status: 200 });
    }

    // Upload
    if (request.method === "POST" && url.searchParams.get("upload") === "1") {
      const pass = request.headers.get("x-password") || "";
      if (pass !== ADMIN_PASSWORD) {
        return new Response("Unauthorized", { status: 401 });
      }

      const form = await request.formData();
      const file = form.get("file");
      if (!file) return new Response("No file", { status: 400 });

      const currentPrefix = path.endsWith("/") ? path.slice(1) : "";
      const key = currentPrefix + file.name;
      const arrayBuffer = await file.arrayBuffer();

      await env.R2_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type }
      });

      return new Response("OK", { status: 200 });
    }

    // Rename or Delete
    if (request.method === "POST" && url.searchParams.get("action")) {
      const action = url.searchParams.get("action");
      const pass = request.headers.get("x-password") || "";
      if (pass !== ADMIN_PASSWORD) {
        return new Response("Unauthorized", { status: 401 });
      }

      let data = {};
      try {
        data = await request.json();
      } catch (e) {
        return new Response("Bad JSON", { status: 400 });
      }

      if (action === "delete") {
        const key = data.key;
        if (!key) return new Response("No key", { status: 400 });
        await env.R2_BUCKET.delete(key);
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { "content-type": "application/json" } 
        });
      }

      if (action === "rename") {
        const oldKey = data.key;
        const newName = data.newName;
        if (!oldKey || !newName) return new Response("Missing params", { status: 400 });

        const folder = oldKey.includes("/") ? oldKey.slice(0, oldKey.lastIndexOf("/") + 1) : "";
        const newKey = folder + newName;

        const obj = await env.R2_BUCKET.get(oldKey);
        if (!obj) return new Response("Not found", { status: 404 });

        const arrayBuffer = await obj.arrayBuffer();
        const ct = obj.httpMetadata?.contentType || "application/octet-stream";

        await env.R2_BUCKET.put(newKey, arrayBuffer, { 
          httpMetadata: { contentType: ct } 
        });
        await env.R2_BUCKET.delete(oldKey);

        return new Response(JSON.stringify({ ok: true, newKey }), { 
          headers: { "content-type": "application/json" } 
        });
      }

      if (action === "editLink") {
        const key = data.key;
        let newUrl = data.url;
        if (!key || !newUrl) return new Response("Missing params", { status: 400 });
        if (!key.endsWith(".link")) return new Response("Not a link file", { status: 400 });

        // Auto-convert GitHub blob URLs to raw URLs
        const githubBlobRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/;
        const match = newUrl.match(githubBlobRegex);
        if (match) {
          newUrl = `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
        }

        // Ensure URL has a protocol
        if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
          newUrl = "https://" + newUrl;
        }

        await env.R2_BUCKET.put(key, newUrl, {
          httpMetadata: { contentType: "text/plain" }
        });

        return new Response(JSON.stringify({ ok: true }), { 
          headers: { "content-type": "application/json" } 
        });
      }

      if (action === "getLink") {
        const key = data.key;
        if (!key) return new Response("No key", { status: 400 });
        if (!key.endsWith(".link")) return new Response("Not a link file", { status: 400 });

        const obj = await env.R2_BUCKET.get(key);
        if (!obj) return new Response("Not found", { status: 404 });

        const url = await obj.text();
        return new Response(JSON.stringify({ ok: true, url }), { 
          headers: { "content-type": "application/json" } 
        });
      }

      if (action === "createFolder") {
        const folderName = data.name;
        if (!folderName) return new Response("No folder name", { status: 400 });
        
        // Sanitize folder name
        const cleanName = folderName.trim().replace(/[\/\\]/g, "");
        if (!cleanName) return new Response("Invalid folder name", { status: 400 });
        
        const currentPrefix = path.endsWith("/") ? path.slice(1) : "";
        const key = currentPrefix + cleanName + "/.folder";
        
        // Create a placeholder file to make the folder exist
        await env.R2_BUCKET.put(key, "", {
          httpMetadata: { contentType: "text/plain" }
        });
        
        return new Response(JSON.stringify({ ok: true }), { 
          headers: { "content-type": "application/json" } 
        });
      }

      if (action === "copyFile") {
        const sourceKey = data.key;
        const destFolder = data.destFolder || "";
        if (!sourceKey) return new Response("No source key", { status: 400 });
        
        const obj = await env.R2_BUCKET.get(sourceKey);
        if (!obj) return new Response("Source not found", { status: 404 });
        
        const fileName = sourceKey.split("/").pop();
        const destKey = destFolder + fileName;
        
        const arrayBuffer = await obj.arrayBuffer();
        const ct = obj.httpMetadata?.contentType || "application/octet-stream";
        
        await env.R2_BUCKET.put(destKey, arrayBuffer, {
          httpMetadata: { contentType: ct }
        });
        
        return new Response(JSON.stringify({ ok: true, destKey }), {
          headers: { "content-type": "application/json" }
        });
      }

      if (action === "moveFile") {
        const sourceKey = data.key;
        const destFolder = data.destFolder || "";
        if (!sourceKey) return new Response("No source key", { status: 400 });
        
        const obj = await env.R2_BUCKET.get(sourceKey);
        if (!obj) return new Response("Source not found", { status: 404 });
        
        const fileName = sourceKey.split("/").pop();
        const destKey = destFolder + fileName;
        
        const arrayBuffer = await obj.arrayBuffer();
        const ct = obj.httpMetadata?.contentType || "application/octet-stream";
        
        await env.R2_BUCKET.put(destKey, arrayBuffer, {
          httpMetadata: { contentType: ct }
        });
        await env.R2_BUCKET.delete(sourceKey);
        
        return new Response(JSON.stringify({ ok: true, destKey }), {
          headers: { "content-type": "application/json" }
        });
      }

      if (action === "listFolders") {
        // List all folders in the bucket for folder selection
        const allList = await env.R2_BUCKET.list({ delimiter: "/" });
        const folders = [{path: "", display: "/ (Root)"}];
        
        async function listRecursive(prefix) {
          const list = await env.R2_BUCKET.list({ prefix, delimiter: "/" });
          const prefixes = list.commonPrefixes || list.prefixes || [];
          
          for (const p of prefixes) {
            folders.push({path: p, display: "/" + p});
            await listRecursive(p);
          }
        }
        
        const rootPrefixes = allList.commonPrefixes || allList.prefixes || [];
        for (const p of rootPrefixes) {
          folders.push({path: p, display: "/" + p});
          await listRecursive(p);
        }
        
        return new Response(JSON.stringify({ ok: true, folders }), {
          headers: { "content-type": "application/json" }
        });
      }

      if (action === "getStorageUsage") {
        // Calculate total storage used in the bucket
        let totalSize = 0;
        let cursor = undefined;
        
        do {
          const list = await env.R2_BUCKET.list({ cursor });
          const objects = list.objects || [];
          
          for (const obj of objects) {
            totalSize += obj.size || 0;
          }
          
          cursor = list.truncated ? list.cursor : undefined;
        } while (cursor);
        
        return new Response(JSON.stringify({ ok: true, totalSize }), {
          headers: { "content-type": "application/json" }
        });
      }

      return new Response("Unknown action", { status: 400 });
    }

    // === DIRECTORY LISTING ===
    if (path === "/" || path.endsWith("/")) {
      const prefix = path === "/" ? "" : path.slice(1);
      const list = await env.R2_BUCKET.list({ prefix, delimiter: "/" });
      const prefixes = list.commonPrefixes || list.prefixes || [];
      const objects = list.objects || [];

      let html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Files - ${prefix || 'Root'}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

:root { 
  --bg: #0b0c0d; 
  --card: #0f1112; 
  --border: #1a1b1e;
  --muted: #9aa4ad; 
  --text: #e8eaed;
  --accent: #3a9fd9;
  --hover: rgba(255,255,255,0.04);
}

body { 
  background: var(--bg); 
  color: var(--text); 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  padding: 16px;
}

.container { 
  max-width: 1200px; 
  margin: 0 auto; 
}

/* Header */
.header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  gap: 12px; 
  padding: 12px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.title { 
  font-size: 16px; 
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb {
  font-size: 13px;
  color: var(--muted);
  font-family: "SF Mono", Monaco, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb a {
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.2s;
}

.breadcrumb a:hover {
  opacity: 0.7;
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--muted);
  opacity: 0.5;
}

.controls { 
  display: flex; 
  gap: 8px; 
  align-items: center;
  flex-shrink: 0;
}

.search-box {
  position: relative;
}

.search-box input { 
  height: 32px; 
  width: 200px; 
  padding: 0 32px 0 10px; 
  border-radius: 6px; 
  background: var(--bg); 
  border: 1px solid var(--border); 
  color: var(--text); 
  outline: none; 
  font-size: 13px;
  transition: border-color 0.2s;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.5;
}

.sort-select {
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  outline: none;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.sort-select:focus {
  border-color: var(--accent);
}

.btn { 
  background: var(--card); 
  color: var(--text); 
  padding: 0 12px; 
  height: 32px;
  border-radius: 6px; 
  border: 1px solid var(--border); 
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:hover { 
  background: var(--hover); 
  border-color: var(--accent);
}

/* Storage Meter */
.storage-meter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.storage-text {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.storage-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.storage-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #5ab9ea);
  border-radius: 3px;
  transition: width 0.5s ease-out;
}

/* Bulk actions */
.bulk-actions {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--card);
  border: 1px solid var(--accent);
  border-radius: 8px;
  margin-bottom: 12px;
}

.bulk-actions.active {
  display: flex;
}

.bulk-info {
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}

.bulk-btn {
  background: var(--card);
  color: var(--text);
  padding: 0 12px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn:hover {
  background: var(--hover);
  border-color: var(--accent);
}

.bulk-btn.danger:hover {
  border-color: #ff4d4d;
  color: #ff4d4d;
}

/* Progress */
.progress-wrap { 
  width: 100%; 
  margin-bottom: 12px; 
  display: none; 
  align-items: center; 
  gap: 12px;
  padding: 12px 16px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.progress { 
  height: 6px; 
  background: var(--bg); 
  border-radius: 3px; 
  overflow: hidden; 
  flex: 1;
}

.progress-bar { 
  height: 100%; 
  width: 0%; 
  background: var(--accent); 
  transition: width 150ms linear;
}

.progress-text { 
  min-width: 40px; 
  text-align: right; 
  color: var(--muted); 
  font-size: 12px;
  font-weight: 500;
}

/* Drop zone */
.drop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(58, 159, 217, 0.15);
  border: 3px dashed var(--accent);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  pointer-events: none;
}

.drop-overlay.active {
  display: flex;
}

.drop-message {
  background: var(--card);
  padding: 24px 48px;
  border-radius: 12px;
  border: 1px solid var(--accent);
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

/* List */
.list { 
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.item { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  gap: 12px; 
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.item:last-child {
  border-bottom: none;
}

.item:hover { 
  background: var(--hover);
}

.left { 
  display: flex; 
  align-items: center; 
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.file-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.item.selected {
  background: rgba(58, 159, 217, 0.1);
  border-left: 3px solid var(--accent);
}

.thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  background: var(--bg);
  border: 1px solid var(--border);
}

.name { 
  font-family: "SF Mono", Monaco, "Courier New", monospace;
  font-size: 13px;
  color: var(--text); 
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name:hover {
  color: var(--accent);
  text-decoration: underline;
}

.folder-name {
  color: var(--accent);
  font-weight: 500;
}

.right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.meta { 
  color: var(--muted); 
  font-size: 12px;
  min-width: 60px;
  text-align: right;
  font-family: "SF Mono", Monaco, monospace;
}

.actions {
  display: flex;
  gap: 4px;
}

.icon-btn { 
  background: transparent; 
  border: 0; 
  cursor: pointer; 
  padding: 6px; 
  border-radius: 4px; 
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.icon-btn:hover { 
  background: var(--hover); 
  color: var(--accent);
}

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: var(--muted);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

/* Toast notifications */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--card);
  color: var(--text);
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-size: 14px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
  max-width: 400px;
}

.toast.success {
  border-color: #1686c2ff;
}

.toast.error {
  border-color: #ff4d4d;
}

/* Modal dialogs */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

.modal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: scaleIn 0.2s ease-out;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text);
}

.modal-body {
  margin-bottom: 20px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
  font-family: "SF Mono", Monaco, monospace;
}

.modal-input[type="password"] {
  border-color: #ff4d4d;
}

.modal-input:focus {
  border-color: var(--accent);
}

.modal-input[type="password"]:focus {
  border-color: #ff4d4d;
}

.modal-label {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.modal-btn:hover {
  background: var(--hover);
}

.modal-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}

.modal-btn.primary:hover {
  opacity: 0.9;
}

/* Media Player Modal */
.media-modal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  animation: scaleIn 0.2s ease-out;
}

.media-modal video,
.media-modal audio {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  background: #000;
}

.media-modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text);
  word-break: break-all;
}

.media-modal-close {
  margin-top: 16px;
  width: 100%;
  padding: 10px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.media-modal-close:hover {
  background: var(--primary-hover);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .controls {
    justify-content: stretch;
  }
  
  .meta {
    display: none;
  }
  
  .modal {
    min-width: 90vw;
  }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-left">
      <div class="title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 7h6l2 2h10v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        Public Files
      </div>
      <div class="breadcrumb">`;
      
      // Generate clickable breadcrumb
      html += `<a href="/">/</a>`;
      if (prefix) {
        const parts = prefix.split('/').filter(p => p);
        let accumulated = '';
        parts.forEach((part, i) => {
          accumulated += part + '/';
          html += `<span class="breadcrumb-sep">/</span>`;
          if (i < parts.length - 1) {
            html += `<a href="/${accumulated}">${part}</a>`;
          } else {
            html += `<span>${part}</span>`;
          }
        });
      }
      
      html += `</div>
    </div>

    <div class="controls">
      <div class="storage-meter" id="storageMeter" style="display: none;">
        <div class="storage-text" id="storageText">Loading...</div>
        <div class="storage-bar">
          <div class="storage-bar-fill" id="storageFill" style="width: 0%"></div>
        </div>
      </div>
      <div class="search-box">
        <input id="q" placeholder="Search..." />
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      <select id="sortSelect" class="sort-select">
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="size-asc">Size (Small-Large)</option>
        <option value="size-desc">Size (Large-Small)</option>
        <option value="date-asc">Date (Old-New)</option>
        <option value="date-desc">Date (New-Old)</option>
      </select>
      <button id="uploadBtn" class="btn">Upload</button>
      <button id="createLinkBtn" class="btn">Create Link</button>
      <button id="createFolderBtn" class="btn">New Folder</button>
    </div>
  </div>

  <div id="bulkActions" class="bulk-actions">
    <div class="bulk-info"><span id="selectedCount">0</span> selected</div>
    <button id="selectAllBtn" class="bulk-btn">Select All</button>
    <button id="deselectAllBtn" class="bulk-btn">Deselect All</button>
    <button id="bulkDeleteBtn" class="bulk-btn danger">Delete Selected</button>
  </div>

  <div id="dropOverlay" class="drop-overlay">
    <div class="drop-message">Drop files to upload</div>
  </div>

  <div id="progressWrap" class="progress-wrap">
    <div class="progress"><div id="progressBar" class="progress-bar"></div></div>
    <div id="progressText" class="progress-text">0%</div>
  </div>

  <div class="list">
    <div id="list">`;

      // Folders first
      for (const p of prefixes) {
        const display = p.replace(prefix, "").replace("/", "");
        const href = "/" + p;
        html += `<div class="item folder" data-name="${display.toLowerCase()}">
  <div class="left">
    <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 7h6l2 2h10v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="#3a9fd9" stroke-width="1.5"/>
    </svg>
    <a class="name folder-name" href="${toHref(href)}">${display}</a>
  </div>
  <div class="right">
    <div class="meta">—</div>
  </div>
</div>`;
      }

      // Files
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
      const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
      const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
      const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'];
      const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];
      const codeExts = ['js', 'ts', 'py', 'html', 'css', 'json', 'xml', 'yaml', 'yml'];

      function getFileExt(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
      }

      function getFileIcon(name, viewUrl) {
        const ext = getFileExt(name);
        
        // Image files - show thumbnail
        if (imageExts.includes(ext)) {
          return `<img class="thumb" src="${viewUrl}" alt="" loading="lazy" onerror="this.outerHTML='<svg class=icon width=16 height=16 viewBox=\\'0 0 24 24\\' fill=none><rect x=3 y=3 width=18 height=18 rx=2 stroke=#3a9fd9 stroke-width=1.5/><circle cx=8.5 cy=8.5 r=1.5 fill=#3a9fd9/><path d=\\'M21 15l-5-5L5 21\\' stroke=#3a9fd9 stroke-width=1.5/></svg>'" />`;
        }
        
        // Video files
        if (videoExts.includes(ext)) {
          return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#e57373" stroke-width="1.5"/>
            <path d="M10 8l6 4-6 4V8z" fill="#e57373"/>
          </svg>`;
        }
        
        // Audio files
        if (audioExts.includes(ext)) {
          return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="#ba68c8" stroke-width="1.5"/>
            <circle cx="6" cy="18" r="3" stroke="#ba68c8" stroke-width="1.5"/>
            <circle cx="18" cy="16" r="3" stroke="#ba68c8" stroke-width="1.5"/>
          </svg>`;
        }
        
        // Document files
        if (docExts.includes(ext)) {
          return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#4fc3f7" stroke-width="1.5"/>
            <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="#4fc3f7" stroke-width="1.5"/>
          </svg>`;
        }
        
        // Archive files
        if (archiveExts.includes(ext)) {
          return `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 8v13H3V3h12l6 5z" stroke="#ffb74d" stroke-width="1.5"/>
            <path d="M10 10h4v2h-4zM10 14h4v2h-4z" stroke="#ffb74d" stroke-width="1.5"/>
          </svg>`;
        }
        
        // Code files
        if (codeExts.includes(ext)) {
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

      for (const obj of objects) {
        const name = obj.key.replace(prefix, "");
        const isLink = name.endsWith(".link");
        const viewUrl = "/" + obj.key;
        const downloadUrl = "/" + obj.key + "?download=1";
        const sizeText = fmtSize(obj.size);
        
        // Format uploaded date
        const uploadedDate = obj.uploaded ? new Date(obj.uploaded).toLocaleDateString() : "";
        const uploadedTimestamp = obj.uploaded ? obj.uploaded.getTime() : 0;

        const iconHtml = isLink 
          ? `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#3a9fd9" stroke-width="1.5"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#3a9fd9" stroke-width="1.5"/>
            </svg>`
          : getFileIcon(name, toHref(viewUrl));

        html += `<div class="item file" data-name="${name.toLowerCase()}" data-key="${obj.key}" data-uploaded="${uploadedTimestamp}">
  <div class="left">
    <input type="checkbox" class="file-checkbox" data-key="${obj.key}" />
    ${iconHtml}
    <a class="name" href="${isLink ? toHref(viewUrl) : toHref(downloadUrl)}">${name}</a>
  </div>
  <div class="right">
    <div class="meta">${sizeText}${uploadedDate ? ` • ${uploadedDate}` : ''}</div>
    <div class="actions">
      <button class="icon-btn view-btn" data-href="${toHref(viewUrl)}" data-key="${obj.key}" title="View">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      ${isLink ? `<button class="icon-btn edit-link-btn" data-key="${obj.key}" title="Edit Link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="19" cy="19" r="4" fill="var(--card)" stroke="currentColor" stroke-width="1.5"/>
          <path d="M19 17v4M17 19h4" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>` : ''}
      <button class="icon-btn rename-btn" data-key="${obj.key}" title="Rename">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="icon-btn copy-btn" data-key="${obj.key}" title="Copy">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="icon-btn move-btn" data-key="${obj.key}" title="Move">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="icon-btn delete-btn" data-key="${obj.key}" title="Delete">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    </div>
  </div>
</div>`;
      }

      if (prefixes.length === 0 && objects.length === 0) {
        html += `<div class="empty-state">
  <div class="empty-state-icon">📁</div>
  <div>This folder is empty</div>
</div>`;
      }

      html += `</div>
  </div>
</div>

<script>
// Fetch and display storage usage
async function loadStorageUsage() {
  try {
    const res = await fetch(window.location.pathname + "?action=getStorageUsage", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (res.ok) {
      const data = await res.json();
      const totalSize = data.totalSize || 0;
      
      // Format size for display
      const formatSize = (bytes) => {
        if (bytes === 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        let v = bytes;
        while (v >= 1024 && i < units.length - 1) {
          v /= 1024;
          i++;
        }
        return `${(v).toFixed(2)} ${units[i]}`;
      };
      
      const sizeStr = formatSize(totalSize);
      
      // Assume a max of 10GB for visualization (adjust as needed)
      const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
      const percentage = Math.min((totalSize / maxSize) * 100, 100);
      
      document.getElementById('storageText').textContent = `Storage: ${sizeStr}`;
      document.getElementById('storageFill').style.width = percentage + '%';
      document.getElementById('storageMeter').style.display = 'flex';
    }
  } catch (err) {
    console.error('Failed to load storage usage:', err);
  }
}

// Load storage on page load
loadStorageUsage();

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal dialog helpers
function showModal(title, inputs, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  modal.appendChild(titleEl);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  
  const inputElements = [];
  inputs.forEach(input => {
    const label = document.createElement('label');
    label.className = 'modal-label';
    label.textContent = input.label;
    body.appendChild(label);
    
    const inputEl = document.createElement('input');
    inputEl.className = 'modal-input';
    inputEl.type = input.type || 'text';
    inputEl.placeholder = input.placeholder || '';
    inputEl.value = input.value || '';
    body.appendChild(inputEl);
    inputElements.push(inputEl);
  });
  
  modal.appendChild(body);
  
  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => overlay.remove();
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'modal-btn primary';
  confirmBtn.textContent = 'Confirm';
  confirmBtn.onclick = () => {
    const values = inputElements.map(el => el.value);
    overlay.remove();
    onConfirm(...values);
  };
  
  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);
  modal.appendChild(buttons);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Focus first input
  if (inputElements.length > 0) {
    inputElements[0].focus();
  }
  
  // Enter key to confirm
  inputElements.forEach((el, i) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (i < inputElements.length - 1) {
          inputElements[i + 1].focus();
        } else {
          confirmBtn.click();
        }
      }
    });
  });
  
  // Escape to cancel
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelBtn.click();
  });
  
  // Click overlay to cancel
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cancelBtn.click();
  });
}

function showConfirm(title, message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  modal.appendChild(titleEl);
  
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.textContent = message;
  modal.appendChild(body);
  
  const buttons = document.createElement('div');
  buttons.className = 'modal-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => overlay.remove();
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'modal-btn primary';
  confirmBtn.textContent = 'Confirm';
  confirmBtn.onclick = () => {
    overlay.remove();
    onConfirm();
  };
  
  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);
  modal.appendChild(buttons);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  confirmBtn.focus();
  
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelBtn.click();
    if (e.key === 'Enter') confirmBtn.click();
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cancelBtn.click();
  });
}

function askPassword(callback) {
  showModal("Password Required", [
    { label: "Password", type: "password", placeholder: "Enter password" }
  ], (password) => {
    if (password) callback(password);
  });
}

// Bulk selection
const bulkActions = document.getElementById("bulkActions");
const selectedCount = document.getElementById("selectedCount");
const selectAllBtn = document.getElementById("selectAllBtn");
const deselectAllBtn = document.getElementById("deselectAllBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const checkboxes = document.querySelectorAll(".file-checkbox");

function updateBulkUI() {
  const checked = Array.from(checkboxes).filter(cb => cb.checked);
  selectedCount.textContent = checked.length;
  
  if (checked.length > 0) {
    bulkActions.classList.add("active");
  } else {
    bulkActions.classList.remove("active");
  }
  
  // Update item styling
  checkboxes.forEach(cb => {
    const item = cb.closest(".item");
    if (cb.checked) {
      item.classList.add("selected");
    } else {
      item.classList.remove("selected");
    }
  });
}

checkboxes.forEach(cb => {
  cb.addEventListener("change", updateBulkUI);
});

selectAllBtn.addEventListener("click", () => {
  checkboxes.forEach(cb => cb.checked = true);
  updateBulkUI();
});

deselectAllBtn.addEventListener("click", () => {
  checkboxes.forEach(cb => cb.checked = false);
  updateBulkUI();
});

bulkDeleteBtn.addEventListener("click", () => {
  const checked = Array.from(checkboxes).filter(cb => cb.checked);
  const count = checked.length;
  
  if (count === 0) return;
  
  showConfirm("Delete Files", `Delete ${count} file(s)? This cannot be undone.`, () => {
    askPassword(async (password) => {
      let success = 0;
      let failed = 0;
      
      for (const cb of checked) {
        const key = cb.dataset.key;
        try {
          const res = await fetch(window.location.pathname + "?action=delete", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-password": password },
            body: JSON.stringify({ key })
          });
          
          if (res.status === 200) {
            success++;
          } else if (res.status === 401) {
            showToast("Incorrect password", "error");
            return;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
        }
      }
      
      if (failed === 0) {
        showToast(`Deleted ${success} file(s) successfully`, "success");
      } else {
        showToast(`Deleted ${success}, failed ${failed}`, "error");
      }
      
      setTimeout(() => location.reload(), 1000);
    });
  });
});

// Search
const q = document.getElementById("q");
const items = document.querySelectorAll(".item");
q.addEventListener("input", () => {
  const v = q.value.trim().toLowerCase();
  items.forEach(el => {
    const ok = !v || (el.dataset.name || "").includes(v);
    el.style.display = ok ? "flex" : "none";
  });
});

// Sort files
const sortSelect = document.getElementById("sortSelect");
const listContainer = document.getElementById("list");

sortSelect.addEventListener("change", () => {
  const [sortBy, order] = sortSelect.value.split("-");
  const fileItems = Array.from(document.querySelectorAll(".item.file"));
  const folderItems = Array.from(document.querySelectorAll(".item.folder"));
  
  fileItems.sort((a, b) => {
    let valA, valB;
    
    if (sortBy === "name") {
      valA = a.dataset.name || "";
      valB = b.dataset.name || "";
      return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (sortBy === "size") {
      valA = parseInt(a.querySelector(".meta")?.textContent.replace(/[^0-9]/g, "") || "0");
      valB = parseInt(b.querySelector(".meta")?.textContent.replace(/[^0-9]/g, "") || "0");
      return order === "asc" ? valA - valB : valB - valA;
    } else if (sortBy === "date") {
      valA = parseInt(a.dataset.uploaded || "0");
      valB = parseInt(b.dataset.uploaded || "0");
      return order === "asc" ? valA - valB : valB - valA;
    }
    return 0;
  });
  
  // Clear and re-append in sorted order
  listContainer.innerHTML = "";
  folderItems.forEach(item => listContainer.appendChild(item));
  fileItems.forEach(item => listContainer.appendChild(item));
  
  // Check if empty
  if (folderItems.length === 0 && fileItems.length === 0) {
    listContainer.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📁</div>
      <div>This folder is empty</div>
    </div>`;
  }
});

// Create Link
const createLinkBtn = document.getElementById("createLinkBtn");
createLinkBtn.addEventListener("click", async () => {
  showModal("Create Link", [
    { label: "URL", placeholder: "https://example.com" },
    { label: "Name (optional)", placeholder: "link" }
  ], async (url, name) => {
    if (!url) return;
    
    askPassword(async (password) => {
      try {
        const res = await fetch(window.location.pathname + "?createLink=1", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-password": password
          },
          body: JSON.stringify({ url, name: name || "link" })
        });
        
        if (res.status === 200) {
          showToast("Link created successfully", "success");
          setTimeout(() => location.reload(), 500);
        } else if (res.status === 401) {
          showToast("Incorrect password", "error");
        } else {
          showToast("Failed to create link: " + (await res.text()), "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });
  });
});

// Create Folder
const createFolderBtn = document.getElementById("createFolderBtn");
createFolderBtn.addEventListener("click", async () => {
  showModal("Create Folder", [
    { label: "Folder name", placeholder: "New Folder" }
  ], async (name) => {
    if (!name) return;
    
    askPassword(async (password) => {
      try {
        const res = await fetch(window.location.pathname + "?action=createFolder", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-password": password
          },
          body: JSON.stringify({ name })
        });
        
        if (res.status === 200) {
          showToast("Folder created successfully", "success");
          setTimeout(() => location.reload(), 500);
        } else if (res.status === 401) {
          showToast("Incorrect password", "error");
        } else {
          showToast("Failed to create folder: " + (await res.text()), "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });
  });
});

// Upload
const uploadBtn = document.getElementById("uploadBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

uploadBtn.addEventListener("click", () => {
  const fi = document.createElement("input");
  fi.type = "file";
  fi.multiple = true; // Allow multiple file selection
  fi.onchange = () => {
    if (!fi.files || fi.files.length === 0) return;
    const files = Array.from(fi.files);
    
    askPassword((password) => {
      let completed = 0;
      let failed = 0;
      const total = files.length;
      
      progressWrap.style.display = "flex";
      progressBar.style.width = "0%";
      progressText.textContent = `0/${total}`;
      
      async function uploadNext(index) {
        if (index >= files.length) {
          // All done
          setTimeout(() => {
            progressWrap.style.display = "none";
            progressBar.style.width = "0%";
            progressText.textContent = "0%";
            
            if (failed === 0) {
              showToast(`Uploaded ${completed} file(s) successfully`, "success");
            } else {
              showToast(`Uploaded ${completed}, failed ${failed}`, "error");
            }
            
            setTimeout(() => location.reload(), 1000);
          }, 700);
          return;
        }
        
        const file = files[index];
        const xhr = new XMLHttpRequest();
        const targetUrl = window.location.pathname + "?upload=1";
        xhr.open("POST", targetUrl, true);
        xhr.setRequestHeader("x-password", password);
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            completed++;
          } else if (xhr.status === 401) {
            showToast("Incorrect password", "error");
            progressWrap.style.display = "none";
            return;
          } else {
            failed++;
          }
          
          const progress = Math.round(((completed + failed) / total) * 100);
          progressBar.style.width = progress + "%";
          progressText.textContent = `${completed + failed}/${total}`;
          
          uploadNext(index + 1);
        };
        
        xhr.onerror = () => {
          failed++;
          uploadNext(index + 1);
        };
        
        const fd = new FormData();
        fd.append("file", file, file.name);
        xhr.send(fd);
      }
      
      uploadNext(0);
    });
  };
  fi.click();
});

// Drag and drop upload
const dropOverlay = document.getElementById("dropOverlay");
let dragCounter = 0;

function uploadFileWithPassword(file) {
  // Check file size limit (100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
  
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const confirmed = confirm(
      `Warning: The file "${file.name}" is ${fileSizeMB} MB, which exceeds the recommended limit of 100 MB.\n\n` +
      `Large files may take longer to upload and could fail. Do you want to continue?`
    );
    
    if (!confirmed) {
      return; // Cancel upload
    }
  }
  
  askPassword((password) => {
    const xhr = new XMLHttpRequest();
    const targetUrl = window.location.pathname + "?upload=1";
    xhr.open("POST", targetUrl, true);
    xhr.setRequestHeader("x-password", password);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressWrap.style.display = "flex";
        progressBar.style.width = pct + "%";
        progressText.textContent = pct + "%";
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        progressBar.style.width = "100%";
        progressText.textContent = "100%";
        setTimeout(() => {
          progressWrap.style.display = "none";
          progressBar.style.width = "0%";
          progressText.textContent = "0%";
          location.reload();
        }, 700);
      } else if (xhr.status === 401) {
        showToast("Incorrect password", "error");
        progressWrap.style.display = "none";
        progressBar.style.width = "0%";
      } else {
        showToast("Upload failed", "error");
        progressWrap.style.display = "none";
        progressBar.style.width = "0%";
      }
    };
    
    const fd = new FormData();
    fd.append("file", file, file.name);
    xhr.send(fd);
  });
}

document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.add("active");
});

document.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    dropOverlay.classList.remove("active");
  }
});

document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("active");
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadFileWithPassword(files[0]);
  }
});

// View
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const href = btn.getAttribute("data-href");
    const fileName = btn.getAttribute("data-key");
    
    // Detect media files
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    
    const isVideo = videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    const isAudio = audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    
    if (isVideo || isAudio) {
      // Create media player modal
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.8)";
      overlay.style.zIndex = "1000";
      overlay.style.animation = "fadeIn 0.2s ease-out";
      
      const modal = document.createElement("div");
      modal.className = "media-modal";
      
      const title = document.createElement("div");
      title.className = "media-modal-title";
      title.textContent = fileName.split('/').pop();
      
      const mediaElement = isVideo ? document.createElement("video") : document.createElement("audio");
      mediaElement.src = href;
      mediaElement.controls = true;
      mediaElement.autoplay = true;
      
      const closeBtn = document.createElement("button");
      closeBtn.className = "media-modal-close";
      closeBtn.textContent = "Close";
      closeBtn.onclick = () => {
        mediaElement.pause();
        document.body.removeChild(overlay);
      };
      
      modal.appendChild(title);
      modal.appendChild(mediaElement);
      modal.appendChild(closeBtn);
      overlay.appendChild(modal);
      
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          mediaElement.pause();
          document.body.removeChild(overlay);
        }
      };
      
      document.body.appendChild(overlay);
    } else {
      // Open non-media files in new tab
      window.open(href, "_blank");
    }
  });
});

// Edit Link
document.querySelectorAll(".edit-link-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    
    askPassword(async (password) => {
      try {
        // First, get the current URL
        const getRes = await fetch(window.location.pathname + "?action=getLink", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-password": password
          },
          body: JSON.stringify({ key })
        });
        
        if (getRes.status === 401) {
          showToast("Incorrect password", "error");
          return;
        }
        
        if (!getRes.ok) {
          showToast("Failed to get link: " + (await getRes.text()), "error");
          return;
        }
        
        const data = await getRes.json();
        const currentUrl = data.url || "";
        
        showModal("Edit Link", [
          { label: "URL", value: currentUrl, placeholder: "https://example.com" }
        ], async (newUrl) => {
          if (!newUrl) return;
          
          try {
            const res = await fetch(window.location.pathname + "?action=editLink", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-password": password
              },
              body: JSON.stringify({ key, url: newUrl })
            });
            
            if (res.status === 200) {
              showToast("Link updated successfully", "success");
              setTimeout(() => location.reload(), 500);
            } else {
              showToast("Failed to update link: " + (await res.text()), "error");
            }
          } catch (err) {
            showToast("Error: " + err.message, "error");
          }
        });
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });
  });
});

// Copy file
document.querySelectorAll(".copy-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    
    askPassword(async (password) => {
      try {
        // Get folder list
        const listRes = await fetch(window.location.pathname + "?action=listFolders", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-password": password
          },
          body: JSON.stringify({})
        });
        
        if (listRes.status === 401) {
          showToast("Incorrect password", "error");
          return;
        }
        
        if (!listRes.ok) {
          showToast("Failed to list folders", "error");
          return;
        }
        
        const listData = await listRes.json();
        const folders = listData.folders || [];
        
        // Show folder selection modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'modal-title';
        titleEl.textContent = "Copy to Folder";
        modal.appendChild(titleEl);
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        const selectEl = document.createElement('select');
        selectEl.className = 'modal-input';
        folders.forEach(folder => {
          const opt = document.createElement('option');
          opt.value = folder.path;
          opt.textContent = folder.display;
          selectEl.appendChild(opt);
        });
        body.appendChild(selectEl);
        modal.appendChild(body);
        
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => overlay.remove();
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-btn primary';
        confirmBtn.textContent = 'Copy';
        confirmBtn.onclick = async () => {
          const destFolder = selectEl.value;
          overlay.remove();
          
          try {
            const res = await fetch(window.location.pathname + "?action=copyFile", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-password": password
              },
              body: JSON.stringify({ key, destFolder })
            });
            
            if (res.status === 200) {
              showToast("File copied successfully", "success");
              setTimeout(() => location.reload(), 500);
            } else {
              showToast("Failed to copy: " + (await res.text()), "error");
            }
          } catch (err) {
            showToast("Copy error: " + err.message, "error");
          }
        };
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        modal.appendChild(buttons);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) cancelBtn.click();
        });
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });
  });
});

// Move file
document.querySelectorAll(".move-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    
    askPassword(async (password) => {
      try {
        // Get folder list
        const listRes = await fetch(window.location.pathname + "?action=listFolders", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-password": password
          },
          body: JSON.stringify({})
        });
        
        if (listRes.status === 401) {
          showToast("Incorrect password", "error");
          return;
        }
        
        if (!listRes.ok) {
          showToast("Failed to list folders", "error");
          return;
        }
        
        const listData = await listRes.json();
        const folders = listData.folders || [];
        
        // Show folder selection modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'modal-title';
        titleEl.textContent = "Move to Folder";
        modal.appendChild(titleEl);
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        const selectEl = document.createElement('select');
        selectEl.className = 'modal-input';
        folders.forEach(folder => {
          const opt = document.createElement('option');
          opt.value = folder.path;
          opt.textContent = folder.display;
          selectEl.appendChild(opt);
        });
        body.appendChild(selectEl);
        modal.appendChild(body);
        
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => overlay.remove();
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-btn primary';
        confirmBtn.textContent = 'Move';
        confirmBtn.onclick = async () => {
          const destFolder = selectEl.value;
          overlay.remove();
          
          try {
            const res = await fetch(window.location.pathname + "?action=moveFile", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-password": password
              },
              body: JSON.stringify({ key, destFolder })
            });
            
            if (res.status === 200) {
              showToast("File moved successfully", "success");
              setTimeout(() => location.reload(), 500);
            } else {
              showToast("Failed to move: " + (await res.text()), "error");
            }
          } catch (err) {
            showToast("Move error: " + err.message, "error");
          }
        };
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        modal.appendChild(buttons);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) cancelBtn.click();
        });
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
    });
  });
});

// Rename
document.querySelectorAll(".rename-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    const currentName = key.split("/").pop();

    showModal("Rename File", [
      { label: "New filename", value: currentName }
    ], async (newName) => {
      if (!newName) return;

      // Clean whitespace
      newName = newName.trim();

      // If identical, cancel
      if (newName === currentName) return;

      // Extract old extension
      let oldExt = "";
      if (currentName.includes(".")) {
        oldExt = currentName.split(".").pop();
      }

      // Detect if user typed extension
      const userHasExt = newName.includes(".");

      // If user did NOT specify extension → auto-append old extension
      if (!userHasExt && oldExt) {
        newName = newName + "." + oldExt;
      }

      askPassword(async (password) => {
        try {
          const res = await fetch(window.location.pathname + "?action=rename", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-password": password
            },
            body: JSON.stringify({ key, newName })
          });

          if (res.status === 200) {
            showToast("Renamed to " + newName, "success");
            setTimeout(() => location.reload(), 500);
          } else if (res.status === 401) {
            showToast("Incorrect password", "error");
          } else {
            showToast("Rename failed: " + (await res.text()), "error");
          }
        } catch (err) {
          showToast("Rename error: " + err.message, "error");
        }
      });
    });
  });
});

// Delete
document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    const filename = key.split("/").pop();
    
    showConfirm("Delete File", "Delete \\"" + filename + "\\"? This cannot be undone.", () => {
      askPassword(async (password) => {
        try {
          const res = await fetch(window.location.pathname + "?action=delete", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-password": password },
            body: JSON.stringify({ key })
          });
          
          if (res.status === 200) {
            showToast("File deleted", "success");
            setTimeout(() => location.reload(), 500);
          } else if (res.status === 401) {
            showToast("Incorrect password", "error");
          } else {
            const txt = await res.text();
            showToast("Delete failed: " + txt, "error");
          }
        } catch (err) {
          showToast("Delete error: " + err.message, "error");
        }
      });
    });
  });
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+U / Cmd+U: Upload
  if ((e.ctrlKey || e.metaKey) && e.key === "u") {
    e.preventDefault();
    document.getElementById("uploadBtn").click();
  }
  
  // F2: Rename selected file (if only one checkbox is checked)
  if (e.key === "F2") {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll(".file-checkbox")).filter(cb => cb.checked);
    if (checked.length === 1) {
      const key = checked[0].dataset.key;
      const renameBtn = document.querySelector(`.rename-btn[data-key="${key}"]`);
      if (renameBtn) renameBtn.click();
    }
  }
  
  // Delete / Backspace: Delete selected files
  if (e.key === "Delete" || (e.key === "Backspace" && e.metaKey)) {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll(".file-checkbox")).filter(cb => cb.checked);
    if (checked.length > 0) {
      document.getElementById("bulkDeleteBtn").click();
    }
  }
});
</script>
</body>
</html>`;

      return new Response(html, { 
        headers: { "content-type": "text/html; charset=utf-8" } 
      });
    }

    // === FILE SERVING ===
    const key = path.slice(1);
    const obj = await env.R2_BUCKET.get(key);
    
    if (obj) {
      // Handle .link files - redirect to the stored URL
      if (key.endsWith(".link")) {
        try {
          const targetUrl = await obj.text();
          // Validate the URL before redirecting
          if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
            return Response.redirect(targetUrl, 302);
          } else {
            return new Response("Invalid link URL", { status: 400 });
          }
        } catch (e) {
          return new Response("Error reading link: " + e.message, { status: 500 });
        }
      }
      
      const isDownload = url.searchParams.get("download") === "1";
      const headers = {
        "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
        "content-length": obj.size
      };
      
      if (isDownload) {
        const filename = key.split("/").pop();
        headers["content-disposition"] = `attachment; filename="${filename}"`;
      }
      
      return new Response(obj.body, { headers });
    }

    // Folder without slash? Redirect
    const maybePrefix = key + "/";
    const maybe = await env.R2_BUCKET.list({ prefix: maybePrefix, delimiter: "/" });
    const hasFolder =
      (maybe.objects && maybe.objects.length > 0) ||
      (maybe.commonPrefixes && maybe.commonPrefixes.length > 0) ||
      (maybe.prefixes && maybe.prefixes.length > 0);

    if (hasFolder) {
      return Response.redirect(url.origin + "/" + maybePrefix, 302);
    }

    return new Response("Not found", { status: 404 });
  }
};