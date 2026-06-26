// DeviceControlPanel.tsx — Full device control UI panel
import { useState } from 'react';
import { X, Zap, Star, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHomeStore, computeDeviceWatts } from '../../store/useHomeStore';
import { calcMonthlyCost, relativeTime } from '../../utils/formatters';
import type { Device } from '../../types';
import { useActivityStore } from '../../store/useActivityStore';
import ActivitySparkline from './ActivitySparkline';

const DEVICE_COLORS: Record<string, string> = {
  light: '#FFD060', fan: '#9D6FFF', ac: '#00D4FF', tv: '#4488CC',
  geyser: '#FF5500', plug: '#00F5A0', exhaust: '#888899',
};
const DEVICE_ICONS: Record<string, string> = {
  light: '💡', fan: '🌀', ac: '❄️', tv: '📺', geyser: '🚿', plug: '🔌', exhaust: '💨',
};

interface Props { device: Device & { roomId: number; roomName: string }; onClose: () => void; }

function ActivitySection({ deviceId, color }: { deviceId: number; color: string }) {
  const getTotalOnMinutes = useActivityStore(s => s.getTotalOnMinutes);
  const getLastActiveTimestamp = useActivityStore(s => s.getLastActiveTimestamp);
  const totalMins = getTotalOnMinutes(deviceId);
  const lastTs = getLastActiveTimestamp(deviceId);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const lastActiveText = lastTs ? relativeTime(lastTs) : 'Never';

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>📊 Activity (24h)</div>
      <ActivitySparkline deviceId={deviceId} width={240} height={36} color={color} />
      <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>ON today: {hrs > 0 ? `${hrs}h ` : ''}{mins}m</span>
        <span>Last active: {lastActiveText}</span>
      </div>
    </div>
  );
}

export default function DeviceControlPanel({ device, onClose }: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const updateDevice = useHomeStore(s => s.updateDevice);
  const toggleDevice = useHomeStore(s => s.toggleDevice);
  // Get fresh device state
  const freshDevice = useHomeStore(s => s.getDeviceById(device.id)) ?? device;
  const watts = computeDeviceWatts(freshDevice);
  const totalPower = useHomeStore(s => s.getTotalPower());
  const pct = totalPower > 0 ? Math.round((watts / totalPower) * 100) : 0;

  const COLOR = DEVICE_COLORS[device.type] || 'var(--cyan)';

  return (
    <motion.div
      initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
      transition={{ type: 'spring', stiffness: 320, damping: 38 }}
      className="flex flex-col h-full w-full overflow-y-auto"
      style={{ background: 'var(--bg-1)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${COLOR}22` }}>
              {DEVICE_ICONS[device.type]}
            </div>
            <div>
              <div className="font-display font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{freshDevice.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{device.roomName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <button
              onClick={() => toggleDevice(device.id)}
              className="relative w-12 h-6 rounded-full transition-all shrink-0"
              style={{ background: freshDevice.isOn ? 'var(--green)' : 'var(--bg-3)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{ background: 'white', left: freshDevice.isOn ? '26px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              />
            </button>
            <button onClick={onClose} className="p-1 rounded-lg transition-all hover:opacity-60">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: freshDevice.isOn ? 'var(--green-dim)' : 'var(--bg-2)', color: freshDevice.isOn ? 'var(--green)' : 'var(--text-muted)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: freshDevice.isOn ? 'var(--green)' : 'var(--text-muted)' }} />
            {freshDevice.isOn ? 'ON' : 'OFF'}
            {freshDevice.lastToggled && ` · ${relativeTime(freshDevice.lastToggled)}`}
          </span>
          {freshDevice.isOn && watts > 0 && (
            <span className="text-xs" style={{ color: 'var(--amber)' }}>
              <Zap size={10} className="inline mr-0.5" />{Math.round(watts)}W
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        <div style={{ opacity: freshDevice.isOn ? 1 : 0.4, pointerEvents: freshDevice.isOn ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
          {/* LIGHT */}
          {device.type === 'light' && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Brightness</span><span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{freshDevice.brightness ?? 100}%</span>
                </div>
                <input type="range" min={1} max={100} value={freshDevice.brightness ?? 100}
                  onChange={e => updateDevice(device.id, { brightness: +e.target.value })} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Color Temp</span><span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{freshDevice.colorTemp ?? 4000}K</span>
                </div>
                <div className="w-full h-2 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, #FFD060, #FFE8A0, #FFFFFF, #CCE4FF)' }} />
                <input type="range" min={2700} max={6500} step={100} value={freshDevice.colorTemp ?? 4000}
                  onChange={e => updateDevice(device.id, { colorTemp: +e.target.value })} className="w-full" />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>2700K Warm</span><span>6500K Cool</span>
                </div>
              </div>
            </div>
          )}

          {/* FAN */}
          {device.type === 'fan' && (
            <div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Fan Speed</div>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => updateDevice(device.id, { speed: s })}
                    className="flex-1 py-2 rounded-lg text-sm font-display font-bold transition-all"
                    style={{ background: (freshDevice.speed ?? 3) === s ? 'var(--cyan)' : 'var(--bg-3)', color: (freshDevice.speed ?? 3) === s ? '#000' : 'var(--text-secondary)', border: '1px solid transparent' }}
                  >{s}</button>
                ))}
              </div>
              <div className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Speed {freshDevice.speed ?? 3} · ~{[25,40,55,70,85][(freshDevice.speed ?? 3) - 1]}W
              </div>
            </div>
          )}

          {/* AC */}
          {device.type === 'ac' && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Temperature</div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => updateDevice(device.id, { temperature: Math.max(16, (freshDevice.temperature ?? 24) - 1) })}
                    className="w-10 h-10 rounded-xl text-xl font-bold transition-all hover:opacity-70" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)' }}>−</button>
                  <div className="font-display font-bold text-4xl" style={{ color: 'var(--cyan)' }}>{freshDevice.temperature ?? 24}°C</div>
                  <button onClick={() => updateDevice(device.id, { temperature: Math.min(30, (freshDevice.temperature ?? 24) + 1) })}
                    className="w-10 h-10 rounded-xl text-xl font-bold transition-all hover:opacity-70" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)' }}>+</button>
                </div>
              </div>
              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Mode</div>
                <div className="grid grid-cols-5 gap-1">
                  {[{v:'cool',e:'❄️'},{v:'heat',e:'🌡️'},{v:'fan',e:'💨'},{v:'auto',e:'🔄'},{v:'dry',e:'💧'}].map(m => (
                    <button key={m.v} onClick={() => updateDevice(device.id, { mode: m.v as Device['mode'] })}
                      className="py-1.5 rounded-lg text-sm transition-all" style={{ background: (freshDevice.mode ?? 'cool') === m.v ? 'var(--cyan-glow)' : 'var(--bg-3)', border: (freshDevice.mode ?? 'cool') === m.v ? '1px solid var(--cyan)' : '1px solid transparent' }}
                    >{m.e}</button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                ≈₹{Math.round((1500 / 1000) * (freshDevice.temperature ?? 24) / 24 * 8 * 10)}/hour at current setting
              </div>
            </div>
          )}

          {/* TV */}
          {device.type === 'tv' && (
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>🔊 Volume</span><span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{freshDevice.volume ?? 50}</span>
              </div>
              <input type="range" min={0} max={100} value={freshDevice.volume ?? 50}
                onChange={e => updateDevice(device.id, { volume: +e.target.value })} className="w-full" />
            </div>
          )}

          {/* GEYSER */}
          {device.type === 'geyser' && (
            <div>
              <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Timer</div>
              <div className="flex gap-2 flex-wrap">
                {[15,30,45,60].map(t => (
                  <button key={t} onClick={() => updateDevice(device.id, { timer: t })}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: (freshDevice.timer ?? 30) === t ? 'var(--amber-dim)' : 'var(--bg-3)', color: (freshDevice.timer ?? 30) === t ? 'var(--amber)' : 'var(--text-muted)', border: (freshDevice.timer ?? 30) === t ? '1px solid var(--amber)' : '1px solid transparent' }}
                  >{t}min</button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 p-2 rounded-lg" style={{ background: 'var(--red-dim)' }}>
                <AlertTriangle size={12} style={{ color: 'var(--red)' }} />
                <span className="text-xs" style={{ color: 'var(--red)' }}>High power device — 2000W</span>
              </div>
            </div>
          )}
        </div>

        {/* Energy Card */}
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: 'var(--amber)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Energy</span>
          </div>
          <div className="font-display font-bold text-2xl mb-1" style={{ color: watts > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
            {Math.round(watts)} W
          </div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Daily: {((watts / 1000) * 24).toFixed(2)} kWh</span>
            <span>Monthly: ₹{Math.round(calcMonthlyCost(watts))}</span>
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--amber)' }} />
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{pct}% of home total</div>
        </div>

        {/* Schedule (collapsible) */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setScheduleOpen(!scheduleOpen)}
            className="flex items-center justify-between w-full p-3 text-sm"
            style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)' }}
          >
            <span>⏰ Schedule</span>
            {scheduleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {scheduleOpen && (
            <div className="p-3" style={{ background: 'var(--bg-1)' }}>
              {freshDevice.schedule?.isEnabled ? (
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  On at {freshDevice.schedule.onTime}, Off at {freshDevice.schedule.offTime}
                </div>
              ) : (
                <div className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No schedule set</div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>On Time</label>
                  <input type="time"
                    value={freshDevice.schedule?.onTime ?? '06:00'}
                    onChange={e => updateDevice(device.id, { schedule: { ...(freshDevice.schedule ?? { offTime: '22:00', days: [0,1,2,3,4,5,6], isEnabled: true }), onTime: e.target.value } })}
                    className="w-full px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Off Time</label>
                  <input type="time"
                    value={freshDevice.schedule?.offTime ?? '22:00'}
                    onChange={e => updateDevice(device.id, { schedule: { ...(freshDevice.schedule ?? { onTime: '06:00', days: [0,1,2,3,4,5,6], isEnabled: true }), offTime: e.target.value } })}
                    className="w-full px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
              <button
                onClick={() => updateDevice(device.id, { schedule: { onTime: freshDevice.schedule?.onTime ?? '06:00', offTime: freshDevice.schedule?.offTime ?? '22:00', days: [0,1,2,3,4,5,6], isEnabled: !(freshDevice.schedule?.isEnabled) } })}
                className="w-full mt-2 py-1.5 rounded-lg text-xs transition-all"
                style={{ background: freshDevice.schedule?.isEnabled ? 'var(--red-dim)' : 'var(--cyan-glow)', color: freshDevice.schedule?.isEnabled ? 'var(--red)' : 'var(--cyan)', border: freshDevice.schedule?.isEnabled ? '1px solid var(--red)' : '1px solid var(--cyan-border)' }}
              >
                {freshDevice.schedule?.isEnabled ? 'Disable Schedule' : 'Enable Schedule'}
              </button>
            </div>
          )}
        </div>

        {/* Activity (24h) */}
        <ActivitySection deviceId={device.id} color={COLOR} />

        {/* Favorite */}
        <button
          onClick={() => updateDevice(device.id, { isFavorite: !freshDevice.isFavorite })}
          className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ background: freshDevice.isFavorite ? 'rgba(255,184,0,0.1)' : 'var(--bg-2)', color: freshDevice.isFavorite ? 'var(--amber)' : 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <Star size={14} fill={freshDevice.isFavorite ? 'var(--amber)' : 'none'} />
          {freshDevice.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>
      </div>
    </motion.div>
  );
}
