import {
  VIDEO_EXTS, AUDIO_EXTS,
  MAX_FILE_SIZE, MAX_STORAGE_DISPLAY,
  FOLDER_SENTINEL, LINK_EXTENSION, FILE_CACHE_MAX_AGE
} from './src/config.js';
import { fmtSize, toHref, escapeHtml, getFileExt, getFileIcon, sanitizeName, corsHeaders } from './src/utils.js';
import { requireAuth } from './src/auth.js';
import { putObject, getObject, deleteObjects, listObjects } from './src/r2.js';
import { handleCreateLink } from './src/actions/createLink.js';
import { handleRename } from './src/actions/rename.js';
import { handleEditLink } from './src/actions/editLink.js';
import { handleCreateFolder } from './src/actions/createFolder.js';
import { handleRenameFolder } from './src/actions/renameFolder.js';
import { handleCopyFile } from './src/actions/copyFile.js';
import { handleMoveFile } from './src/actions/moveFile.js';
import { handleListFolders } from './src/actions/listFolders.js';
import { handleDeleteFolder } from './src/actions/deleteFolder.js';
import { STYLES } from './src/ui/styles.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (!path.startsWith("/")) path = "/" + path;

    // === R2 BUCKET REFERENCE ===
    const bucket = env.R2_BUCKET;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // === SERVER-SIDE ACTIONS ===
    // Create Link
    if (request.method === "POST" && url.searchParams.get("createLink") === "1") {
      const authError = requireAuth(request, env);
      if (authError) return authError;

      let data = {};
      try { data = await request.json(); } catch (e) { return new Response("Bad JSON", { status: 400 }); }

      return handleCreateLink({ bucket, data, path });
    }

    // Upload
    if (request.method === "POST" && url.searchParams.get("upload") === "1") {
      const authError = requireAuth(request, env);
      if (authError) return authError;

      const form = await request.formData();
      const file = form.get("file");
      if (!file) return new Response("No file", { status: 400 });

      // Validate filename
      const nameCheck = sanitizeName(file.name);
      if (!nameCheck.valid) {
        return new Response(nameCheck.error, { status: 400 });
      }

      // Check file size server-side
      if (file.size > MAX_FILE_SIZE) {
        return new Response("File too large. Maximum size is " + fmtSize(MAX_FILE_SIZE), { status: 413 });
      }

      const currentPrefix = path.endsWith("/") ? decodeURIComponent(path.slice(1)) : "";
      const key = currentPrefix + nameCheck.sanitized;
      const arrayBuffer = await file.arrayBuffer();

      await putObject(bucket, key, arrayBuffer, file.type);

      return new Response("OK", { status: 200, headers: corsHeaders() });
    }

    // Action dispatcher
    if (request.method === "POST" && url.searchParams.get("action")) {
      const action = url.searchParams.get("action");

      const authError = requireAuth(request, env);
      if (authError) return authError;

      let data = {};
      try { data = await request.json(); } catch (e) { return new Response("Bad JSON", { status: 400 }); }

      const ctx = { bucket, data, path };

      let response;
      switch (action) {
        case "delete": {
          if (!data.key) response = new Response("No key", { status: 400 });
          else { await deleteObjects(bucket, data.key); response = new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }); }
          break;
        }
        case "rename": response = await handleRename(ctx); break;
        case "editLink": response = await handleEditLink(ctx); break;
        case "getLink": {
          if (!data.key) response = new Response("No key", { status: 400 });
          else if (!data.key.endsWith(LINK_EXTENSION)) response = new Response("Not a link file", { status: 400 });
          else {
            const linkObj = await getObject(bucket, data.key);
            if (!linkObj) response = new Response("Not found", { status: 404 });
            else { const linkUrl = await linkObj.text(); response = new Response(JSON.stringify({ ok: true, url: linkUrl }), { headers: { "content-type": "application/json" } }); }
          }
          break;
        }
        case "createFolder": response = await handleCreateFolder(ctx); break;
        case "renameFolder": response = await handleRenameFolder(ctx); break;
        case "copyFile": response = await handleCopyFile(ctx); break;
        case "moveFile": response = await handleMoveFile(ctx); break;
        case "listFolders": response = await handleListFolders(ctx); break;
        case "getStorageUsage": {
          let totalSize = 0;
          let cursor = undefined;
          do {
            const list = await listObjects(bucket, { cursor });
            for (const obj of (list.objects || [])) totalSize += obj.size || 0;
            cursor = list.truncated ? list.cursor : undefined;
          } while (cursor);
          response = new Response(JSON.stringify({ ok: true, totalSize }), { headers: { "content-type": "application/json" } });
          break;
        }
        case "deleteFolder": response = await handleDeleteFolder(ctx); break;
        default: response = new Response("Unknown action", { status: 400 }); break;
      }

      // Add CORS headers to all action responses
      const mergedHeaders = { ...corsHeaders() };
      response.headers.forEach((value, key) => { mergedHeaders[key] = value; });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: mergedHeaders
      });
    }

    // === DIRECTORY LISTING ===
    if (path === "/" || path.endsWith("/")) {
      const prefix = path === "/" ? "" : decodeURIComponent(path.slice(1));

      // Paginate listing so >1000 items are not silently truncated
      const prefixes = [];
      const objects = [];
      let listCursor = undefined;
      do {
        const list = await listObjects(bucket, { prefix, delimiter: "/", cursor: listCursor });
        for (const p of (list.delimitedPrefixes || [])) {
          if (!prefixes.includes(p)) prefixes.push(p);
        }
        for (const o of (list.objects || [])) objects.push(o);
        listCursor = list.truncated ? list.cursor : undefined;
      } while (listCursor);

      let html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Files — ${prefix || 'Root'}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="container">
  <header class="topbar" role="banner">
    <a href="/" class="topbar-home" aria-label="Root">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h6l2 2h10v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.5"/></svg>
    </a>
    <nav class="topbar-crumbs" aria-label="Breadcrumb">`;
      
      html += `<span class="crumb"><a href="/">Files</a></span>`;
      if (prefix) {
        const parts = prefix.split('/').filter(p => p);
        let accumulated = '';
        parts.forEach((part, i) => {
          accumulated += part + '/';
          const partText = escapeHtml(part);
          const partHref = toHref('/' + accumulated);
          html += `<span class="crumb-sep" aria-hidden="true">/</span>`;
          html += `<span class="crumb"><a href="${partHref}">${partText}</a></span>`;
        });
      }
      
      html += `</nav>
    <div class="topbar-actions">
      <div class="search-box" id="searchBox">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2"/></svg>
        <input id="q" type="search" placeholder="Filter files…" aria-label="Filter files" autocomplete="off" />
        <button class="search-close" id="searchClose" aria-label="Clear" hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/></svg>
        </button>
      </div>
      <div class="add-btn-group">
        <button id="addBtn" class="btn btn-primary" aria-haspopup="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="add-label">New</span>
        </button>
      </div>
      <button id="uploadBtn" aria-label="Upload file" hidden></button>
      <button id="createLinkBtn" aria-label="Create link" hidden></button>
      <button id="createFolderBtn" aria-label="Create folder" hidden></button>
    </div>
  </header>

  <div id="bulkActions" class="bulk-actions" role="toolbar" aria-label="Bulk actions">
    <div class="bulk-info"><span id="selectedCount">0</span> selected</div>
    <button id="selectAllBtn" class="bulk-btn">Select All</button>
    <button id="deselectAllBtn" class="bulk-btn">Deselect</button>
    <button id="bulkDeleteBtn" class="bulk-btn danger">Delete Selected</button>
  </div>

  <div id="dropOverlay" class="drop-overlay" aria-hidden="true">
    <div class="drop-message">Drop files to upload</div>
  </div>

  <div id="progressWrap" class="progress-wrap" aria-live="polite">
    <div class="progress"><div id="progressBar" class="progress-bar" role="progressbar"></div></div>
    <div id="progressText" class="progress-text">0%</div>
  </div>

  <div class="list" role="table" aria-label="File list">
    <div class="list-header" role="row">
      <div class="col-checkbox" role="columnheader"><input type="checkbox" id="selectAllCheckbox" aria-label="Select all files" /></div>
      <div class="col-name" role="columnheader" aria-sort="none">Name</div>
      <div class="col-type" role="columnheader">Type</div>
      <div class="col-size" role="columnheader">Size</div>
      <div class="col-modified" role="columnheader">Modified</div>
      <div class="col-sort" role="columnheader">
        <select id="sortSelect" aria-label="Sort files">
          <option value="name-asc">Name ↑</option>
          <option value="name-desc">Name ↓</option>
          <option value="size-asc">Size ↑</option>
          <option value="size-desc">Size ↓</option>
          <option value="date-asc">Date ↑</option>
          <option value="date-desc">Date ↓</option>
        </select>
      </div>
      <div class="col-actions" role="columnheader"></div>
    </div>
    <div class="list-body">
    <div id="list" role="rowgroup">`;

      // Folders first
      for (const p of prefixes) {
        const display = p.replace(prefix, "").replace(/\/$/, "");
        const href = "/" + p;
        const safeDisplay = escapeHtml(display);
        const safePrefix = escapeHtml(p);
        const safeDisplayLower = escapeHtml(display.toLowerCase());
        html += `<div class="item folder" data-name="${safeDisplayLower}" data-prefix="${safePrefix}" role="row">
  <div class="col-checkbox" role="cell"></div>
  <div class="left" role="cell">
    <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7h6l2 2h10v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <a class="name folder-name" href="${toHref(href)}">${safeDisplay}</a>
  </div>
  <div class="col-type" role="cell"><span class="meta">Folder</span></div>
  <div class="col-size" role="cell"><span class="meta">—</span></div>
  <div class="col-modified" role="cell"><span class="meta">—</span></div>
  <div class="col-actions" role="cell">
    <div class="actions">
      <button class="menu-btn folder-menu-btn" data-prefix="${safePrefix}" data-display="${safeDisplay}" aria-label="Folder actions">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</div>`;
      }

      // Files
      let visibleFileCount = 0;
      for (const obj of objects) {
        const name = obj.key.replace(prefix, "");
        if (name === "${FOLDER_SENTINEL}") continue;
        visibleFileCount++;
        const isLink = name.endsWith("${LINK_EXTENSION}");
        const viewUrl = "/" + obj.key;
        const downloadUrl = "/" + obj.key + "?download=1";
        const viewHref = toHref(viewUrl);
        const downloadHref = toHref(downloadUrl);
        const sizeText = fmtSize(obj.size);
        const safeName = escapeHtml(name);
        const safeNameLower = escapeHtml(name.toLowerCase());
        const safeKey = escapeHtml(obj.key);
        const ext = getFileExt(name);
        const typeLabel = isLink ? "Link" : (ext ? ext.toUpperCase() : "File");
        const uploadedDate = obj.uploaded ? new Date(obj.uploaded).toLocaleDateString() : "";
        const uploadedTimestamp = obj.uploaded ? obj.uploaded.getTime() : 0;

        const iconHtml = isLink 
          ? `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5"/>
            </svg>`
          : getFileIcon(name, viewHref);

        html += `<div class="item file" data-name="${safeNameLower}" data-key="${safeKey}" data-size="${obj.size || 0}" data-uploaded="${uploadedTimestamp}" role="row">
  <div class="col-checkbox" role="cell">
    <input type="checkbox" class="file-checkbox" data-key="${safeKey}" aria-label="Select ${safeName}" />
  </div>
  <div class="left" role="cell">
    ${iconHtml}
    <a class="name" href="${isLink ? viewHref : downloadHref}">${safeName}</a>
  </div>
  <div class="col-type" role="cell"><span class="meta">${typeLabel}</span></div>
  <div class="col-size" role="cell"><span class="meta">${sizeText}</span></div>
  <div class="col-modified" role="cell"><span class="meta">${uploadedDate}</span></div>
  <div class="col-actions" role="cell">
    <div class="actions">
      <button class="menu-btn" data-key="${safeKey}" data-is-link="${isLink}" data-view-url="${viewHref}" aria-label="File actions">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/>
        </svg>
      </button>
      <button class="icon-btn edit-link-btn" data-key="${safeKey}" hidden></button>
      <button class="icon-btn rename-btn" data-key="${safeKey}" hidden></button>
      <button class="icon-btn copy-btn" data-key="${safeKey}" hidden></button>
      <button class="icon-btn move-btn" data-key="${safeKey}" hidden></button>
      <button class="icon-btn delete-btn" data-key="${safeKey}" hidden></button>
    </div>
  </div>
</div>`;
      }

      if (prefixes.length === 0 && visibleFileCount === 0) {
        html += `<div class="empty-state" role="status">
  <div class="empty-state-icon" aria-hidden="true">📁</div>
  <p>Empty folder</p>
  <p>Drop files or click <strong>New</strong></p>
</div>`;
      }

      html += `</div>
    </div>
    </div>

  <footer style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:11px;color:var(--text-secondary);margin-top:6px">
    <span id="itemCount">${visibleFileCount + prefixes.length} item${visibleFileCount + prefixes.length !== 1 ? 's' : ''}</span>
    <div class="storage-meter" id="storageMeter" style="display:none">
      <div class="storage-text" id="storageText">Loading...</div>
      <div class="storage-bar"><div class="storage-bar-fill" id="storageFill" style="width:0%"></div></div>
    </div>
  </footer>
</div>

<script>

// Fetch and display storage usage
async function loadStorageUsage() {
  try {
    const password = getCachedPassword();
    if (!password) return;
    const res = await fetch(window.location.pathname + "?action=getStorageUsage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-password": password
      },
      body: JSON.stringify({})
    });

    if (res.status === 401) {
      clearCachedPassword();
      return;
    }
    
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
        return (v).toFixed(2) + " " + units[i];
      };
      
      const sizeStr = formatSize(totalSize);
      
      // Storage visualization max
      const maxSize = ${MAX_STORAGE_DISPLAY};
      const percentage = Math.min((totalSize / maxSize) * 100, 100);
      
      document.getElementById('storageText').textContent = 'Storage: ' + sizeStr;
      document.getElementById('storageFill').style.width = percentage + '%';
      document.getElementById('storageMeter').style.display = 'flex';
    }
  } catch (err) {
    console.error('Failed to load storage usage:', err);
  }
}

// Scroll position preservation across reloads
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('scrollData', JSON.stringify({ path: location.pathname, y: window.scrollY }));
});
window.addEventListener('load', () => {
  const saved = sessionStorage.getItem('scrollData');
  if (saved) {
    sessionStorage.removeItem('scrollData');
    try {
      const { path, y } = JSON.parse(saved);
      if (path === location.pathname) window.scrollTo(0, y);
    } catch(e) {}
  }
});

// Load storage on page load
loadStorageUsage();

// Password caching using sessionStorage
function getCachedPassword() {
  return sessionStorage.getItem('fileManagerPassword');
}

function setCachedPassword(password) {
  sessionStorage.setItem('fileManagerPassword', password);
}

function clearCachedPassword() {
  sessionStorage.removeItem('fileManagerPassword');
}

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
  const cached = getCachedPassword();
  if (cached) {
    callback(cached);
    return;
  }
  
  showModal("Password Required", [
    { label: "Password", type: "password", placeholder: "Enter password" }
  ], (password) => {
    if (password) {
      setCachedPassword(password);
      callback(password);
    }
  });
}

// Add button dropdown
document.getElementById('addBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  
  const existingDropdown = document.querySelector('.add-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
    return;
  }
  
  const dropdown = document.createElement('div');
  dropdown.className = 'add-dropdown active';
  
  const uploadItem = document.createElement('button');
  uploadItem.className = 'add-dropdown-item';
  uploadItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Upload File';
  uploadItem.onclick = () => {
    dropdown.remove();
    document.getElementById('uploadBtn').click();
  };
  dropdown.appendChild(uploadItem);
  
  const linkItem = document.createElement('button');
  linkItem.className = 'add-dropdown-item';
  linkItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5"/></svg> Create Link';
  linkItem.onclick = () => {
    dropdown.remove();
    document.getElementById('createLinkBtn').click();
  };
  dropdown.appendChild(linkItem);
  
  const folderItem = document.createElement('button');
  folderItem.className = 'add-dropdown-item';
  folderItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7h6l2 2h10v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" stroke="currentColor" stroke-width="1.5"/><path d="M12 13v6M9 16h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> New Folder';
  folderItem.onclick = () => {
    dropdown.remove();
    document.getElementById('createFolderBtn').click();
  };
  dropdown.appendChild(folderItem);
  
  document.querySelector('.add-btn-group').appendChild(dropdown);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.add-btn-group')) {
    document.querySelectorAll('.add-dropdown').forEach(d => d.remove());
  }
});

// Kebab menu functionality
document.addEventListener('click', (e) => {
  // Close all dropdowns when clicking outside
  if (!e.target.closest('.menu-btn') && !e.target.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.remove());
  }
});

document.querySelectorAll('.menu-btn:not(.folder-menu-btn)').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    document.querySelectorAll('.dropdown-menu').forEach((menu) => {
      if (menu !== btn.nextElementSibling) menu.remove();
    });

    const existing = btn.nextElementSibling;
    if (existing && existing.classList.contains('dropdown-menu')) {
      existing.remove();
      return;
    }

    const key = btn.dataset.key || '';
    if (!key) return;
    const isLink = btn.dataset.isLink === 'true';
    const viewUrl = btn.dataset.viewUrl || '';
    const fileName = key.split('/').pop();

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu active';

    const copyLinkItem = document.createElement('button');
    copyLinkItem.className = 'dropdown-item';
    copyLinkItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.5"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.5"/></svg> Copy Link';
    copyLinkItem.onclick = () => {
      menu.remove();
      navigator.clipboard.writeText(window.location.origin + viewUrl).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    };
    menu.appendChild(copyLinkItem);

    // QR Code
    const qrItem = document.createElement('button');
    qrItem.className = 'dropdown-item';
    qrItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="4" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="19" y="19" width="2" height="2" fill="currentColor"/></svg> QR Code';
    qrItem.onclick = () => {
      menu.remove();
      const downloadUrl = window.location.origin + viewUrl + '?download=1';
      const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(downloadUrl);
      
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.textAlign = 'center';
      
      const title = document.createElement('div');
      title.className = 'modal-title';
      title.textContent = 'QR Code — ' + fileName;
      modal.appendChild(title);
      
      const qrImg = document.createElement('img');
      qrImg.src = qrSrc;
      qrImg.alt = 'QR Code for ' + fileName;
      qrImg.style.display = 'block';
      qrImg.style.margin = '0 auto 16px';
      qrImg.style.borderRadius = '8px';
      qrImg.style.maxWidth = '100%';
      modal.appendChild(qrImg);
      
      const hint = document.createElement('p');
      hint.style.fontSize = '13px';
      hint.style.color = 'var(--gray-500)';
      hint.style.marginBottom = '16px';
      hint.textContent = 'Scan to download instantly';
      modal.appendChild(hint);
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-btn primary';
      closeBtn.textContent = 'Close';
      closeBtn.onclick = () => overlay.remove();
      modal.appendChild(closeBtn);
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    };
    menu.appendChild(qrItem);

    const ext = key.split('.').pop().toLowerCase();
    const isVideo = ${JSON.stringify(VIDEO_EXTS)}.includes(ext);
    const isAudio = ${JSON.stringify(AUDIO_EXTS)}.includes(ext);

    if (isVideo || isAudio) {
      const previewItem = document.createElement('button');
      previewItem.className = 'dropdown-item';
      previewItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M10 8l6 4-6 4V8z" fill="currentColor"/></svg> Preview';
      previewItem.onclick = () => {
        menu.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'media-modal';
        const title = document.createElement('div');
        title.className = 'media-modal-title';
        title.textContent = key.split('/').pop();
        const media = document.createElement(isVideo ? 'video' : 'audio');
        media.src = viewUrl;
        media.controls = true;
        if (isVideo) media.style.width = '100%';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-btn';
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '12px';
        closeBtn.style.width = '100%';
        closeBtn.onclick = () => { media.pause(); overlay.remove(); };
        modal.append(title, media, closeBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeBtn.click(); });
      };
      menu.appendChild(previewItem);
    }

    if (isLink) {
      const editItem = document.createElement('button');
      editItem.className = 'dropdown-item';
      editItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5"/></svg> Edit Link';
      editItem.onclick = () => {
        menu.remove();
        document.querySelector('.edit-link-btn[data-key="' + key + '"]')?.click();
      };
      menu.appendChild(editItem);
    }

    const renameItem = document.createElement('button');
    renameItem.className = 'dropdown-item';
    renameItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5"/></svg> Rename';
    renameItem.onclick = () => {
      menu.remove();
      showModal('Rename', [{ label: 'New name', value: fileName, placeholder: 'filename.ext' }], async (newName) => {
        if (!newName) return;
        askPassword(async (password) => {
          try {
            const res = await fetch(window.location.pathname + '?action=rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-password': password },
              body: JSON.stringify({ key, newName })
            });
            if (res.status === 401) {
              clearCachedPassword();
              showToast('Incorrect password', 'error');
              return;
            }
            if (res.status === 409) {
              showToast('Rename failed: destination exists', 'error');
              return;
            }
            if (res.status === 200) {
              showToast('Renamed successfully', 'success');
              setTimeout(() => location.reload(), 500);
            } else {
              showToast('Rename failed', 'error');
            }
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        });
      });
    };
    menu.appendChild(renameItem);

    const copyItem = document.createElement('button');
    copyItem.className = 'dropdown-item';
    copyItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.5"/></svg> Copy';
    copyItem.onclick = () => {
      menu.remove();
      document.querySelector('.copy-btn[data-key="' + key + '"]')?.click();
    };
    menu.appendChild(copyItem);

    const moveItem = document.createElement('button');
    moveItem.className = 'dropdown-item';
    moveItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="1.5"/></svg> Move';
    moveItem.onclick = () => {
      menu.remove();
      document.querySelector('.move-btn[data-key="' + key + '"]')?.click();
    };
    menu.appendChild(moveItem);

    const deleteItem = document.createElement('button');
    deleteItem.className = 'dropdown-item danger';
    deleteItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="1.5"/></svg> Delete';
    deleteItem.onclick = () => {
      menu.remove();
      showConfirm('Delete File', 'Delete "' + fileName + '"? This cannot be undone.', () => {
        askPassword(async (password) => {
          try {
            const res = await fetch(window.location.pathname + '?action=delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-password': password },
              body: JSON.stringify({ key })
            });
            if (res.status === 401) {
              clearCachedPassword();
              showToast('Incorrect password', 'error');
              return;
            }
            if (res.status === 200) {
              showToast('File deleted', 'success');
              setTimeout(() => location.reload(), 500);
            } else {
              showToast('Delete failed: ' + (await res.text()), 'error');
            }
          } catch (err) {
            showToast('Delete error: ' + err.message, 'error');
          }
        });
      });
    };
    menu.appendChild(deleteItem);

    btn.parentElement.appendChild(menu);
  });
});

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
  
  // Sync header checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = checked.length > 0 && checked.length === checkboxes.length;
    selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
  }
  
  checkboxes.forEach(cb => {
    const item = cb.closest(".item");
    if (cb.checked) item.classList.add("selected");
    else item.classList.remove("selected");
  });
}

checkboxes.forEach(cb => {
  cb.addEventListener("change", () => updateBulkUI());
});

// Select-all header checkbox
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
    document.querySelectorAll(".file-checkbox").forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateBulkUI();
  });
}

selectAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".file-checkbox").forEach(cb => cb.checked = true);
  if (selectAllCheckbox) selectAllCheckbox.checked = true;
  updateBulkUI();
});

deselectAllBtn.addEventListener("click", () => {
  document.querySelectorAll(".file-checkbox").forEach(cb => cb.checked = false);
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  updateBulkUI();
});

bulkDeleteBtn.addEventListener("click", () => {
  const checked = Array.from(checkboxes).filter(cb => cb.checked);
  const count = checked.length;
  
  if (count === 0) return;
  
  showConfirm("Delete Files", "Delete " + count + " file(s)? This cannot be undone.", () => {
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
            clearCachedPassword();
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
        showToast("Deleted " + success + " file(s) successfully", "success");
      } else {
        showToast("Deleted " + success + ", failed " + failed, "error");
      }
      
      setTimeout(() => location.reload(), 1000);
    });
  });
});

// Search
const searchBox = document.getElementById("searchBox");
const searchClose = document.getElementById("searchClose");
const q = document.getElementById("q");

searchClose.addEventListener("click", () => {
  q.value = "";
  q.dispatchEvent(new Event("input"));
  q.focus();
});

// Search filtering + close button toggle
const items = document.querySelectorAll(".item");
q.addEventListener("input", () => {
  const v = q.value.trim().toLowerCase();
  searchClose.hidden = !v;
  items.forEach(el => {
    const ok = !v || (el.dataset.name || "").includes(v);
    el.style.display = ok ? "flex" : "none";
  });
});

// Sort files
const sortSelect = document.getElementById("sortSelect");
const listContainer = document.getElementById("list");

function applySort() {
  localStorage.setItem('sortPref', sortSelect.value);
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
      valA = parseInt(a.dataset.size || "0");
      valB = parseInt(b.dataset.size || "0");
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
    listContainer.innerHTML = '<div class=\"empty-state\">' +
      '<div class=\"empty-state-icon\">📁</div>' +
      '<div>This folder is empty</div>' +
    '</div>';
  }

  const currentQuery = document.getElementById('q').value.trim().toLowerCase();
  if (currentQuery) {
    document.querySelectorAll('.item').forEach(el => {
      el.style.display = (el.dataset.name || '').includes(currentQuery) ? 'flex' : 'none';
    });
  }
}

sortSelect.addEventListener("change", applySort);

// Restore saved sort preference
const savedSort = localStorage.getItem('sortPref');
if (savedSort) {
  sortSelect.value = savedSort;
  applySort();
}

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
          clearCachedPassword();
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
          clearCachedPassword();
          showToast("Incorrect password", "error");
        } else {
          const errorText = await res.text();
          showToast("Failed to create folder: " + errorText, "error");
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

const MAX_FILE_SIZE = ${MAX_FILE_SIZE};

function confirmLargeFiles(files) {
  const uploadable = [];
  for (const file of files) {
    if (file.size <= MAX_FILE_SIZE) {
      uploadable.push(file);
      continue;
    }

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const confirmed = confirm(
      'Warning: The file "' + file.name + '" is ' + fileSizeMB +
      ' MB, which exceeds the recommended limit of 100 MB.\\n\\n' +
      'Large files may take longer to upload and could fail. Do you want to continue?'
    );
    if (confirmed) uploadable.push(file);
  }
  return uploadable;
}

function uploadFilesBatch(inputFiles) {
  if (!inputFiles || inputFiles.length === 0) return;
  const files = confirmLargeFiles(Array.from(inputFiles));
  if (files.length === 0) return;

  askPassword((password) => {
    let completed = 0;
    let failed = 0;
    const total = files.length;

    progressWrap.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = '0/' + total;

    async function uploadNext(index) {
      if (index >= files.length) {
        setTimeout(() => {
          progressWrap.style.display = 'none';
          progressBar.style.width = '0%';
          progressText.textContent = '0%';

          if (failed === 0) {
            showToast('Uploaded ' + completed + ' file(s) successfully', 'success');
          } else {
            showToast('Uploaded ' + completed + ', failed ' + failed, 'error');
          }

          setTimeout(() => location.reload(), 1000);
        }, 700);
        return;
      }

      const file = files[index];
      const xhr = new XMLHttpRequest();
      xhr.open('POST', window.location.pathname + '?upload=1', true);
      xhr.setRequestHeader('x-password', password);

      xhr.onload = () => {
        if (xhr.status === 200) {
          completed++;
        } else if (xhr.status === 401) {
          clearCachedPassword();
          showToast('Incorrect password', 'error');
          progressWrap.style.display = 'none';
          return;
        } else {
          failed++;
        }

        const progress = Math.round(((completed + failed) / total) * 100);
        progressBar.style.width = progress + '%';
        progressText.textContent = (completed + failed) + '/' + total;
        uploadNext(index + 1);
      };

      xhr.onerror = () => {
        failed++;
        uploadNext(index + 1);
      };

      const fd = new FormData();
      fd.append('file', file, file.name);
      xhr.send(fd);
    }

    uploadNext(0);
  });
}

uploadBtn.addEventListener("click", () => {
  const fi = document.createElement("input");
  fi.type = "file";
  fi.multiple = true;
  fi.onchange = () => {
    if (!fi.files || fi.files.length === 0) return;
    uploadFilesBatch(Array.from(fi.files));
  };
  fi.click();
});

// Drag and drop upload
const dropOverlay = document.getElementById("dropOverlay");
let dragCounter = 0;

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

  const files = Array.from(e.dataTransfer.files || []);
  uploadFilesBatch(files);
});

// Edit Link
document.querySelectorAll(".edit-link-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    
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
          clearCachedPassword();
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
            } else if (res.status === 401) {
              clearCachedPassword();
              showToast("Incorrect password", "error");
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
          clearCachedPassword();
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
            
            if (res.status === 401) {
              clearCachedPassword();
              showToast("Incorrect password", "error");
            } else if (res.status === 200) {
              showToast("File copied successfully", "success");
              setTimeout(() => location.reload(), 500);
            } else if (res.status === 409) {
              showToast("Copy failed: destination exists", "error");
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
          clearCachedPassword();
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
            
            if (res.status === 401) {
              clearCachedPassword();
              showToast("Incorrect password", "error");
            } else if (res.status === 200) {
              showToast("File moved successfully", "success");
              setTimeout(() => location.reload(), 500);
            } else if (res.status === 409) {
              showToast("Move failed: destination exists", "error");
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
document.querySelectorAll(".rename-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    const currentName = key.split("/").pop();

    showModal("Rename File", [{ label: "New filename", value: currentName }], async (newName) => {
      if (!newName) return;

      newName = newName.trim();
      if (newName === currentName) return;

      let oldExt = "";
      if (currentName.includes(".")) {
        oldExt = currentName.split(".").pop();
      }

      const userHasExt = newName.includes(".");
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
            clearCachedPassword();
            showToast("Incorrect password", "error");
          } else if (res.status === 409) {
            showToast("Rename failed: destination exists", "error");
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
document.querySelectorAll(".delete-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const key = btn.getAttribute("data-key");
    const filename = key.split("/").pop();

    showConfirm("Delete File", "Delete \\\"" + filename + "\\\"? This cannot be undone.", () => {
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
            clearCachedPassword();
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

// Folder kebab menu (delete folder)
document.querySelectorAll('.folder-menu-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    document.querySelectorAll('.dropdown-menu').forEach((m) => {
      if (m !== btn.nextElementSibling) m.remove();
    });

    const existing = btn.nextElementSibling;
    if (existing && existing.classList.contains('dropdown-menu')) {
      existing.remove();
      return;
    }

    const prefix = btn.dataset.prefix;
    const display = btn.dataset.display;

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu active';

    const renameItem = document.createElement('button');
    renameItem.className = 'dropdown-item';
    renameItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5"/></svg> Rename Folder';
    renameItem.onclick = () => {
      menu.remove();
      showModal('Rename Folder', [{ label: 'New name', value: display, placeholder: 'folder-name' }], (newName) => {
        if (!newName || newName === display) return;
        const cleanNew = newName.trim().replace(/[\\/\\\\]/g, '');
        if (!cleanNew) { showToast('Invalid folder name', 'error'); return; }
        askPassword(async (password) => {
          const parentPrefix = prefix.slice(0, prefix.length - display.length - 1);
          const newPrefix = parentPrefix + cleanNew + '/';
          try {
            const res = await fetch(window.location.pathname + '?action=renameFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-password': password },
              body: JSON.stringify({ oldPrefix: prefix, newPrefix })
            });
            if (res.status === 401) { clearCachedPassword(); showToast('Incorrect password', 'error'); return; }
            if (res.ok) { showToast('Folder renamed', 'success'); setTimeout(() => location.reload(), 500); }
            else showToast('Rename failed: ' + (await res.text()), 'error');
          } catch (err) { showToast('Error: ' + err.message, 'error'); }
        });
      });
    };
    menu.appendChild(renameItem);

    const deleteItem = document.createElement('button');
    deleteItem.className = 'dropdown-item danger';
    deleteItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" stroke="currentColor" stroke-width="1.5"/></svg> Delete Folder';
    deleteItem.onclick = () => {
      menu.remove();
      showConfirm('Delete Folder', 'Delete "' + display + '" and all its contents? This cannot be undone.', () => {
        askPassword(async (password) => {
          try {
            const res = await fetch(window.location.pathname + '?action=deleteFolder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-password': password },
              body: JSON.stringify({ prefix })
            });

            if (res.status === 401) {
              clearCachedPassword();
              showToast('Incorrect password', 'error');
              return;
            }
            if (res.status === 200) {
              showToast('Folder deleted', 'success');
              setTimeout(() => location.reload(), 500);
            } else {
              showToast('Delete failed: ' + (await res.text()), 'error');
            }
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        });
      });
    };
    menu.appendChild(deleteItem);
    btn.parentElement.appendChild(menu);
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
      const renameBtn = document.querySelector('.rename-btn[data-key="' + key + '"]');
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
        headers: { ...corsHeaders(), "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } 
      });
    }

    // === FILE SERVING ===
    const key = decodeURIComponent(path.slice(1));
    const obj = await getObject(bucket, key);
    
    if (obj) {
      // Handle .link files - redirect to the stored URL
      if (key.endsWith(LINK_EXTENSION)) {
        try {
          const targetUrl = await obj.text();
          // Validate the URL before redirecting
          if (targetUrl && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
            return Response.redirect(targetUrl, 302);
          } else {
            return new Response("Invalid link URL", { status: 400, headers: corsHeaders() });
          }
        } catch (e) {
          return new Response("Error reading link", { status: 500, headers: corsHeaders() });
        }
      }
      
      const isDownload = url.searchParams.get("download") === "1";

      // Handle conditional requests (304 Not Modified)
      const ifNoneMatch = request.headers.get("If-None-Match");
      if (ifNoneMatch && obj.httpEtag && ifNoneMatch === obj.httpEtag) {
        return new Response(null, {
          status: 304,
          headers: {
            ...corsHeaders(),
            "etag": obj.httpEtag,
            "cache-control": `public, max-age=${FILE_CACHE_MAX_AGE}`
          }
        });
      }

      const headers = {
        ...corsHeaders(),
        "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
        "content-length": obj.size,
        "cache-control": `public, max-age=${FILE_CACHE_MAX_AGE}`,
        "etag": obj.httpEtag || "",
        "accept-ranges": "bytes"
      };
      
      if (isDownload) {
        const filename = key.split("/").pop();
        headers["content-disposition"] = `attachment; filename="${filename}"`;
      }
      
      return new Response(obj.body, { headers });
    }

    // Folder without slash? Redirect
    const maybePrefix = key + "/";
    const maybe = await listObjects(bucket, { prefix: maybePrefix, delimiter: "/" });
    const hasFolder =
      (maybe.objects && maybe.objects.length > 0) ||
      (maybe.delimitedPrefixes && maybe.delimitedPrefixes.length > 0);

    if (hasFolder) {
      return Response.redirect(url.origin + "/" + maybePrefix, 302);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  }
};