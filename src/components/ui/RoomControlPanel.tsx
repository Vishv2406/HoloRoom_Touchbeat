// RoomControlPanel.tsx — Room-level controls panel
import { X, Thermometer, Droplets, Zap, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHomeStore, computeDeviceWatts } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import { calcMonthlyCost } from '../../utils/formatters';
import type { Room } from '../../types';

const DEVICE_ICONS: Record<string, string> = {
  light: '💡', fan: '🌀', ac: '❄️', tv: '📺', geyser: '🚿', plug: '🔌', exhaust: '💨',
};

interface Props { room: Room; onClose: () => void; }

export default function RoomControlPanel({ room, onClose }: Props) {
  const toggleDevice = useHomeStore(s => s.toggleDevice);
  const selectDevice = useHomeStore(s => s.selectDevice);
  const openPanel = useUIStore(s => s.openPanel);
  const totalPower = useHomeStore(s => s.getTotalPower());
  // Get fresh room
  const freshRoom = useHomeStore(s => s.rooms.find(r => r.id === room.id)) ?? room;

  const roomPower = freshRoom.devices.reduce((s, d) => s + computeDeviceWatts(d), 0);
  const pct = totalPower > 0 ? Math.round((roomPower / totalPower) * 100) : 0;

  const turnAllOff = () => {
    freshRoom.devices.forEach(d => { if (d.isOn) toggleDevice(d.id); });
  };

  const handleDeviceClick = (device: typeof freshRoom.devices[0]) => {
    selectDevice(device, room.id, room.name);
    openPanel('device');
  };

  return (
    <motion.div
      initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
      transition={{ type: 'spring', stiffness: 320, damping: 38 }}
      className="flex flex-col h-full w-full overflow-y-auto"
      style={{ background: 'var(--bg-1)', borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{freshRoom.icon}</span>
            <div>
              <div className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>{freshRoom.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{freshRoom.devices.length} devices</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={turnAllOff}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
              style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.2)' }}
            >
              <Power size={11} />All Off
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:opacity-60">
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
        {/* Env stats */}
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)' }}>
            <Thermometer size={11} />{freshRoom.temperature}°C
          </span>
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)' }}>
            <Droplets size={11} />{freshRoom.humidity}%
          </span>
        </div>
      </div>

      {/* Device list */}
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        {freshRoom.devices.map(device => {
          const dWatts = computeDeviceWatts(device);
          return (
            <div
              key={device.id}
              className="flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{ background: 'var(--bg-2)', border: `1px solid ${device.isOn ? 'var(--border-bright)' : 'var(--border)'}` }}
            >
              <span className="text-lg shrink-0">{DEVICE_ICONS[device.type]}</span>
              <button
                onClick={() => handleDeviceClick(device)}
                className="flex-1 text-left"
              >
                <div className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{device.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {device.type === 'light' && device.isOn && `Brightness ${device.brightness ?? 100}%`}
                  {device.type === 'fan' && device.isOn && `Speed ${device.speed ?? 3}`}
                  {device.type === 'ac' && device.isOn && `${device.temperature ?? 24}°C ${device.mode ?? 'cool'}`}
                  {device.type === 'tv' && device.isOn && `Volume ${device.volume ?? 50}`}
                  {!device.isOn && 'Off'}
                  {device.isOn && dWatts > 0 && ` · ${Math.round(dWatts)}W`}
                </div>
              </button>
              <button
                onClick={() => toggleDevice(device.id)}
                className="relative w-10 h-5 rounded-full transition-all shrink-0"
                style={{ background: device.isOn ? 'var(--cyan)' : 'var(--bg-3)' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: 'white', left: device.isOn ? '22px' : '2px' }}
                />
              </button>
            </div>
          );
        })}

        {/* Room energy card */}
        <div className="rounded-xl p-3 mt-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} style={{ color: 'var(--amber)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Room Energy</span>
          </div>
          <div className="font-display font-bold text-xl mb-1" style={{ color: 'var(--amber)' }}>{Math.round(roomPower)} W</div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>{pct}% of home</span>
            <span>₹{Math.round(calcMonthlyCost(roomPower))}/mo</span>
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--amber)' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
