// TopBar.tsx — Redesigned: clean, aesthetic, non-overlapping, fully responsive
import { useEffect, useState } from 'react';
import { Zap, Bell, Settings, Edit3, Wifi, Home, HelpCircle, Menu, X, BrainCircuit } from 'lucide-react';
import { useHomeStore } from '../../store/useHomeStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useUIStore } from '../../store/useUIStore';
import { useAIStore } from '../../store/useAIStore';
import ConnectionBadge from './ConnectionBadge';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import FloorPlanButton from '../floorplan/FloorPlanButton';

interface TopBarProps {
  onViewAll?: () => void;
}

export default function TopBar({ onViewAll }: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const totalPower = useHomeStore(s => s.getTotalPower());
  const activeCount = useHomeStore(s => s.getActiveDeviceCount());
  const homeName = useHomeStore(s => s.homeName);
  const setHomeName = useHomeStore(s => s.setHomeName);
  const setDesignMode = useHomeStore(s => s.setDesignMode);
  const isDarkMode = useUIStore(s => s.isDarkMode);
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode);

  const openAI = useAIStore(s => s.openPanel);
  const isAIConfigured = useAIStore(s => s.isConfigured);

  const scenes = useSceneStore(s => s.scenes);
  const playScene = useSceneStore(s => s.playScene);
  const activeSceneId = useSceneStore(s => s.activeSceneId);

  const unreadCount = useUIStore(s => s.getUnreadCount());
  const toggleNotifications = useUIStore(s => s.toggleNotifications);
  const toggleSettings = useUIStore(s => s.toggleSettings);
  const is2DMode = useUIStore(s => s.is2DMode);
  const toggle2DMode = useUIStore(s => s.toggle2DMode);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const powerColor = totalPower < 500 ? 'var(--green)' : totalPower < 2000 ? 'var(--amber)' : 'var(--red)';

  const startEdit = () => { setNameInput(homeName); setEditingName(true); };
  const commitEdit = () => { if (nameInput.trim()) setHomeName(nameInput.trim()); setEditingName(false); };

  const startTour = () => {
    localStorage.removeItem('holoroom_toured');
    window.location.reload();
  };

  // Icon-only button style — subtle, no border boxes
  const iconBtn = {
    base: 'relative flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-white/5 active:scale-95',
    size: 'w-8 h-8',
  };

  // Pill button — for labeled actions
  const pillBtn = `flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-150 hover:bg-white/5 active:scale-95`;

  return (
    <>
      <header
        style={{
          height: 52,
          background: 'rgba(13,17,23,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          zIndex: 50,
          flexShrink: 0,
        }}
        className="flex items-center justify-between px-3 gap-2"
      >
        {/* ── LEFT: Logo + Home Name + Status ── */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Logo */}
          <img
            src="/image3.png"
            alt="TouchBeat"
            style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block', flexShrink: 0 }}
          />

          {/* Vertical divider */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* Home name */}
          <div className="flex items-center gap-1.5 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => e.key === 'Enter' && commitEdit()}
                className="text-xs bg-transparent outline-none border-b"
                style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)', width: 100 }}
              />
            ) : (
              <button
                onDoubleClick={startEdit}
                className="text-xs truncate"
                style={{ color: 'var(--text-secondary)', maxWidth: 80 }}
              >
                {homeName}
              </button>
            )}
            <ConnectionBadge />
          </div>

          {/* Divider */}
          <div className="hidden sm:block" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* Stats — hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1.5">
            {/* Active count */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(76,175,80,0.1)', color: 'var(--green)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
              {activeCount}
              <span className="hidden md:inline ml-0.5" style={{ color: 'rgba(76,175,80,0.7)' }}>active</span>
            </div>
            {/* Power */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: powerColor }}>
              <Zap size={10} />
              {Math.round(totalPower)}W
            </div>
          </div>
        </div>

        {/* ── CENTER: Clock + Weather + Wifi ── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <span className="font-display font-semibold text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {formatTime(time)}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Surat 30°C ☀️</span>
          <Wifi size={13} style={{ color: 'var(--accent)' }} />
        </div>

        {/* ── RIGHT: Actions ── */}
        <div className="flex items-center gap-0.5 shrink-0">

          {/* View All — desktop only */}
          {onViewAll && (
            <button onClick={onViewAll} className={cn(pillBtn, 'hidden lg:flex')}
              style={{ color: 'var(--text-secondary)' }} title="View entire floor plan">
              <Home size={12} />
              <span>View All</span>
            </button>
          )}

          {/* 3D / 2D toggle — pill style */}
          <div className="hidden sm:flex items-center rounded-xl overflow-hidden mr-1"
            style={{ background: 'rgba(255,255,255,0.04)', padding: 2, gap: 2 }}>
            <button
              onClick={() => is2DMode && toggle2DMode()}
              className={cn('px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all duration-200')}
              style={!is2DMode
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 0 8px rgba(33,150,243,0.4)' }
                : { color: 'var(--text-muted)' }}
            >3D</button>
            <button
              onClick={() => !is2DMode && toggle2DMode()}
              className={cn('px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all duration-200')}
              style={is2DMode
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 0 8px rgba(33,150,243,0.4)' }
                : { color: 'var(--text-muted)' }}
            >2D</button>
          </div>

          {/* Scene quick buttons — desktop only */}
          <div className="hidden lg:flex items-center gap-0.5 mr-1" data-tour="scenes-section">
            {scenes.slice(0, 5).map(scene => (
              <div key={scene.id} className="relative group">
                <button
                  onClick={() => playScene(scene.id)}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all duration-150',
                    activeSceneId === scene.id ? 'animate-pulse' : 'hover:scale-110 hover:bg-white/5'
                  )}
                  style={{
                    background: activeSceneId === scene.id ? `${scene.color}22` : 'transparent',
                    boxShadow: activeSceneId === scene.id ? `0 0 0 1px ${scene.color}66` : 'none',
                  }}
                  title={scene.name}
                >
                  {scene.emoji}
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {scene.name}
                </div>
              </div>
            ))}
          </div>

          {/* Thin divider */}
          <div className="hidden lg:block mx-1" style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)' }} />

          {/* Import floor plan — desktop */}
          <div className="hidden lg:block">
            <FloorPlanButton variant="topbar" />
          </div>

          {/* Dark mode toggle — icon only */}
          <button onClick={toggleDarkMode}
            className={cn(iconBtn.base, iconBtn.size)}
            style={{ color: isDarkMode ? '#7090FF' : 'var(--text-secondary)' }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Help / Tour — desktop */}
          <button onClick={startTour}
            className={cn(iconBtn.base, iconBtn.size, 'hidden md:flex')}
            style={{ color: 'var(--text-muted)' }}
            title="Start onboarding tour">
            <HelpCircle size={15} />
          </button>

          {/* Design — desktop */}
          <button onClick={() => setDesignMode(true)}
            className={cn(pillBtn, 'hidden md:flex')}
            style={{ color: 'var(--text-secondary)' }}
            data-tour="design-btn">
            <Edit3 size={12} />
            <span className="hidden lg:inline">Design</span>
          </button>

          {/* AI Copilot button */}
          <button
            onClick={openAI}
            className={cn(pillBtn, 'hidden sm:flex')}
            style={{
              color: isAIConfigured ? 'var(--cyan)' : 'var(--text-secondary)',
              background: isAIConfigured ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: isAIConfigured ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
            }}
            title="AI Copilot"
            data-tour="ai-btn">
            <BrainCircuit size={13} />
            <span className="hidden md:inline">AI</span>
          </button>

          {/* Energy */}
          <button
            className={cn(iconBtn.base, iconBtn.size)}
            style={{ color: 'var(--amber)' }}
            onClick={() => useUIStore.getState().toggleEnergy()}
            title="Energy Monitor"
            data-tour="energy-btn">
            <Zap size={15} />
          </button>

          {/* Notifications */}
          <button onClick={toggleNotifications}
            className={cn(iconBtn.base, iconBtn.size)}
            style={{ color: 'var(--text-secondary)' }}>
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: 'var(--red)', color: '#fff', lineHeight: 1 }}>
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {/* Settings */}
          <button onClick={toggleSettings}
            className={cn(iconBtn.base, iconBtn.size)}
            style={{ color: 'var(--text-secondary)' }}>
            <Settings size={15} />
          </button>

          {/* Mobile hamburger — shows on small screens */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className={cn(iconBtn.base, iconBtn.size, 'flex md:hidden ml-0.5')}
            style={{ color: 'var(--text-secondary)' }}>
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden flex flex-col gap-3 px-4 py-4"
          style={{
            background: 'rgba(13,17,23,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            zIndex: 49,
          }}
        >
          {/* Clock + weather row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {formatTime(time)}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Surat 30°C ☀️</span>
              <Wifi size={13} style={{ color: 'var(--accent)' }} />
            </div>
            {/* Stats on mobile */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                style={{ background: 'rgba(76,175,80,0.1)', color: 'var(--green)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
                {activeCount} active
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                style={{ background: 'rgba(255,255,255,0.04)', color: powerColor }}>
                <Zap size={9} />
                {Math.round(totalPower)}W
              </div>
            </div>
          </div>

          {/* 3D / 2D + View All */}
          <div className="flex items-center gap-2">
            {onViewAll && (
              <button onClick={() => { onViewAll(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <Home size={12} /> View All
              </button>
            )}
            <div className="flex items-center rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', padding: 2, gap: 2 }}>
              <button onClick={() => is2DMode && toggle2DMode()}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={!is2DMode ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}>
                3D
              </button>
              <button onClick={() => !is2DMode && toggle2DMode()}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={is2DMode ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}>
                2D
              </button>
            </div>
          </div>

          {/* Scenes row */}
          {scenes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: 'var(--text-muted)' }}>Scenes</span>
              {scenes.slice(0, 6).map(scene => (
                <button key={scene.id}
                  onClick={() => { playScene(scene.id); setMobileMenuOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                  style={{
                    background: activeSceneId === scene.id ? `${scene.color}22` : 'rgba(255,255,255,0.04)',
                    boxShadow: activeSceneId === scene.id ? `0 0 0 1px ${scene.color}55` : 'none',
                    color: 'var(--text-secondary)',
                  }}>
                  {scene.emoji} {scene.name}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setDesignMode(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              <Edit3 size={12} /> Design
            </button>
            <button onClick={() => { startTour(); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              <HelpCircle size={12} /> Tour
            </button>
            <div onClick={() => setMobileMenuOpen(false)}>
              <FloorPlanButton variant="topbar" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
