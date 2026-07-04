export const STYLES = `
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
  padding: 8px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container { 
  max-width: 1200px; 
  margin: 0 auto; 
}

/* Header */
.header { 
  display: flex; 
  align-items: stretch; 
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px; 
  padding: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
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
  flex-wrap: wrap;
  gap: 8px; 
  align-items: center;
  width: 100%;
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 300px;
}

.search-box input { 
  height: 36px; 
  width: 100%; 
  padding: 0 36px 0 12px; 
  border-radius: 6px; 
  background: var(--bg); 
  border: 1px solid var(--border); 
  color: var(--text); 
  outline: none; 
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-box input:focus {
  border-color: var(--accent);
}

.search-close {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.search-close:hover {
  background: var(--hover);
  color: var(--accent);
}

.icon-only-btn {
  padding: 0;
  width: 36px;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-only-btn svg {
  margin: 0 !important;
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
  padding: 0 14px; 
  height: 36px;
  min-height: 40px;
  border-radius: 6px; 
  border: 1px solid var(--border); 
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.add-btn-group {
  position: relative;
}

.add-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 180px;
  z-index: 1000;
  display: none;
  overflow: hidden;
}

.add-dropdown.active {
  display: block;
  animation: scaleIn 0.15s ease-out;
}

.add-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  color: var(--text);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: 13px;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.add-dropdown-item:hover {
  background: var(--hover);
}

.add-dropdown-item svg {
  flex-shrink: 0;
  opacity: 0.7;
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
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  order: -1;
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
  gap: 10px; 
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  min-height: 48px;
  -webkit-tap-highlight-color: transparent;
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
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  cursor: pointer;
  accent-color: var(--accent);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  display: none;
}

.selection-mode .file-checkbox {
  display: block;
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
  position: relative;
}

.menu-btn {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 8px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 6px;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.menu-btn:hover {
  background: var(--hover);
  color: var(--accent);
}

.menu-btn svg {
  pointer-events: none;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 160px;
  z-index: 1000;
  display: none;
  overflow: hidden;
}

.dropdown-menu.active {
  display: block;
  animation: scaleIn 0.15s ease-out;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  color: var(--text);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: 13px;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.dropdown-item:hover {
  background: var(--hover);
}

.dropdown-item svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.dropdown-item.danger {
  color: #ef4444;
}

.dropdown-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.icon-btn { 
  background: transparent; 
  border: 0; 
  cursor: pointer; 
  padding: 8px; 
  min-width: 36px;
  min-height: 36px;
  border-radius: 6px; 
  color: var(--muted);
  display: none;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
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
  
  .controls {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .btn {
    flex: 1;
    min-width: fit-content;
  }
  
  .icon-only-btn {
    width: 44px;
    min-width: 44px;
    height: 44px;
    flex: 0;
  }
  
  .sort-select {
    flex: 1;
    min-width: 120px;
    height: 44px;
  }
  
  .search-box {
    width: 100%;
    max-width: 100%;
    order: 10;
  }
  
  .search-box input {
    height: 44px;
    font-size: 16px;
  }
  
  .actions {
    flex-wrap: wrap;
  }
  
  .icon-btn {
    min-width: 40px;
    min-height: 40px;
  }
  
  .item {
    padding: 14px 8px;
  }
  
  .name {
    font-size: 15px;
  }
  
  .meta {
    font-size: 12px;
  }
  
  .modal {
    min-width: 90vw;
    padding: 16px;
  }
  
  .modal-input {
    font-size: 16px;
    height: 44px;
  }
  
  .modal-btn {
    height: 44px;
    font-size: 16px;
  }
  
  .bulk-actions {
    padding: 12px 8px;
    gap: 8px;
  }
  
  .bulk-btn {
    font-size: 14px;
    padding: 10px 14px;
    height: 44px;
  }
}

@media (min-width: 641px) {
  body {
    padding: 16px;
  }
  
  .header-left {
    flex-direction: row;
    align-items: center;
  }
  
  .controls {
    width: auto;
  }
  
  .btn {
    flex: 0;
  }
  
  .search-box {
    flex: 0;
    min-width: 200px;
  }
  
  .storage-meter {
    width: auto;
    min-width: 200px;
    order: 0;
  }
}
</style>

`;
