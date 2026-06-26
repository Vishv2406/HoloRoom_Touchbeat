// OnboardingTour.tsx — 6-step first-time user tour with spotlight overlay
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTourHighlight } from '../../hooks/useTourHighlight';

const TOUR_KEY = 'holoroom_toured';
const PAD = 12;

interface Step {
  selector: string | null;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="canvas"]',
    title: '👋 Welcome to HOLOROOM!',
    body: 'This is your 3D smart home. Drag to rotate, scroll to zoom, and click devices to control them.',
  },
  {
    selector: '[data-tour="room-label"]',
    title: '🏠 Explore your rooms',
    body: 'Click any room to see its devices and energy usage. Each room shows live device status.',
  },
  {
    selector: '[data-tour="design-btn"]',
    title: '🏗️ Design Mode',
    body: 'Use Design Mode to add rooms, move furniture, and customize your layout. Drag rooms directly in 3D!',
  },
  {
    selector: '[data-tour="energy-btn"]',
    title: '⚡ Energy Monitor',
    body: 'Track real-time power consumption, monthly cost estimates, and per-device energy usage.',
  },
  {
    selector: '[data-tour="scenes-section"]',
    title: '🎬 Scenes',
    body: 'Scenes let you control multiple devices with one tap — set the mood instantly.',
  },
  {
    selector: '[data-tour="voice-btn"]',
    title: '🎙️ Voice Commands',
    body: "Try saying 'turn off all lights' or 'activate Good Evening'. Your home listens!",
  },
];

interface Props {
  onDone?: () => void;
}

export default function OnboardingTour({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      setVisible(true);
    }
  }, []);

  const current = STEPS[step];
  const spotlight = useTourHighlight(visible ? current.selector : null);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onDone?.();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  const back = () => setStep(s => Math.max(0, s - 1));

  if (!visible) return null;

  // Spotlight clip path using SVG polygon to cut a hole
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const sp = spotlight
    ? { top: spotlight.top - PAD, left: spotlight.left - PAD, width: spotlight.width + PAD * 2, height: spotlight.height + PAD * 2 }
    : null;

  // Tooltip position: prefer below spotlight, fallback to center
  const TIP_W = 300;
  const TIP_H = 190;
  const EDGE = 12; // min gap from viewport edges

  let tipTop = sh / 2 - TIP_H / 2;
  let tipLeft = sw / 2 - TIP_W / 2;

  if (sp) {
    // Prefer below, fallback to above
    let candidateTop = sp.top + sp.height + 20;
    if (candidateTop + TIP_H > sh - EDGE) {
      candidateTop = sp.top - TIP_H - 20;
    }
    tipTop = Math.max(EDGE, Math.min(sh - TIP_H - EDGE, candidateTop));

    // Center horizontally on spotlight, but clamp so tooltip never leaves viewport
    let candidateLeft = sp.left + sp.width / 2 - TIP_W / 2;
    tipLeft = Math.max(EDGE, Math.min(sw - TIP_W - EDGE, candidateLeft));
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9990,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.target === e.currentTarget && finish()}
      >
        {/* Dark overlay with spotlight cutout using SVG */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          <defs>
            <mask id="tour-mask">
              <rect width={sw} height={sh} fill="white" />
              {sp && (
                <rect
                  x={sp.left}
                  y={sp.top}
                  width={sp.width}
                  height={sp.height}
                  rx={8}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width={sw}
            height={sh}
            fill="rgba(0,0,0,0.72)"
            mask="url(#tour-mask)"
          />
          {/* Spotlight border glow */}
          {sp && (
            <rect
              x={sp.left - 1}
              y={sp.top - 1}
              width={sp.width + 2}
              height={sp.height + 2}
              rx={9}
              fill="none"
              stroke="rgba(0,212,255,0.6)"
              strokeWidth={2}
            />
          )}
        </svg>

        {/* Tooltip card */}
        <motion.div
          key={`tooltip-${step}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'absolute',
            top: tipTop,
            left: tipLeft,
            width: TIP_W,
            background: 'rgba(8,14,24,0.97)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: 14,
            padding: '18px 20px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? 'var(--cyan, #00D4FF)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: '#E8F4FF', marginBottom: 8 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 13, color: '#8AA0B8', lineHeight: 1.55, marginBottom: 18 }}>
            {current.body}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={finish}
              style={{ fontSize: 12, color: '#607080', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              Skip tour
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={back}
                  style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#CBD8E8',
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  fontSize: 13, padding: '6px 18px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--cyan, #00D4FF)', border: 'none', color: '#000',
                  fontWeight: 600,
                }}
              >
                {step === STEPS.length - 1 ? "Let's Go! 🚀" : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
