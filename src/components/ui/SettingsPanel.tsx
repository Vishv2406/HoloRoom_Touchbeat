// SettingsPanel.tsx — Settings modal
import { useState } from 'react';
import { X, Edit2, Check, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHomeStore } from '../../store/useHomeStore';
import BrokerConfigPanel from './BrokerConfigPanel';
import { useUIStore } from '../../store/useUIStore';

const ACCENT_COLORS = ['#00D4FF', '#00F5A0', '#9D6FFF', '#FFB800', '#FF4D6D', '#FF69B4'];

function SimulatorToggle() {
  const simulatorEnabled = useUIStore(s => s.simulatorEnabled);
  const toggleSimulator = useUIStore(s => s.toggleSimulator);
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>📡 Live Device Simulation</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Randomly updates device states every 8–12 seconds
        </div>
      </div>
      <button
        onClick={toggleSimulator}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: simulatorEnabled ? '#00C850' : 'var(--bg-3)',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: simulatorEnabled ? 22 : 2,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}

export default function SettingsPanel() {
  const isOpen = useUIStore(s => s.isSettingsOpen);
  const toggleSettings = useUIStore(s => s.toggleSettings);
  const rooms = useHomeStore(s => s.rooms);
  const homeName = useHomeStore(s => s.homeName);
  const setHomeName = useHomeStore(s => s.setHomeName);
  const electricityRate = useHomeStore(s => s.electricityRate);
  const setElectricityRate = useHomeStore(s => s.setElectricityRate);
  const renameDevice = useHomeStore(s => s.renameDevice);
  const toggleDevice = useHomeStore(s => s.toggleDevice);
  const resetToDefault = useHomeStore(s => s.resetToDefault);



  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [confirmReset, setConfirmReset] = useState<'devices' | 'all' | null>(null);
  const [accentColor, setAccentColor] = useState('#00D4FF');

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    document.documentElement.style.setProperty('--cyan', color);
  };

  const handleResetDevices = () => {
    rooms.forEach(room => room.devices.forEach(d => { if (d.isOn) toggleDevice(d.id); }));
    setConfirmReset(null);
  };

  const handleResetAll = () => {
    resetToDefault();
    setConfirmReset(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) toggleSettings(); }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ maxWidth: 600, maxHeight: '85vh', background: 'var(--bg-1)', border: '1px solid var(--border-bright)' }}
      >
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>⚙️ Settings</div>
          <button onClick={toggleSettings} className="p-2 rounded-lg hover:opacity-60"><X size={18} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Home */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Home</div>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Home Name</span>
                <input type="text" value={homeName} onChange={e => setHomeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Location</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Mumbai, India 🇮🇳</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Electricity Rate</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>₹</span>
                  <input type="number" min={1} max={20} step={0.5} value={electricityRate}
                    onChange={e => setElectricityRate(+e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg text-sm text-center" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/kWh</span>
                </div>
              </div>
            </div>
          </section>

          {/* MQTT Broker Connection */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>📡 MQTT Broker Connection</div>
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <BrokerConfigPanel />
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Appearance</div>
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Accent Color</div>
              <div className="flex gap-2">
                {ACCENT_COLORS.map(c => (
                  <button key={c} onClick={() => handleAccentChange(c)}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{ background: c, boxShadow: accentColor === c ? `0 0 12px ${c}` : 'none', transform: accentColor === c ? 'scale(1.2)' : 'scale(1)' }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Devices */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Devices</div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {rooms.map(room => (
                <div key={room.id}>
                  <div className="px-4 py-2 text-xs font-bold" style={{ background: 'var(--bg-2)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                    {room.icon} {room.name}
                  </div>
                  {room.devices.map(device => (
                    <div key={device.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                      <span className="text-base">{device.type === 'light' ? '💡' : device.type === 'fan' ? '🌀' : device.type === 'ac' ? '❄️' : device.type === 'tv' ? '📺' : device.type === 'geyser' ? '🚿' : device.type === 'exhaust' ? '💨' : '🔌'}</span>
                      {editingDeviceId === device.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input autoFocus type="text" value={deviceNameInput} onChange={e => setDeviceNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { renameDevice(device.id, deviceNameInput); setEditingDeviceId(null); } }}
                            className="flex-1 px-2 py-1 rounded text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--cyan)' }} />
                          <button onClick={() => { renameDevice(device.id, deviceNameInput); setEditingDeviceId(null); }}>
                            <Check size={14} style={{ color: 'var(--cyan)' }} />
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{device.name}</span>
                      )}
                      <button onClick={() => { setEditingDeviceId(device.id); setDeviceNameInput(device.name); }} className="p-1 hover:opacity-60">
                        <Edit2 size={12} style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
  <div
    className="text-xs font-bold uppercase tracking-widest mb-3"
    style={{ color: 'var(--text-muted)' }}
  >
    About TouchBeat
  </div>

  <div
    className="rounded-xl p-4 text-center"
    style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
    }}
  >
    <div className="w-full flex justify-center mb-0">
      <img
        src="/image3.png"
        alt="TouchBeat – Discover Thing of Tomorrow"
        className="h-[70px] w-auto object-contain"
      />
    </div>

    <div
      className="font-display font-bold text-lg leading-none mb-1"
      style={{ color: 'var(--cyan)' }}
    >
      HOLOROOM 3D
    </div>

    <div
      className="text-sm mb-1"
      style={{ color: 'var(--text-secondary)' }}
    >
      Smart Home Digital Twin
    </div>

    <div
      className="text-xs mb-3"
      style={{ color: 'var(--text-muted)' }}
    >
      Version 3.0 · {rooms.length} rooms ·{' '}
      {rooms.reduce((s, r) => s + r.devices.length, 0)} devices
    </div>

    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
      TouchBeat Automation · touchbeat.in
    </div>

    <div
      className="text-xs mt-1"
      style={{ color: 'var(--text-muted)' }}
    >
      Powering Smart Homes Across India 🇮🇳
    </div>
  </div>
</section>

          {/* Danger zone */}
          <section>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--red)' }}>Danger Zone</div>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,77,109,0.2)' }}>
              {confirmReset ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--red)' }}>
                    <AlertTriangle size={16} />
                    {confirmReset === 'devices' ? 'Turn off all devices?' : 'Reset everything to factory defaults?'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmReset(null)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>Cancel</button>
                    <button onClick={confirmReset === 'devices' ? handleResetDevices : handleResetAll}
                      className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--red)', color: 'white' }}>
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={() => setConfirmReset('devices')} className="w-full py-2.5 rounded-lg text-sm font-medium text-left px-4 transition-all hover:opacity-80" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.2)' }}>
                    Reset All Devices to OFF
                  </button>
                  <button onClick={() => setConfirmReset('all')} className="w-full py-2.5 rounded-lg text-sm font-medium text-left px-4 transition-all hover:opacity-80" style={{ background: 'rgba(255,77,109,0.2)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.3)' }}>
                    Reset to Factory Defaults
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
