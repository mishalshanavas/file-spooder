export const STYLES = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gray-0: #ffffff;
  --gray-50: #f8f9fa;
  --gray-100: #f1f3f5;
  --gray-200: #e9ecef;
  --gray-300: #dee2e6;
  --gray-400: #ced4da;
  --gray-500: #adb5bd;
  --gray-600: #868e96;
  --gray-700: #495057;
  --gray-800: #343a40;
  --gray-900: #212529;
  --blue-500: #228be6;
  --blue-600: #1c7ed6;
  --blue-50: #e7f5ff;
  --red-500: #e03131;
  --red-50: #fff5f5;
  --green-500: #2f9e44;
  --orange-500: #f08c00;
  --radius: 8px;
  --radius-sm: 6px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  --font-mono: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
}

html { font-size: 15px; -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font);
  background: var(--gray-50);
  color: var(--gray-800);
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container { max-width: 1280px; margin: 0 auto; padding: 16px 20px; }

.header {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 20px;
  background: var(--gray-0);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
}
.header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }

.title {
  font-size: 15px; font-weight: 650; color: var(--gray-900);
  display: flex; align-items: center; gap: 8px; white-space: nowrap;
  user-select: none;
}
.title svg { color: var(--blue-500); flex-shrink: 0; }

.breadcrumb {
  display: flex; align-items: center; gap: 2px;
  font-family: var(--font-mono); font-size: 13px; color: var(--gray-600);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.breadcrumb a { color: var(--blue-500); text-decoration: none; padding: 2px 4px; border-radius: 4px; }
.breadcrumb a:hover { background: var(--blue-50); }
.breadcrumb-sep { color: var(--gray-400); margin: 0 2px; user-select: none; }

.controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.search-box { position: relative; width: 220px; }
.search-box input {
  width: 100%; height: 34px; padding: 0 32px 0 12px;
  border: 1px solid var(--gray-300); border-radius: var(--radius-sm);
  background: var(--gray-50); color: var(--gray-800); font-size: 13px; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-box input:focus { border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(34,139,230,0.12); }
.search-box input::placeholder { color: var(--gray-500); }
.search-close {
  position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 6px; border-radius: 4px;
  color: var(--gray-500); display: flex; align-items: center; justify-content: center;
}
.search-close:hover { background: var(--gray-200); color: var(--gray-700); }

.sort-select {
  height: 34px; padding: 0 28px 0 10px;
  border: 1px solid var(--gray-300); border-radius: var(--radius-sm);
  background: var(--gray-0); color: var(--gray-700); font-size: 13px;
  cursor: pointer; outline: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23868e96' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}
.sort-select:focus { border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(34,139,230,0.12); }

.btn, .bulk-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px;
  border: 1px solid var(--gray-300); border-radius: var(--radius-sm);
  background: var(--gray-0); color: var(--gray-700);
  font-size: 13px; font-weight: 500; font-family: var(--font);
  cursor: pointer; white-space: nowrap; user-select: none;
  transition: all 0.12s;
}
.btn:hover, .bulk-btn:hover { background: var(--gray-100); border-color: var(--gray-400); }
.btn:active { background: var(--gray-200); }
.btn svg, .bulk-btn svg { flex-shrink: 0; }

.icon-only-btn { padding: 0; width: 34px; min-width: 34px; justify-content: center; }

.add-btn-group { position: relative; }
#addBtn { background: var(--blue-500); color: #fff; border-color: var(--blue-500); font-weight: 600; }
#addBtn:hover { background: var(--blue-600); border-color: var(--blue-600); }

#uploadBtn, #createLinkBtn, #createFolderBtn { display: none; }

.add-dropdown {
  position: absolute; right: 0; top: calc(100% + 6px);
  background: var(--gray-0); border: 1px solid var(--gray-200);
  border-radius: var(--radius); box-shadow: var(--shadow-md);
  min-width: 190px; z-index: 1000; display: none; overflow: hidden;
}
.add-dropdown.active { display: block; }
.add-dropdown-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  color: var(--gray-700); cursor: pointer; border: none; background: none;
  width: 100%; text-align: left; font-size: 13px; font-family: var(--font);
  transition: background 0.1s;
}
.add-dropdown-item:hover { background: var(--gray-100); }
.add-dropdown-item svg { color: var(--gray-500); flex-shrink: 0; }

.storage-meter { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.storage-text { font-size: 11px; color: var(--gray-600); font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px; }
.storage-bar { height: 4px; background: var(--gray-200); border-radius: 2px; overflow: hidden; }
.storage-bar-fill { height: 100%; background: var(--blue-500); border-radius: 2px; transition: width 0.4s ease; }

.bulk-actions {
  display: none; align-items: center; gap: 10px;
  padding: 10px 16px; background: var(--blue-50);
  border: 1px solid var(--blue-500); border-radius: var(--radius);
  margin-bottom: 12px; font-size: 13px;
}
.bulk-actions.active { display: flex; }
.bulk-info { color: var(--blue-600); font-weight: 600; flex: 1; }
.bulk-btn.danger { color: var(--red-500); border-color: var(--red-500); }
.bulk-btn.danger:hover { background: var(--red-50); }

.progress-wrap {
  display: none; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--gray-0);
  border: 1px solid var(--gray-200); border-radius: var(--radius);
  margin-bottom: 12px;
}
.progress { height: 4px; background: var(--gray-200); border-radius: 2px; overflow: hidden; flex: 1; }
.progress-bar { height: 100%; width: 0%; background: var(--blue-500); transition: width 120ms linear; }
.progress-text { min-width: 48px; text-align: right; color: var(--gray-600); font-size: 12px; font-weight: 500; }

.drop-overlay {
  position: fixed; inset: 0; background: rgba(34,139,230,0.08);
  border: 3px dashed var(--blue-500); display: none;
  align-items: center; justify-content: center; z-index: 3000; pointer-events: none;
}
.drop-overlay.active { display: flex; }
.drop-message {
  background: var(--gray-0); padding: 28px 56px; border-radius: var(--radius);
  border: 1px solid var(--blue-500); font-size: 17px; font-weight: 600;
  color: var(--blue-500); box-shadow: var(--shadow-lg);
}

.list {
  background: var(--gray-0); border: 1px solid var(--gray-200);
  border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm);
}
.list-header {
  display: flex; align-items: center; padding: 0 12px;
  height: 38px; background: var(--gray-50); border-bottom: 1px solid var(--gray-200);
  font-size: 11px; font-weight: 650; color: var(--gray-500);
  text-transform: uppercase; letter-spacing: 0.6px; user-select: none;
}
.list-header > * { padding: 0 8px; }
.col-checkbox { width: 38px; flex-shrink: 0; display: flex; align-items: center; }
.col-name { flex: 1; min-width: 0; }
.col-type { width: 80px; flex-shrink: 0; display: none; }
.col-size { width: 80px; flex-shrink: 0; text-align: right; }
.col-modified { width: 100px; flex-shrink: 0; text-align: right; }
.col-actions { width: 40px; flex-shrink: 0; }

.item {
  display: flex; align-items: center; padding: 0 12px;
  min-height: 44px; border-bottom: 1px solid var(--gray-100);
  transition: background 0.08s; cursor: default;
}
.item:last-child { border-bottom: none; }
.item:hover { background: var(--gray-50); }
.item.selected { background: var(--blue-50); }

.item > * { padding: 0 8px; }

.file-checkbox {
  width: 16px; height: 16px; cursor: pointer; accent-color: var(--blue-500);
  flex-shrink: 0; display: none;
}
.selection-mode .file-checkbox { display: block; }

.left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
.icon { flex-shrink: 0; opacity: 0.7; }
.thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }

.name {
  font-family: var(--font-mono); font-size: 13px; color: var(--gray-800);
  text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.name:hover { color: var(--blue-500); text-decoration: underline; }
.folder-name { color: var(--blue-500); font-weight: 500; }

.right { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
.meta { color: var(--gray-500); font-size: 12px; min-width: 70px; text-align: right; font-family: var(--font-mono); }
.actions { position: relative; }

.menu-btn, .icon-btn {
  background: none; border: none; cursor: pointer; padding: 8px;
  min-width: 34px; min-height: 34px; border-radius: var(--radius-sm);
  color: var(--gray-500); display: flex; align-items: center; justify-content: center;
  transition: all 0.1s;
}
.menu-btn:hover, .icon-btn:hover { background: var(--gray-200); color: var(--gray-700); }
.icon-btn { display: none; }

.dropdown-menu {
  position: absolute; right: 0; top: 100%; margin-top: 4px;
  background: var(--gray-0); border: 1px solid var(--gray-200);
  border-radius: var(--radius); box-shadow: var(--shadow-md);
  min-width: 170px; z-index: 1000; display: none; overflow: hidden;
}
.dropdown-menu.active { display: block; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 14px;
  color: var(--gray-700); cursor: pointer; border: none; background: none;
  width: 100%; text-align: left; font-size: 13px; font-family: var(--font);
  transition: background 0.08s;
}
.dropdown-item:hover { background: var(--gray-100); }
.dropdown-item svg { color: var(--gray-500); flex-shrink: 0; }
.dropdown-item.danger { color: var(--red-500); }
.dropdown-item.danger:hover { background: var(--red-50); }

.empty-state { padding: 64px 20px; text-align: center; color: var(--gray-500); }
.empty-state-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }

.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 4000;
  background: var(--gray-800); color: #fff; padding: 12px 20px;
  border-radius: var(--radius); font-size: 13px; font-weight: 500;
  box-shadow: var(--shadow-lg); max-width: 380px;
  animation: toastIn 0.25s ease-out;
}
.toast.success { border-left: 3px solid var(--green-500); }
.toast.error { border-left: 3px solid var(--red-500); }
.toast.info { border-left: 3px solid var(--blue-500); }

@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--gray-0); border: 1px solid var(--gray-200);
  border-radius: var(--radius); padding: 24px; min-width: 380px; max-width: 92vw;
  box-shadow: var(--shadow-lg);
}
.modal-title { font-size: 16px; font-weight: 650; margin-bottom: 18px; color: var(--gray-900); }
.modal-body { margin-bottom: 20px; }
.modal-label { display: block; font-size: 11px; font-weight: 650; color: var(--gray-500); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.6px; }
.modal-input {
  width: 100%; padding: 9px 12px; background: var(--gray-50);
  border: 1px solid var(--gray-300); border-radius: var(--radius-sm);
  color: var(--gray-800); font-size: 14px; font-family: var(--font-mono);
  outline: none; margin-bottom: 10px; transition: border-color 0.15s;
}
.modal-input:focus { border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(34,139,230,0.12); }
.modal-input[type="password"] { border-color: var(--orange-500); }
.modal-input[type="password"]:focus { border-color: var(--orange-500); box-shadow: 0 0 0 3px rgba(240,140,0,0.12); }
.modal-buttons { display: flex; gap: 8px; justify-content: flex-end; }
.modal-btn {
  padding: 8px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500;
  border: 1px solid var(--gray-300); background: var(--gray-0); color: var(--gray-700);
  cursor: pointer; font-family: var(--font); transition: all 0.1s;
}
.modal-btn:hover { background: var(--gray-100); }
.modal-btn.primary { background: var(--blue-500); border-color: var(--blue-500); color: #fff; }
.modal-btn.primary:hover { background: var(--blue-600); }

.media-modal {
  background: var(--gray-0); border: 1px solid var(--gray-200);
  border-radius: var(--radius); padding: 24px; max-width: 92vw; max-height: 90vh;
  box-shadow: var(--shadow-lg); overflow: auto;
}
.media-modal video, .media-modal audio { max-width: 100%; max-height: 65vh; border-radius: 6px; background: #000; }
.media-modal-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: var(--gray-800); word-break: break-all; }
.media-modal-close { margin-top: 14px; width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); background: var(--gray-0); cursor: pointer; font-weight: 500; font-family: var(--font); }
.media-modal-close:hover { background: var(--gray-100); }

.selection-mode .item { cursor: pointer; }

:focus-visible { outline: 2px solid var(--blue-500); outline-offset: 2px; border-radius: 3px; }
.btn:focus-visible, .bulk-btn:focus-visible, .modal-btn:focus-visible { outline-offset: 1px; }

@media (max-width: 768px) {
  .container { padding: 8px 12px; }
  .header { flex-wrap: wrap; padding: 10px 14px; gap: 8px; }
  .header-left { flex-basis: 100%; }
  .controls { flex-basis: 100%; flex-wrap: wrap; }
  .search-box { width: 100%; order: 10; }
  .search-box input { height: 40px; font-size: 16px; }
  .sort-select { flex: 1; min-width: 120px; height: 40px; }
  .btn { height: 40px; padding: 0 16px; font-size: 14px; }
  .icon-only-btn { width: 40px; min-width: 40px; height: 40px; }
  .col-type { display: none; }
  .col-modified { width: 80px; }
  .col-size { width: 70px; }
  .item { min-height: 48px; padding: 0 10px; }
  .name { font-size: 14px; }
  .meta { min-width: 60px; font-size: 11px; }
  .menu-btn, .icon-btn { min-width: 40px; min-height: 40px; }
  .modal { min-width: auto; width: 92vw; padding: 18px; }
  .modal-input { font-size: 16px; padding: 12px; }
  .modal-btn { height: 42px; font-size: 14px; padding: 0 20px; }
  .bulk-actions { flex-wrap: wrap; padding: 10px 12px; gap: 6px; }
  .bulk-btn { height: 40px; font-size: 13px; }
  .storage-meter { flex-basis: 100%; min-width: auto; order: -1; }
}

@media (min-width: 769px) { .col-type { display: flex; } }

@media print {
  .header, .controls, .bulk-actions, .actions, .drop-overlay, .toast { display: none !important; }
  .list { box-shadow: none; border: none; }
}
`;
