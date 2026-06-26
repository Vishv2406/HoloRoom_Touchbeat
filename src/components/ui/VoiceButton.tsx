// VoiceButton.tsx — Floating voice command button
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

export default function VoiceButton() {
  const { isListening, transcript, resultStatus, start, stop, supported } = useVoiceCommands();

  if (!supported) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {/* Transcript / result bubble */}
      <AnimatePresence>
        {(transcript || resultStatus) && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              background: 'rgba(8,14,24,0.92)',
              border: '1px solid rgba(0,212,255,0.3)',
              borderRadius: 10,
              padding: '6px 14px',
              fontSize: 12,
              color: resultStatus ? '#5BC8A8' : '#CBD8E8',
              backdropFilter: 'blur(12px)',
              whiteSpace: 'nowrap',
              maxWidth: 260,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {resultStatus || `"${transcript}"`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <motion.button
        onClick={isListening ? stop : start}
        animate={isListening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={isListening ? { repeat: Infinity, duration: 1.2 } : {}}
        style={{
          pointerEvents: 'auto',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `2px solid ${isListening ? '#FF4444' : 'rgba(0,212,255,0.4)'}`,
          background: isListening ? 'rgba(255,68,68,0.15)' : 'rgba(8,14,24,0.85)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isListening ? '#FF4444' : '#00D4FF',
          boxShadow: isListening
            ? '0 0 0 6px rgba(255,68,68,0.15), 0 4px 20px rgba(0,0,0,0.4)'
            : '0 4px 20px rgba(0,0,0,0.4)',
        }}
        title={isListening ? 'Stop listening' : 'Start voice command'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </motion.button>
    </div>
  );
}
