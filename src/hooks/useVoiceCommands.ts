// useVoiceCommands.ts — Web Speech API voice command processing (AI-enhanced)
import { useCallback, useRef, useState } from 'react';
import { useHomeStore } from '../store/useHomeStore';
import { useSceneStore } from '../store/useSceneStore';
import { useUIStore } from '../store/useUIStore';
import { emitToast } from './useVoiceToast';
import { isAIReady } from '../services/ai/aiProvider';
import { processVoiceWithAI } from '../services/ai/aiService';

export interface VoiceState {
  isListening: boolean;
  transcript: string;
  resultStatus: string;
  start: () => void;
  stop: () => void;
  supported: boolean;
}

export function useVoiceCommands(): VoiceState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [resultStatus, setResultStatus] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const showResult = (msg: string) => {
    setResultStatus(msg);
    setTimeout(() => setResultStatus(''), 2000);
  };

  const processCommand = useCallback(async (text: string) => {
    // Try AI-powered processing first
    if (isAIReady()) {
      emitToast('🧠 Processing with AI...');
      const result = await processVoiceWithAI(text);
      if (result) {
        showResult(`✅ ${result}`);
        emitToast(`🎙️ ${result}`);
        return;
      }
    }

    // Fallback: rule-based command parsing
    const lower = text.toLowerCase().trim();
    const { rooms, toggleDevice, setDesignMode } = useHomeStore.getState();
    const { scenes, playScene } = useSceneStore.getState();
    const { toggleEnergy } = useUIStore.getState();

    const allDevices = rooms.flatMap(r => r.devices.map(d => ({ ...d, roomName: r.name, roomId: r.id })));

    // "turn on/off all lights"
    if (lower.includes('turn off all lights')) {
      allDevices.filter(d => d.type === 'light' && d.isOn).forEach(d => toggleDevice(d.id));
      showResult('✅ All lights turned off');
      emitToast('🎙️ All lights turned off');
      return;
    }
    if (lower.includes('turn on all lights')) {
      allDevices.filter(d => d.type === 'light' && !d.isOn).forEach(d => toggleDevice(d.id));
      showResult('✅ All lights turned on');
      emitToast('🎙️ All lights turned on');
      return;
    }
    if (lower.includes('turn on all fans')) {
      allDevices.filter(d => d.type === 'fan' && !d.isOn).forEach(d => toggleDevice(d.id));
      showResult('✅ All fans turned on');
      emitToast('🎙️ All fans turned on');
      return;
    }
    if (lower.includes('turn off all fans')) {
      allDevices.filter(d => d.type === 'fan' && d.isOn).forEach(d => toggleDevice(d.id));
      showResult('✅ All fans turned off');
      emitToast('🎙️ All fans turned off');
      return;
    }

    // "show energy"
    if (lower.includes('show energy') || lower.includes('energy monitor')) {
      toggleEnergy();
      showResult('✅ Energy Monitor opened');
      return;
    }

    // "open design"
    if (lower.includes('open design') || lower.includes('design mode')) {
      setDesignMode(true);
      showResult('✅ Design mode activated');
      return;
    }

    // "activate [scene name]"
    const activateMatch = lower.match(/^activate (.+)$/);
    if (activateMatch) {
      const sceneName = activateMatch[1];
      const scene = scenes.find(s => s.name.toLowerCase().includes(sceneName));
      if (scene) {
        playScene(scene.id);
        showResult(`✅ Scene "${scene.name}" activated`);
        emitToast(`🎙️ Scene "${scene.name}" activated`);
        return;
      }
    }

    // "set [room] temperature to [N]"
    const tempMatch = lower.match(/set (.+) temperature to (\d+)/);
    if (tempMatch) {
      const roomName = tempMatch[1];
      const temp = parseInt(tempMatch[2], 10);
      const room = rooms.find(r => r.name.toLowerCase().includes(roomName));
      if (room) {
        const ac = room.devices.find(d => d.type === 'ac');
        if (ac) {
          useHomeStore.getState().updateDevice(ac.id, { temperature: temp });
          showResult(`✅ ${room.name} AC → ${temp}°C`);
          emitToast(`🎙️ ${room.name} AC set to ${temp}°C`);
          return;
        }
      }
    }

    // "turn on/off [device or room name]"
    const turnMatch = lower.match(/^turn (on|off) (.+)$/);
    if (turnMatch) {
      const action = turnMatch[1]; // 'on' or 'off'
      const target = turnMatch[2];

      // Try device name match first
      const device = allDevices.find(d => d.name.toLowerCase().includes(target));
      if (device) {
        const shouldBeOn = action === 'on';
        if (device.isOn !== shouldBeOn) toggleDevice(device.id);
        showResult(`✅ ${device.name} turned ${action}`);
        emitToast(`🎙️ ${device.name} turned ${action}`);
        return;
      }

      // Try room name match — toggle all devices in that room
      const room = rooms.find(r => r.name.toLowerCase().includes(target));
      if (room) {
        const shouldBeOn = action === 'on';
        room.devices.filter(d => d.isOn !== shouldBeOn).forEach(d => toggleDevice(d.id));
        showResult(`✅ ${room.name} devices turned ${action}`);
        emitToast(`🎙️ ${room.name} all devices ${action}`);
        return;
      }
    }

    showResult(`❓ Not understood`);
    emitToast(`❓ Command not understood: "${text}"`);
  }, []);

  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported) {
      emitToast('🎙️ Microphone not available');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        processCommand(text);
        setIsListening(false);
        setTranscript('');
      }
    };

    recognition.onerror = () => {
      emitToast('🎙️ Microphone not available');
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
    setResultStatus('');
  }, [supported, processCommand]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setTranscript('');
  }, []);

  return { isListening, transcript, resultStatus, start, stop, supported };
}
