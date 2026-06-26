// ConnectionBadge.tsx — Live broker connection status badge for TopBar
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectionStatus } from '../../hooks/useBroker';
import type { BrokerMode } from '../../services/websocketBroker';

const MODE_CONFIG: Record<BrokerMode, {
  dot: string; label: string; detail: string; bg: string; border: string; textColor: string;
}> = {
  connected: {
    dot: '#4CAF50', label: 'LIVE', detail: 'Connected to MQTT broker',
    bg: 'rgba(76,175,80,0.10)', border: 'rgba(76,175,80,0.30)', textColor: '#4CAF50',
  },
  connecting: {
    dot: '#FFC107', label: 'CONNECTING', detail: 'Reaching broker…',
    bg: 'rgba(255,193,7,0.10)', border: 'rgba(255,193,7,0.30)', textColor: '#FFC107',
  },
  mock: {
    dot: '#2196F3', label: 'DEMO', detail: 'Mock simulation active',
    bg: 'rgba(33,150,243,0.10)', border: 'rgba(33,150,243,0.25)', textColor: '#2196F3',
  },
  disconnected: {
    dot: '#F44336', label: 'OFFLINE', detail: 'No broker connection',
    bg: 'rgba(244,67,54,0.10)', border: 'rgba(244,67,54,0.25)', textColor: '#F44336',
  },
};

export default function ConnectionBadge() {
  const status = useConnectionStatus();
  const [showPopover, setShowPopover] = useState(false);
  const cfg = MODE_CONFIG[status.mode];
  const isPulsing = status.mode === 'connected' || status.mode === 'connecting';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPopover(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 20,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          cursor: 'pointer', outline: 'none',
        }}
        title="Click to see connection details"
      >
        {/* Pulsing dot */}
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10 }}>
          {isPulsing && (
            <motion.span
              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', background: cfg.dot,
              }}
            />
          )}
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'block', position: 'relative', zIndex: 1 }} />
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: cfg.textColor }}>
          {cfg.label}
        </span>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {showPopover && (
          <>
            {/* Backdrop */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 8000 }} onClick={() => setShowPopover(false)} />

            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 280, zIndex: 8001,
                background: 'rgba(8,14,24,0.98)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12, padding: '16px 18px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Arrow */}
              <div style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 12, height: 6, overflow: 'hidden',
              }}>
                <div style={{
                  width: 10, height: 10, background: 'rgba(255,255,255,0.10)',
                  transform: 'rotate(45deg)', marginLeft: 1, marginTop: 3,
                }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, display: 'block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.textColor }}>{cfg.label}</span>
                </div>
                <p style={{ fontSize: 11, color: '#8AA0B8', margin: 0, lineHeight: 1.5 }}>{cfg.detail}</p>
                {status.lastError && (
                  <p style={{ fontSize: 10, color: '#F44336', marginTop: 6, lineHeight: 1.5 }}>{status.lastError}</p>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Row label="Mode" value={status.mode === 'mock' ? 'Demo Simulation' : status.mode === 'connected' ? 'Real MQTT Broker' : status.mode} />
                <Row label="Broker URL" value={status.brokerUrl || 'Not configured'} />
                {status.lastConnected && (
                  <Row label="Last connected" value={new Date(status.lastConnected).toLocaleTimeString()} />
                )}
                {status.reconnectCount > 0 && (
                  <Row label="Reconnect attempts" value={String(status.reconnectCount)} />
                )}
              </div>

              {/* How to go live hint */}
              {status.mode === 'mock' && (
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(33,150,243,0.08)', border: '1px solid rgba(33,150,243,0.2)',
                }}>
                  <p style={{ fontSize: 10, color: '#5BA4CF', margin: 0, lineHeight: 1.55 }}>
                    <strong style={{ color: '#2196F3' }}>Go live:</strong> Set <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0 4px', borderRadius: 3 }}>BROKER_URL</code> in{' '}
                    <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0 4px', borderRadius: 3 }}>websocketBroker.ts</code>{' '}
                    to your MQTT broker's WebSocket endpoint, e.g.{' '}
                    <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0 4px', borderRadius: 3, display: 'block', marginTop: 4 }}>
                      ws://192.168.1.10:9001
                    </code>
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: '#506070', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#CBD8E8', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
