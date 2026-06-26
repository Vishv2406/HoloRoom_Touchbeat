// CreateSceneModal.tsx — Custom scene creator modal
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSceneStore } from '../../store/useSceneStore';
import { useUIStore } from '../../store/useUIStore';
import { useHomeStore } from '../../store/useHomeStore';
import type { SceneStep } from '../../types';

const SCENE_EMOJIS = ['🌅','🎬','😴','🔒','🌆','🌙','🏠','🎉','❄️','☀️','🌿','🔆','🎵','🍳','🛁','💻'];
const SCENE_COLORS = ['#FF9500','#9B59B6','#2C3E50','#E74C3C','#E67E22','#00D4FF','#00F5A0','#FFB800'];

let sceneIdCounter = 200;

export default function CreateSceneModal() {
  const isOpen = useUIStore(s => s.isCreateSceneOpen);
  const toggleCreateScene = useUIStore(s => s.toggleCreateScene);
  const addCustomScene = useSceneStore(s => s.addCustomScene);
  const rooms = useHomeStore(s => s.rooms);
  const allDevices = rooms.flatMap(r => r.devices.map(d => ({ ...d, roomName: r.name })));

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏠');
  const [color, setColor] = useState('#00D4FF');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<SceneStep[]>([{ deviceId: allDevices[0]?.id ?? 1, action: 'on', delay: 0 }]);

  const addStep = () => setSteps(s => [...s, { deviceId: allDevices[0]?.id ?? 1, action: 'on', delay: 500 }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, j) => j !== i));
  const updateStep = (i: number, updates: Partial<SceneStep>) => setSteps(s => s.map((st, j) => j === i ? { ...st, ...updates } : st));

  const handleSave = () => {
    if (!name.trim()) return;
    sceneIdCounter++;
    addCustomScene({ id: sceneIdCounter, name, emoji, color, description, steps, isCustom: true });
    toggleCreateScene();
    setName(''); setEmoji('🏠'); setDescription(''); setSteps([{ deviceId: allDevices[0]?.id ?? 1, action: 'on', delay: 0 }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleCreateScene(); }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 560, maxHeight: '85vh', background: 'var(--bg-1)', border: '1px solid var(--border-bright)' }}
      >
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>✨ Create Custom Scene</div>
          <button onClick={toggleCreateScene} className="p-2 hover:opacity-60"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Name + emoji */}
          <div className="flex gap-3">
            <div className="text-3xl flex items-center justify-center w-14 h-14 rounded-xl cursor-pointer hover:opacity-80" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>{emoji}</div>
            <div className="flex-1">
              <input type="text" placeholder="Scene name..." value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm mb-2" style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              <input type="text" placeholder="Short description..." value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Choose emoji</div>
            <div className="flex flex-wrap gap-2">
              {SCENE_EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} className="text-2xl transition-transform hover:scale-125"
                  style={{ opacity: emoji === e ? 1 : 0.5, transform: emoji === e ? 'scale(1.2)' : 'scale(1)' }}>{e}</button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Scene color</div>
            <div className="flex gap-2">
              {SCENE_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, boxShadow: color === c ? `0 0 10px ${c}` : 'none', transform: color === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Steps</div>
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <select value={step.deviceId} onChange={e => updateStep(i, { deviceId: +e.target.value })}
                  className="flex-1 px-2 py-1.5 rounded text-xs" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  {allDevices.map(d => <option key={d.id} value={d.id}>{d.roomName} — {d.name}</option>)}
                </select>
                <select value={step.action} onChange={e => updateStep(i, { action: e.target.value as 'on' | 'off' })}
                  className="px-2 py-1.5 rounded text-xs w-16" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
                <input type="number" placeholder="ms" value={step.delay} onChange={e => updateStep(i, { delay: +e.target.value })}
                  className="w-16 px-2 py-1.5 rounded text-xs text-center" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                <button onClick={() => removeStep(i)} className="hover:opacity-60 shrink-0"><Trash2 size={12} style={{ color: 'var(--red)' }} /></button>
              </div>
            ))}
            <button onClick={addStep} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Plus size={12} />Add Step
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={toggleCreateScene} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: name.trim() ? 'var(--cyan)' : 'var(--bg-3)', color: name.trim() ? '#000' : 'var(--text-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            Save Scene
          </button>
        </div>
      </motion.div>
    </div>
  );
}
