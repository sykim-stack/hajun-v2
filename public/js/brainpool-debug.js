// brainpool-debug.js
// ?debug=1 로 활성화 · 모바일 콘솔 대체
// 사용법: <script src="/public/js/brainpool-debug.js"></script>

(function () {
    const ACTIVE = new URLSearchParams(location.search).get('debug') === '1';
    if (!ACTIVE) return;
  
    // ── 프로젝트 감지 ──────────────────────────────────────────
    const PROJECT =
      location.hostname.includes('corering') ? 'CoreRing' :
      location.hostname.includes('corechat') ? 'CoreChat' :
      location.pathname.includes('hajun')    ? 'CoreNull/hajun' :
      'CoreNull';
  
    // ── 로그 저장소 ────────────────────────────────────────────
    const MAX_LOGS = 200;
    const logs = [];
  
    function push(level, args) {
      const entry = {
        t: new Date().toISOString().slice(11, 23),
        level,
        msg: args.map(a => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          if (typeof a === 'object') {
            try { return JSON.stringify(a, null, 0).slice(0, 300); }
            catch { return String(a); }
          }
          return String(a);
        }).join(' '),
      };
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs.pop();
      renderLogs();
    }
  
    // ── 콘솔 가로채기 ─────────────────────────────────────────
    ['log', 'warn', 'error', 'info'].forEach(method => {
      const orig = console[method].bind(console);
      console[method] = function (...args) {
        orig(...args);
        push(method, args);
      };
    });
  
    // ── 글로벌 에러 ───────────────────────────────────────────
    window.onerror = function (msg, src, line, col, err) {
      push('error', [`[JS ERROR] ${msg}`, `@ ${src?.split('/').pop()}:${line}:${col}`]);
    };
  
    window.addEventListener('unhandledrejection', e => {
      const reason = e.reason instanceof Error
        ? `${e.reason.name}: ${e.reason.message}`
        : String(e.reason);
      push('error', [`[UNHANDLED PROMISE] ${reason}`]);
    });
  
    // ── fetch 가로채기 (API 호출 추적) ────────────────────────
    const _fetch = window.fetch;
    const apiStats = {};   // { url: { ok, fail, lastErr } }
  
    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '?';
      const method = args[1]?.method || 'GET';
      const key = `${method} ${url.split('?')[0]}`;
  
      const t0 = Date.now();
      try {
        const res = await _fetch(...args);
        const ms = Date.now() - t0;
        if (!res.ok) {
          apiStats[key] = apiStats[key] || { ok: 0, fail: 0 };
          apiStats[key].fail++;
          apiStats[key].lastErr = `HTTP ${res.status}`;
          push('warn', [`[API ✗] ${key} ${res.status} (${ms}ms)`]);
        } else {
          apiStats[key] = apiStats[key] || { ok: 0, fail: 0 };
          apiStats[key].ok++;
          push('log', [`[API ✓] ${key} (${ms}ms)`]);
        }
        renderApiStats();
        return res;
      } catch (err) {
        const ms = Date.now() - t0;
        apiStats[key] = apiStats[key] || { ok: 0, fail: 0 };
        apiStats[key].fail++;
        apiStats[key].lastErr = err.message;
        push('error', [`[API ✗] ${key} NETWORK ERR (${ms}ms) ${err.message}`]);
        renderApiStats();
        throw err;
      }
    };
  
    // ── UI 생성 ───────────────────────────────────────────────
    const panel = document.createElement('div');
    panel.id = '__bp_debug';
    panel.className = 'bp-debug-panel';
    panel.innerHTML = `
      <div class="bp-debug-header">
        <span class="bp-debug-badge">${PROJECT}</span>
        <span class="bp-debug-title">DEBUG</span>
        <div class="bp-debug-tabs">
          <button class="bp-tab bp-tab-active" data-tab="logs">LOG</button>
          <button class="bp-tab" data-tab="api">API</button>
        </div>
        <button class="bp-debug-toggle" id="__bp_toggle">−</button>
      </div>
      <div class="bp-debug-body" id="__bp_body">
        <div class="bp-tab-panel bp-tab-panel-active" id="__bp_logs"></div>
        <div class="bp-tab-panel" id="__bp_api"></div>
      </div>`;
  
    const style = document.createElement('style');
    style.textContent = `
      #__bp_debug {
        position:fixed; bottom:0; left:0; right:0; z-index:99999;
        background:#0d1117; border-top:2px solid #30363d;
        font-family:'JetBrains Mono',monospace; font-size:11px;
        max-height:44vh; display:flex; flex-direction:column;
        box-shadow:0 -4px 24px rgba(0,0,0,.6);
      }
      #__bp_debug.bp-collapsed .bp-debug-body { display:none; }
      .bp-debug-header {
        display:flex; align-items:center; gap:8px;
        padding:6px 10px; background:#161b22;
        border-bottom:1px solid #30363d; flex-shrink:0;
      }
      .bp-debug-badge {
        background:#238636; color:#fff; border-radius:4px;
        padding:1px 7px; font-size:10px; letter-spacing:1px; white-space:nowrap;
      }
      .bp-debug-title { color:#8b949e; font-size:10px; letter-spacing:2px; }
      .bp-debug-tabs { display:flex; gap:4px; margin-left:auto; }
      .bp-tab {
        background:none; border:1px solid #30363d; color:#8b949e;
        border-radius:4px; padding:2px 10px; font-size:10px;
        cursor:pointer; font-family:inherit;
      }
      .bp-tab-active { background:#21262d; color:#c9d1d9; border-color:#58a6ff; }
      .bp-debug-toggle {
        background:#21262d; border:1px solid #30363d; color:#c9d1d9;
        border-radius:4px; padding:2px 8px; cursor:pointer; font-family:inherit;
      }
      .bp-debug-body {
        overflow-y:auto; flex:1;
        scrollbar-width:thin; scrollbar-color:#30363d transparent;
      }
      .bp-tab-panel { display:none; padding:4px 0; }
      .bp-tab-panel-active { display:block; }
      .bp-log {
        padding:2px 10px; border-bottom:1px solid #161b22;
        display:flex; gap:8px; align-items:baseline; line-height:1.5;
      }
      .bp-log-t  { color:#484f58; flex-shrink:0; }
      .bp-log-msg{ color:#c9d1d9; word-break:break-all; flex:1; }
      .bp-log.bp-log-error  .bp-log-msg { color:#f85149; }
      .bp-log.bp-log-warn   .bp-log-msg { color:#e3b341; }
      .bp-log.bp-log-info   .bp-log-msg { color:#58a6ff; }
      .bp-api-row {
        padding:4px 10px; border-bottom:1px solid #161b22;
        display:flex; align-items:center; gap:8px; flex-wrap:wrap;
      }
      .bp-api-key  { color:#79c0ff; flex:1; word-break:break-all; }
      .bp-api-ok   { color:#3fb950; font-size:10px; }
      .bp-api-fail { color:#f85149; font-size:10px; }
      .bp-api-err  { color:#e3b341; font-size:10px; flex-basis:100%; padding-left:8px; }
    `;
    document.head.appendChild(style);
  
    function ready(fn) {
      if (document.body) fn();
      else document.addEventListener('DOMContentLoaded', fn);
    }
  
    ready(() => {
      document.body.appendChild(panel);
  
      // 탭 전환
      panel.querySelectorAll('.bp-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          panel.querySelectorAll('.bp-tab').forEach(b => b.classList.remove('bp-tab-active'));
          panel.querySelectorAll('.bp-tab-panel').forEach(p => p.classList.remove('bp-tab-panel-active'));
          btn.classList.add('bp-tab-active');
          document.getElementById('__bp_' + btn.dataset.tab)?.classList.add('bp-tab-panel-active');
        });
      });
  
      // 접기/펼치기
      document.getElementById('__bp_toggle').addEventListener('click', () => {
        const collapsed = panel.classList.toggle('bp-collapsed');
        document.getElementById('__bp_toggle').textContent = collapsed ? '+' : '−';
      });
    });
  
    // ── 로그 렌더 ─────────────────────────────────────────────
    function renderLogs() {
      const el = document.getElementById('__bp_logs');
      if (!el) return;
      el.innerHTML = logs.map(l => `
        <div class="bp-log bp-log-${l.level}">
          <span class="bp-log-t">${l.t}</span>
          <span class="bp-log-msg">${escHtml(l.msg)}</span>
        </div>`).join('');
    }
  
    // ── API 통계 렌더 ─────────────────────────────────────────
    function renderApiStats() {
      const el = document.getElementById('__bp_api');
      if (!el) return;
      const rows = Object.entries(apiStats)
        .sort((a, b) => (b[1].fail - a[1].fail))
        .map(([key, s]) => `
          <div class="bp-api-row">
            <span class="bp-api-key">${escHtml(key)}</span>
            <span class="bp-api-ok">✓${s.ok}</span>
            <span class="bp-api-fail">✗${s.fail}</span>
            ${s.lastErr ? `<span class="bp-api-err">${escHtml(s.lastErr)}</span>` : ''}
          </div>`).join('');
      el.innerHTML = rows || '<div style="padding:10px;color:#484f58;">API 호출 없음</div>';
    }
  
    function escHtml(s) {
      return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
  
    push('info', [`[BRAINPOOL DEBUG] ${PROJECT} · ${location.pathname}`]);
  })();