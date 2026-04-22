'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppMode, CONTROL_NAV, COLORS } from '@/lib/constants'

interface NavBarProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  currentPath?: string
}

export default function NavBar({ mode, onModeChange, currentPath = '/' }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      {/* ─── 로고 ─────────────────────────────── */}
      <div className="navbar-logo">
        <Link href="/" className="logo-link">
          <span className="logo-icon">🧠</span>
          <div className="logo-text">
            <span className="logo-title">HajunAI</span>
            <span className="logo-sub">BRAINPOOL</span>
          </div>
        </Link>
      </div>

      {/* ─── 데스크톱 네비게이션 ────────────────── */}
      <div className="navbar-links desktop-only">
        {mode === 'control' && CONTROL_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${currentPath === item.href ? 'nav-link-active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
        {mode === 'dev' && (
          <Link
            href="/settings"
            className={`nav-link ${currentPath === '/settings' ? 'nav-link-active' : ''}`}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">설정</span>
          </Link>
        )}
      </div>

      {/* ─── 모드 토글 ─────────────────────────── */}
      <div className="navbar-actions">
        <div className="mode-toggle">
          <button
            onClick={() => onModeChange('dev')}
            className={`mode-btn ${mode === 'dev' ? 'mode-btn-active' : ''}`}
            title="개발자 모드: 로그, 디버깅, 상태 확인"
          >
            🛠 Dev
          </button>
          <button
            onClick={() => onModeChange('control')}
            className={`mode-btn ${mode === 'control' ? 'mode-btn-active' : ''}`}
            title="컨트롤 모드: 아이디어, 맥락, 일정, AI, KPI, 헬스"
          >
            📊 Control
          </button>
        </div>

        {/* 모바일 햄버거 */}
        <button
          className="hamburger mobile-only"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="메뉴 열기"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ─── 모바일 드롭다운 메뉴 ──────────────── */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          {mode === 'control' && CONTROL_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-link ${currentPath === item.href ? 'nav-link-active' : ''}`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
          {mode === 'dev' && (
            <Link href="/settings" className="mobile-nav-link">
              ⚙️ 설정
            </Link>
          )}
        </div>
      )}

      <style>{`
        .navbar {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid ${COLORS.border};
          background: ${COLORS.bg};
          flex-wrap: wrap;
          min-height: 52px;
        }
        .navbar-logo { flex-shrink: 0; }
        .logo-link {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: ${COLORS.text};
        }
        .logo-icon { font-size: 20px; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-title { font-weight: 700; font-size: 14px; line-height: 1.2; }
        .logo-sub { font-size: 9px; color: ${COLORS.muted}; letter-spacing: 1px; }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          flex-wrap: wrap;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          text-decoration: none;
          color: ${COLORS.textSub};
          font-size: 12px;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .nav-link:hover { background: ${COLORS.surface}; color: ${COLORS.text}; }
        .nav-link-active { background: ${COLORS.surface}; color: ${COLORS.accent}; }
        .nav-icon { font-size: 13px; }
        .nav-label {}

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .mode-toggle {
          display: flex;
          gap: 4px;
          background: ${COLORS.surface};
          padding: 3px;
          border-radius: 8px;
        }
        .mode-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          color: ${COLORS.textSub};
          background: transparent;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .mode-btn:hover { color: ${COLORS.text}; }
        .mode-btn-active {
          background: ${COLORS.accent};
          color: #fff;
        }

        .hamburger {
          display: none;
          background: ${COLORS.surface};
          color: ${COLORS.text};
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 16px;
        }

        .mobile-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: ${COLORS.surface};
          border-bottom: 1px solid ${COLORS.border};
          display: flex;
          flex-direction: column;
          z-index: 100;
          padding: 8px 0;
        }
        .mobile-nav-link {
          display: block;
          padding: 12px 20px;
          text-decoration: none;
          color: ${COLORS.textSub};
          font-size: 14px;
          transition: background 0.15s;
        }
        .mobile-nav-link:hover,
        .mobile-nav-link.nav-link-active {
          background: ${COLORS.bg};
          color: ${COLORS.accent};
        }

        /* ─── 반응형 ─── */
        @media (max-width: 640px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
          .hamburger    { display: flex; }
          .mode-btn { font-size: 10px; padding: 3px 7px; }
        }
        @media (min-width: 641px) {
          .mobile-only { display: none !important; }
          .hamburger   { display: none; }
        }
      `}</style>
    </nav>
  )
}
