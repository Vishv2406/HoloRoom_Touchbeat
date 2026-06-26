// LoadingScreen.tsx — App loading screen with TouchBeat branding
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = ['Initializing...', 'Loading rooms...', 'Building 3D model...', 'Ready!'];

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = Math.min(100, p + 2);
        const si = Math.floor((next / 100) * (STEPS.length - 1));
        setStepIdx(si);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => { setDone(true); setTimeout(onComplete, 500); }, 400);
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-0)' }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="mb-6"
          >
            <img
              src="/image3.png"
              alt="TouchBeat Logo"
              className="w-70 h-70 object-contain rounded-2xl"
              style={{ filter: 'drop-shadow(0 0 18px rgba(0, 102, 255, 0.55))' }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display font-bold text-5xl mb-2"
            style={{ background: 'linear-gradient(90deg, #00D4FF, #9D6FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            HOLOROOM 3D
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-base mb-12"
            style={{ color: 'var(--text-secondary)' }}
          >
            Your Smart Home. In 3D. In Your Browser.
          </motion.p>

          {/* Progress bar */}
          <div className="w-72 flex flex-col items-center gap-3">
            <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-3)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00D4FF, #9D6FFF)', width: `${progress}%` }}
                transition={{ type: 'tween' }}
              />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{STEPS[stepIdx]}</p>
          </div>

          {/* TouchBeat brand */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            TouchBeat Automation · touchbeat.in
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
