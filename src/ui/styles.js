export const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --white:#fff;--gray-10:#fafafa;--gray-50:#f0f0f0;--gray-100:#dcdcde;--gray-200:#bfbfc3;--gray-300:#9e9ea6;--gray-400:#80808a;--gray-500:#62626b;--gray-700:#33333d;--gray-900:#1a1a23;--gray-950:#111118;
  --blue-400:#6199f7;--blue-500:#3b6fd4;--blue-600:#2952a3;--blue-50:#e8f0fe;
  --red-400:#f0626e;--red-500:#b32d36;--red-50:#fce8ea;
  --green-500:#1f825a;--green-50:#e8f5ef;
  --orange-500:#b05014;--orange-50:#fdf1e9;
  --radius:4px;--shadow-sm:0 1px 3px rgba(0,0,0,.06);--shadow-md:0 4px 12px rgba(0,0,0,.1);
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",sans-serif;
  --font-mono:"GitLab Mono","JetBrains Mono","SF Mono",Menlo,Consolas,monospace;
  --text:var(--gray-900);--text-secondary:var(--gray-500);--text-tertiary:var(--gray-300);
  --bg:var(--white);--bg-secondary:var(--gray-10);--bg-tertiary:var(--gray-50);
  --border:var(--gray-100);--border-strong:var(--gray-200);
  --accent:var(--blue-500);--accent-light:var(--blue-50);
}
@media(prefers-color-scheme:dark){
  :root{
    --white:#1a1a23;--gray-10:#1f1f2a;--gray-50:#252531;--gray-100:#2f2f3d;--gray-200:#3b3b4a;--gray-300:#525263;--gray-400:#6e6e80;--gray-500:#91919e;--gray-700:#bfbfc8;--gray-900:#dcdce0;--gray-950:#f0f0f2;
    --blue-400:#6199f7;--blue-500:#6199f7;--blue-600:#85b3ff;--blue-50:#1a2840;
    --red-400:#f0626e;--red-500:#f0626e;--red-50:#2a1a20;
    --green-500:#36b37e;--green-50:#1a2e25;
    --orange-500:#f59e4b;--orange-50:#2e2318;
    --shadow-sm:0 1px 3px rgba(0,0,0,.25);--shadow-md:0 4px 12px rgba(0,0,0,.35);
  }
}
html{font-size:14px;-webkit-text-size-adjust:100%}
body{font-family:var(--font);background:var(--bg-secondary);color:var(--text);line-height:1.4;min-height:100vh;-webkit-font-smoothing:antialiased}
.container{max-width:1280px;margin:0 auto;padding:12px 16px}

/* ── Top bar: ultra-minimal Pajamas ── */
.header{display:flex;align-items:center;gap:10px;padding:6px 0;margin-bottom:10px;border-bottom:1px solid var(--border)}
.header-left{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
.title{display:flex;align-items:center;gap:4px;color:var(--accent);flex-shrink:0}
.title svg{width:18px;height:18px}
.breadcrumb{display:flex;align-items:center;gap:1px;font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.breadcrumb a{color:var(--accent);text-decoration:none;padding:2px 3px;border-radius:3px}
.breadcrumb a:hover{background:var(--accent-light)}
.breadcrumb-sep{color:var(--text-tertiary);margin:0 2px;user-select:none}
.controls{display:flex;align-items:center;gap:6px;flex-shrink:0}
.search-box{position:relative;width:180px}
.search-box input{width:100%;height:30px;padding:0 28px 0 8px;border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:12px;outline:none;transition:border-color .12s}
.search-box input:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(59,111,212,.15)}
.search-box input::placeholder{color:var(--text-tertiary)}
.search-close{position:absolute;right:2px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:5px;border-radius:3px;color:var(--text-secondary);display:flex;align-items:center}
.search-close:hover{background:var(--bg-tertiary);color:var(--text)}
.btn,.bulk-btn{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--bg);color:var(--text);font-size:12px;font-weight:500;font-family:var(--font);cursor:pointer;white-space:nowrap;user-select:none;transition:all .1s}
.btn:hover,.bulk-btn:hover{background:var(--bg-tertiary)}
.btn svg,.bulk-btn svg{flex-shrink:0;opacity:.7}
#addBtn{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}#addBtn:hover{background:var(--blue-600);border-color:var(--blue-600)}#addBtn svg{opacity:1}
#uploadBtn,#createLinkBtn,#createFolderBtn{display:none}
.add-btn-group{position:relative}
.add-dropdown{position:absolute;right:0;top:calc(100% + 4px);background:var(--bg);border:1px solid var(--border-strong);border-radius:var(--radius);box-shadow:var(--shadow-md);min-width:170px;z-index:1000;display:none;overflow:hidden}
.add-dropdown.active{display:block}
.add-dropdown-item{display:flex;align-items:center;gap:8px;padding:8px 10px;color:var(--text);cursor:pointer;border:none;background:none;width:100%;text-align:left;font-size:12px;font-family:var(--font);transition:background .06s}
.add-dropdown-item:hover{background:var(--bg-tertiary)}
.add-dropdown-item svg{color:var(--text-secondary);flex-shrink:0}

/* ── Table ── */
.list{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.list-header{display:flex;align-items:center;padding:0 8px;height:30px;background:var(--bg-secondary);border-bottom:1px solid var(--border);font-size:10px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;user-select:none}
.col-checkbox{width:32px;flex-shrink:0;display:flex;align-items:center;padding-left:4px}
.col-name{flex:1;min-width:0;padding:0 4px;cursor:pointer;display:flex;align-items:center;gap:4px}
.col-name:hover{color:var(--text)}
.col-name::after{content:'';width:0;height:0;margin-left:2px;opacity:.4}
.col-name[aria-sort="ascending"]::after{content:'▲';font-size:7px}
.col-name[aria-sort="descending"]::after{content:'▼';font-size:7px}
.col-sort{width:110px;flex-shrink:0;text-align:right;padding:0 4px}
.col-sort select{height:22px;padding:0 18px 0 6px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:3px;background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;outline:none;appearance:none;font-family:var(--font);text-transform:uppercase;letter-spacing:.05em;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%23626b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 4px center}
.col-type{width:56px;flex-shrink:0;display:none;padding:0 4px}
.col-size{width:64px;flex-shrink:0;text-align:right;padding:0 4px}
.col-modified{width:76px;flex-shrink:0;text-align:right;padding:0 4px}
.col-actions{width:30px;flex-shrink:0}

/* ── Rows ── */
.item{display:flex;align-items:center;padding:0 8px;min-height:32px;border-bottom:1px solid var(--bg-tertiary);transition:background .06s}
.item:last-child{border-bottom:none}
.item:hover{background:var(--bg-secondary)}
.item.selected{background:var(--accent-light)}
.file-checkbox{width:14px;height:14px;cursor:pointer;accent-color:var(--accent);flex-shrink:0;display:none}
.selection-mode .file-checkbox{display:block}
.left{display:flex;align-items:center;gap:6px;min-width:0;flex:1;padding:0 4px}
.icon{flex-shrink:0;opacity:.6}
.thumb{width:20px;height:20px;object-fit:cover;border-radius:3px;flex-shrink:0}
.name{font-family:var(--font-mono);font-size:12px;color:var(--text);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.name:hover{color:var(--accent);text-decoration:underline}
.folder-name{color:var(--accent);font-weight:500}
.meta{color:var(--text-secondary);font-size:11px;font-family:var(--font-mono)}
.actions{position:relative}
.menu-btn,.icon-btn{background:none;border:none;cursor:pointer;padding:4px;min-width:26px;min-height:26px;border-radius:var(--radius);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;transition:all .06s}
.menu-btn:hover,.icon-btn:hover{background:var(--bg-tertiary);color:var(--text)}
.icon-btn{display:none}

/* ── Dropdown / Kebab ── */
.dropdown-menu{position:absolute;right:0;top:100%;margin-top:2px;background:var(--bg);border:1px solid var(--border-strong);border-radius:var(--radius);box-shadow:var(--shadow-md);min-width:150px;z-index:1000;display:none;overflow:hidden}
.dropdown-menu.active{display:block}
.dropdown-item{display:flex;align-items:center;gap:8px;padding:7px 10px;color:var(--text);cursor:pointer;border:none;background:var(--bg);width:100%;text-align:left;font-size:12px;font-family:var(--font);transition:background .06s}
.dropdown-item:hover{background:var(--bg-tertiary)}
.dropdown-item svg{color:var(--text-secondary);flex-shrink:0}
.dropdown-item.danger{color:var(--red-500)}.dropdown-item.danger:hover{background:var(--red-50)}
.item:nth-last-child(-n+5) .dropdown-menu{top:auto;bottom:100%;margin-top:0;margin-bottom:2px}

/* ── Storage ── */
.storage-meter{display:flex;flex-direction:column;gap:2px;min-width:100px}
.storage-text{font-size:10px;color:var(--text-secondary);font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.storage-bar{height:3px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden}
.storage-bar-fill{height:100%;background:var(--accent);border-radius:2px;transition:width .3s ease}

/* ── Bulk ── */
.bulk-actions{display:none;align-items:center;gap:8px;padding:8px 12px;background:var(--accent-light);border:1px solid var(--accent);border-radius:var(--radius);margin-bottom:8px;font-size:12px}
.bulk-actions.active{display:flex}
.bulk-info{color:var(--accent);font-weight:600;flex:1}
.bulk-btn.danger{color:var(--red-500);border-color:var(--red-500)}.bulk-btn.danger:hover{background:var(--red-50)}

/* ── Progress ── */
.progress-wrap{display:none;align-items:center;gap:8px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px}
.progress{height:3px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;flex:1}
.progress-bar{height:100%;width:0;background:var(--accent);transition:width .1s linear}
.progress-text{min-width:40px;text-align:right;color:var(--text-secondary);font-size:11px;font-weight:500}

/* ── Drop overlay ── */
.drop-overlay{position:fixed;inset:0;background:rgba(59,111,212,.06);border:2px dashed var(--accent);display:none;align-items:center;justify-content:center;z-index:3000;pointer-events:none}
.drop-overlay.active{display:flex}
.drop-message{background:var(--bg);padding:20px 40px;border-radius:var(--radius);border:1px solid var(--accent);font-size:15px;font-weight:600;color:var(--accent);box-shadow:var(--shadow-md)}

/* ── Empty ── */
.empty-state{padding:40px 16px;text-align:center;color:var(--text-secondary)}
.empty-state-icon{font-size:28px;margin-bottom:8px;opacity:.35}
.empty-state p{font-size:13px}.empty-state p+p{font-size:11px;margin-top:4px;color:var(--text-tertiary)}

/* ── Toast ── */
.toast{position:fixed;bottom:16px;right:16px;z-index:4000;background:var(--gray-900);color:var(--gray-10);padding:8px 14px;border-radius:var(--radius);font-size:12px;font-weight:500;box-shadow:var(--shadow-md);max-width:340px;animation:toastIn .2s ease-out}
.toast.success{border-left:3px solid var(--green-500)}.toast.error{border-left:3px solid var(--red-500)}.toast.info{border-left:3px solid var(--accent)}
@keyframes toastIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

/* ── Modal ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:2000}
.modal{background:var(--bg);border:1px solid var(--border-strong);border-radius:var(--radius);padding:18px 20px;min-width:340px;max-width:92vw;box-shadow:var(--shadow-md)}
.modal-title{font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text)}
.modal-body{margin-bottom:14px}
.modal-label{display:block;font-size:10px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
.modal-input{width:100%;padding:7px 10px;background:var(--bg-secondary);border:1px solid var(--border-strong);border-radius:var(--radius);color:var(--text);font-size:13px;font-family:var(--font-mono);outline:none;margin-bottom:8px;transition:border-color .1s}
.modal-input:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(59,111,212,.15)}
.modal-input[type="password"]{border-color:var(--orange-500)}.modal-input[type="password"]:focus{border-color:var(--orange-500);box-shadow:0 0 0 2px rgba(240,140,0,.12)}
.modal-buttons{display:flex;gap:6px;justify-content:flex-end}
.modal-btn{padding:6px 14px;border-radius:var(--radius);font-size:12px;font-weight:500;border:1px solid var(--border-strong);background:var(--bg);color:var(--text);cursor:pointer;font-family:var(--font);transition:all .06s}
.modal-btn:hover{background:var(--bg-tertiary)}
.modal-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}.modal-btn.primary:hover{background:var(--blue-600)}

/* ── Media ── */
.media-modal{background:var(--bg);border:1px solid var(--border-strong);border-radius:var(--radius);padding:18px 20px;max-width:92vw;max-height:88vh;box-shadow:var(--shadow-md);overflow:auto}
.media-modal video,.media-modal audio{max-width:100%;max-height:60vh;border-radius:3px;background:#000}
.media-modal-title{font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text);word-break:break-all}
.media-modal-close{margin-top:10px;width:100%;padding:7px;border:1px solid var(--border-strong);border-radius:var(--radius);background:var(--bg);cursor:pointer;font-weight:500;font-family:var(--font);font-size:12px}
.media-modal-close:hover{background:var(--bg-tertiary)}

.selection-mode .item{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-radius:2px}

/* ── Mobile ── */
@media(max-width:768px){
  .container{padding:6px 8px}
  .header{flex-wrap:wrap;padding:4px 0 6px;gap:4px}
  .header-left{flex-basis:100%}
  .controls{flex-basis:100%;flex-wrap:wrap;gap:4px}
  .search-box{width:100%;order:10}.search-box input{height:34px;font-size:14px}
  .btn{height:34px;padding:0 10px;font-size:13px}#addBtn{font-size:13px}
  .col-type{display:none}.col-modified{width:60px}.col-size{width:52px}
  .item{min-height:36px;padding:0 5px}.name{font-size:13px}.meta{font-size:10px}
  .menu-btn,.icon-btn{min-width:30px;min-height:30px}
  .modal{min-width:auto;width:94vw;padding:14px 16px}
  .modal-input{font-size:14px;padding:8px}.modal-btn{height:36px;font-size:13px;padding:0 14px}
  .bulk-actions{flex-wrap:wrap;padding:6px 8px;gap:4px}.bulk-btn{height:34px;font-size:11px}
  .storage-meter{flex-basis:100%;min-width:auto;order:-1}
  .col-sort select{height:26px;font-size:10px}
}
@media(min-width:769px){.col-type{display:flex}}
`;
