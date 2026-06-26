// ToastNotification.tsx — Stacked toast notifications with framer-motion
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addToastListener, type SimulatorToast } from '../../services/mqttSimulator';
import { addVoiceToastListener } from '../../hooks/useVoiceToast';

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 3000;

export default function ToastNotification() {
  const [toasts, setToasts] = useState<SimulatorToast[]>([]);

  const push = (toast: SimulatorToast) => {
    setToasts(prev => [toast, ...prev].slice(0, MAX_TOASTS));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, AUTO_DISMISS_MS);
  };

  useEffect(() => {
    const r1 = addToastListener(push);
    const r2 = addVoiceToastListener(push);
    return () => { r1(); r2(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              background: 'rgba(8,14,24,0.95)',
              border: '1px solid rgba(0,212,255,0.25)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12,
              color: '#CBD8E8',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              maxWidth: 300,
              pointerEvents: 'auto',
            }}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
