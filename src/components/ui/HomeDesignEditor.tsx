// HomeDesignEditor.tsx — Full-screen 3D home design editor with device positioning & garden
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, RotateCcw, Move, RotateCw, TreePine, Lightbulb } from 'lucide-react';

import { useHomeStore } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import SceneCanvas from '../3d/SceneCanvas';
import type { Device, Room } from '../../types';
import type { GardenConfig } from '../3d/SceneCanvas';
import { getRoomBounds, getAdjacentRoom } from '../../utils/roomAdjacency';
import type { WallSide } from '../../utils/roomAdjacency';

const ROOM_ICONS = ['🛏️', '🛋️', '🍳', '🚿', '📚', '🏠', '🌿', '🏋️', '🎮', '🎵'];
const FLOOR_COLORS = ['#1E2340', '#1A2E20', '#14142A', '#2A1400', '#0A2A30', '#2A2A1A', '#1A1A3A', '#201414'];
const LIGHT_FLOOR_COLORS = ['#F2EDE4', '#C4956A', '#E8E8E0', '#F0F0F0', '#EDE8E0', '#D9CFC4', '#E8DFD0', '#F5F0E8'];

const DEVICE_DEFAULTS: Record<string, Partial<Device> & { type: Device['type'] }> = {
  light: { type: 'light', isOn: false, brightness: 100, colorTemp: 4000, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
  fan: { type: 'fan', isOn: false, speed: 3, energyWatts: 55, position: { x: 0, y: 2.6, z: 0.5 } },
  ac: { type: 'ac', isOn: false, temperature: 24, mode: 'cool', energyWatts: 1500, position: { x: -2, y: 2.0, z: 0 } },
  tv: { type: 'tv', isOn: false, volume: 50, energyWatts: 120, position: { x: 0, y: 1.2, z: -2 } },
  plug: { type: 'plug', isOn: false, energyWatts: 0, position: { x: 2, y: 0.4, z: -2 } },
  geyser: { type: 'geyser', isOn: false, timer: 30, energyWatts: 2000, position: { x: -1, y: 2.0, z: -2 } },
  exhaust: { type: 'exhaust', isOn: false, energyWatts: 30, position: { x: 2, y: 2.4, z: -2 } },
};

const DEVICE_ICONS: Record<string, string> = {
  light: '💡', fan: '🌀', ac: '❄️', tv: '📺', geyser: '🚿', exhaust: '💨', plug: '🔌',
};

let deviceIdCounter = 1000;
let roomIdCounter = 100;

const STEP = 0.25;

export default function HomeDesignEditor() {
  const rooms = useHomeStore(s => s.rooms);
  const selectedRoom = useHomeStore(s => s.selectedRoom);
  const selectRoom = useHomeStore(s => s.selectRoom);
  const setDesignMode = useHomeStore(s => s.setDesignMode);
  const updateRoomConfig = useHomeStore(s => s.updateRoomConfig);
  const deleteRoom = useHomeStore(s => s.deleteRoom);
  const addRoom = useHomeStore(s => s.addRoom);
  const addDeviceToRoom = useHomeStore(s => s.addDeviceToRoom);
  const removeDeviceFromRoom = useHomeStore(s => s.removeDeviceFromRoom);
  const renameDevice = useHomeStore(s => s.renameDevice);
  const updateDevice = useHomeStore(s => s.updateDevice);
  const saveLayoutToStorage = useHomeStore(s => s.saveLayoutToStorage);
  const resetToDefault = useHomeStore(s => s.resetToDefault);
  const isDarkMode = useUIStore(s => s.isDarkMode);
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode);

  const [tab, setTab] = useState<'rooms' | 'devices' | 'garden'>('rooms');
  const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<number | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [selectedEditDevice, setSelectedEditDevice] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [garden, setGarden] = useState<GardenConfig>(() => {
    try {
      const saved = localStorage.getItem('holoroom_garden');
      if (saved) return JSON.parse(saved) as GardenConfig;
    } catch {}
    return { enabled: true, north: 5, south: 5, east: 4, west: 4 };
  });

  // Feature 8: Persist garden config on every change
  useEffect(() => {
    localStorage.setItem('holoroom_garden', JSON.stringify(garden));
  }, [garden]);

  const selectedRoomData = selectedRoom ? rooms.find(r => r.id === selectedRoom.id) : null;
  const editDevice = selectedRoomData?.devices.find(d => d.id === selectedEditDevice) ?? null;

  const handleRoomClick = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) selectRoom(room);
  };

  const addNewRoom = () => {
    if (!newRoomName.trim()) return;
    roomIdCounter++;
    const newW = 5, newD = 5;
    const SIDES: WallSide[] = ['east', 'south', 'west', 'north'];
    const GAP = 0.1;

    let newX = 0, newZ = 0;

    if (rooms.length === 0) {
      newX = 0; newZ = 0;
    } else {
      // Sort rooms by device count descending — primary room first
      const sorted = [...rooms].sort((a, b) => b.devices.length - a.devices.length);
      let placed = false;

      for (const room of sorted) {
        const bounds = getRoomBounds(room);
        for (const side of SIDES) {
          const adj = getAdjacentRoom(bounds, side, rooms);
          if (adj !== null) continue; // side occupied

          // Place new room adjacent to this free edge
          if (side === 'east') {
            newX = bounds.east + GAP + newW / 2;
            newZ = room.position.z;
          } else if (side === 'west') {
            newX = bounds.west - GAP - newW / 2;
            newZ = room.position.z;
          } else if (side === 'south') {
            newX = room.position.x;
            newZ = bounds.south + GAP + newD / 2;
          } else {
            newX = room.position.x;
            newZ = bounds.north - GAP - newD / 2;
          }
          placed = true;
          break;
        }
        if (placed) break;
      }

      if (!placed) {
        // Fallback: place to the right of all rooms
        const maxX = Math.max(...rooms.map(r => getRoomBounds(r).east));
        newX = maxX + GAP + newW / 2;
        newZ = 0;
      }
    }

    addRoom({
      id: roomIdCounter,
      name: newRoomName,
      icon: '🏠',
      position: { x: newX, z: newZ },
      size: { width: newW, depth: newD },
      floorColor: '#EDE8E0',
      wallColor: '#D4C5B0',
      temperature: 28,
      humidity: 55,
      devices: [],
    });

    setNewRoomName('');
    setTab('rooms');
    // Select the new room
    const newRoom = useHomeStore.getState().rooms.find(r => r.id === roomIdCounter);
    if (newRoom) selectRoom(newRoom);
  };

  const addDevice = (deviceType: string) => {
    if (!selectedRoom) return;
    deviceIdCounter++;
    const def = DEVICE_DEFAULTS[deviceType];
    addDeviceToRoom(selectedRoom.id, {
      id: deviceIdCounter,
      name: `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} ${deviceIdCounter}`,
      ...def,
    } as Device);
  };

  const moveDevicePos = (deviceId: number, axis: 'x' | 'y' | 'z', delta: number) => {
    const device = editDevice ?? selectedRoomData?.devices.find(d => d.id === deviceId);
    if (!device) return;
    updateDevice(deviceId, {
      position: {
        ...device.position,
        [axis]: Math.round((device.position[axis] + delta) * 100) / 100,
      },
    });
  };

  const rotateDevice = (deviceId: number, delta: number) => {
    const device = editDevice ?? selectedRoomData?.devices.find(d => d.id === deviceId);
    if (!device) return;
    const current = device.rotation?.y ?? 0;
    updateDevice(deviceId, { rotation: { y: Math.round((current + delta) * 100) / 100 } });
  };

  const upd = (key: keyof GardenConfig, val: number | boolean) =>
    setGarden(g => ({ ...g, [key]: val }));

  const allFloorColors = isDarkMode ? FLOOR_COLORS : [...LIGHT_FLOOR_COLORS, ...FLOOR_COLORS];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--bg-0)' }}>
      {/* Editor Top Bar */}
      <div className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 56, background: 'rgba(5,5,8,0.95)', borderBottom: '1px solid var(--border-bright)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { setDesignMode(false); selectRoom(null); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <X size={14} />Exit Editor
          </button>
          <div className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>🏗️ Home Design Editor</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: isDarkMode ? 'rgba(30,40,80,0.9)' : 'rgba(240,240,250,0.15)', color: isDarkMode ? '#7090FF' : '#CBD8E8', border: '1px solid var(--border-bright)' }}>
            {isDarkMode ? '☀️ Light 3D' : '🌙 Dark 3D'}
          </button>
          <button onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.2)' }}>
            <RotateCcw size={13} />Reset
          </button>
          <button onClick={() => saveLayoutToStorage()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--cyan)', color: '#000' }}>
            <Save size={13} />Save Layout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="flex flex-col shrink-0" style={{ width: 290, background: 'rgba(5,5,8,0.97)', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Tabs */}
          <div className="flex mx-3 mt-3 mb-2 p-0.5 rounded-lg shrink-0" style={{ background: 'var(--bg-2)' }}>
            {(['rooms', 'devices', 'garden'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all capitalize"
                style={{ background: tab === t ? 'var(--bg-3)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {t === 'garden' ? '🌿 Garden' : t === 'devices' ? '💡 Devices' : '🏠 Rooms'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {/* ── ROOMS TAB ─────────────────────────────────────────── */}
            {tab === 'rooms' && (
              <div className="flex flex-col gap-2">
                {rooms.map(room => (
                  <div key={room.id} className="rounded-xl p-3 cursor-pointer transition-all"
                    style={{ background: selectedRoom?.id === room.id ? 'rgba(0,212,255,0.08)' : 'var(--bg-2)', border: selectedRoom?.id === room.id ? '1px solid var(--cyan-border)' : '1px solid var(--border)' }}
                    onClick={() => { selectRoom(room); }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setShowIconPicker(showIconPicker === room.id ? null : room.id); }}
                          className="text-xl hover:scale-110 transition-transform">{room.icon}</button>
                        <input type="text" value={room.name} onClick={e => e.stopPropagation()}
                          onChange={e => updateRoomConfig(room.id, { name: e.target.value })}
                          className="text-sm font-medium bg-transparent outline-none"
                          style={{ color: 'var(--text-primary)', width: 110 }} />
                      </div>
                      {confirmDeleteRoom === room.id ? (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteRoom(null); }} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--bg-3)', color: 'var(--text-muted)' }}>No</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); setConfirmDeleteRoom(null); }} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--red)', color: 'white' }}>Yes</button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteRoom(room.id); }} className="p-1 hover:opacity-70">
                          <Trash2 size={12} style={{ color: 'var(--red)' }} />
                        </button>
                      )}
                    </div>

                    {showIconPicker === room.id && (
                      <div className="flex flex-wrap gap-1 mb-2 p-2 rounded-lg" style={{ background: 'var(--bg-3)' }} onClick={e => e.stopPropagation()}>
                        {ROOM_ICONS.map(icon => (
                          <button key={icon} onClick={() => { updateRoomConfig(room.id, { icon }); setShowIconPicker(null); }} className="text-lg hover:scale-125 transition-transform">{icon}</button>
                        ))}
                      </div>
                    )}

                    {selectedRoom?.id === room.id && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Floor Color</div>
                          <div className="flex gap-1.5 flex-wrap">
                            {allFloorColors.map(c => (
                              <button key={c} onClick={e => { e.stopPropagation(); updateRoomConfig(room.id, { floorColor: c }); }}
                                className="w-6 h-6 rounded transition-all"
                                style={{ background: c, boxShadow: room.floorColor === c ? `0 0 8px ${c}` : 'none', transform: room.floorColor === c ? 'scale(1.2)' : 'scale(1)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            ))}
                            <input type="color" value={room.floorColor} onClick={e => e.stopPropagation()}
                              onChange={e => updateRoomConfig(room.id, { floorColor: e.target.value })}
                              className="w-6 h-6 rounded cursor-pointer" />
                          </div>
                        </div>
                        <SliderRow label="Width" value={room.size.width} min={4} max={18} unit="u"
                          onChange={v => updateRoomConfig(room.id, { size: { ...room.size, width: v } })} />
                        <SliderRow label="Depth" value={room.size.depth} min={4} max={12} unit="u"
                          onChange={v => updateRoomConfig(room.id, { size: { ...room.size, depth: v } })} />
                        {/* Feature 3: Drag hint replaces arrow buttons */}
                        <div className="text-[10px] px-1 py-1.5 rounded-lg text-center" style={{ background: 'rgba(0,212,255,0.06)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)' }}>
                          💡 Drag rooms directly in the 3D view to reposition
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-bright)' }}>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Add Room</div>
                  <input type="text" placeholder="Room name..." value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNewRoom()}
                    className="w-full px-2.5 py-1.5 rounded-lg text-sm mb-2"
                    style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                  <button onClick={addNewRoom} className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                    style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)' }}>
                    <Plus size={12} />Add Room
                  </button>
                </div>
              </div>
            )}

            {/* ── DEVICES TAB ────────────────────────────────────────── */}
            {tab === 'devices' && (
              <div className="flex flex-col gap-3">
                {!selectedRoomData ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div className="text-3xl mb-2">🏠</div>
                    Select a room first (in Rooms tab) to manage devices
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-medium px-1" style={{ color: 'var(--text-secondary)' }}>
                      {selectedRoomData.icon} {selectedRoomData.name} — {selectedRoomData.devices.length} devices
                    </div>

                    {selectedRoomData.devices.map(device => (
                      <div key={device.id} className="rounded-xl overflow-hidden"
                        style={{ background: 'var(--bg-2)', border: selectedEditDevice === device.id ? '1px solid var(--cyan-border)' : '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 p-2.5">
                          <span className="text-lg">{DEVICE_ICONS[device.type] ?? '🔌'}</span>
                          {editingDeviceId === device.id ? (
                            <input autoFocus type="text" value={deviceNameInput}
                              onChange={e => setDeviceNameInput(e.target.value)}
                              onBlur={() => { renameDevice(device.id, deviceNameInput); setEditingDeviceId(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { renameDevice(device.id, deviceNameInput); setEditingDeviceId(null); } }}
                              className="flex-1 px-2 py-1 rounded text-xs"
                              style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--cyan)' }} />
                          ) : (
                            <button className="flex-1 text-left text-xs" style={{ color: 'var(--text-primary)' }}
                              onClick={() => { setEditingDeviceId(device.id); setDeviceNameInput(device.name); }}>
                              {device.name}
                            </button>
                          )}
                          <button onClick={() => setSelectedEditDevice(selectedEditDevice === device.id ? null : device.id)}
                            className="p-1 rounded transition-all hover:opacity-80"
                            style={{ background: selectedEditDevice === device.id ? 'var(--cyan-glow)' : 'var(--bg-3)', color: selectedEditDevice === device.id ? 'var(--cyan)' : 'var(--text-muted)' }}
                            title="Edit position & rotation">
                            <Move size={12} />
                          </button>
                          <button onClick={() => removeDeviceFromRoom(selectedRoomData.id, device.id)} className="hover:opacity-60 p-1">
                            <X size={13} style={{ color: 'var(--red)' }} />
                          </button>
                        </div>

                        {/* Position & Rotation Controls */}
                        {selectedEditDevice === device.id && (
                          <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="text-[10px] pt-2 font-semibold" style={{ color: 'var(--text-muted)' }}>POSITION & ROTATION</div>

                            {/* X position */}
                            <AxisControl label="X (left/right)"
                              value={device.position.x}
                              onMinus={() => moveDevicePos(device.id, 'x', -STEP)}
                              onPlus={() => moveDevicePos(device.id, 'x', STEP)}
                              onInput={v => updateDevice(device.id, { position: { ...device.position, x: v } })} />
                            {/* Y position */}
                            <AxisControl label="Y (up/down)"
                              value={device.position.y}
                              onMinus={() => moveDevicePos(device.id, 'y', -STEP)}
                              onPlus={() => moveDevicePos(device.id, 'y', STEP)}
                              onInput={v => updateDevice(device.id, { position: { ...device.position, y: v } })} />
                            {/* Z position */}
                            <AxisControl label="Z (forward/back)"
                              value={device.position.z}
                              onMinus={() => moveDevicePos(device.id, 'z', -STEP)}
                              onPlus={() => moveDevicePos(device.id, 'z', STEP)}
                              onInput={v => updateDevice(device.id, { position: { ...device.position, z: v } })} />

                            {/* Rotation */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Rotate Y</span>
                              <div className="flex gap-1 items-center">
                                <button onClick={() => rotateDevice(device.id, -Math.PI / 8)} className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>↺ 22.5°</button>
                                <button onClick={() => rotateDevice(device.id, -Math.PI / 2)} className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>↺ 90°</button>
                                <button onClick={() => rotateDevice(device.id, Math.PI / 2)} className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>↻ 90°</button>
                                <button onClick={() => rotateDevice(device.id, Math.PI / 8)} className="px-2 py-1 rounded text-[10px] hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>↻ 22.5°</button>
                              </div>
                            </div>
                            <div className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
                              pos ({device.position.x.toFixed(2)}, {device.position.y.toFixed(2)}, {device.position.z.toFixed(2)}) · rot {((device.rotation?.y ?? 0) * 180 / Math.PI).toFixed(0)}°
                            </div>
                            <button onClick={() => updateDevice(device.id, { position: (DEVICE_DEFAULTS[device.type]?.position ?? { x: 0, y: 1, z: 0 }) as Device['position'], rotation: { y: 0 } })}
                              className="text-[10px] py-1 rounded hover:opacity-80"
                              style={{ background: 'var(--bg-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              Reset Position
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Device */}
                    <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-bright)' }}>
                      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Add Device to {selectedRoomData.name}</div>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.keys(DEVICE_DEFAULTS).map(type => (
                          <button key={type} onClick={() => addDevice(type)}
                            className="flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all hover:opacity-80"
                            style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>
                            <span>{DEVICE_ICONS[type] ?? '🔌'}</span>
                            <span className="capitalize text-[9px]">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── GARDEN TAB ─────────────────────────────────────────── */}
            {tab === 'garden' && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🌿 Garden Settings</div>
                    <button
                      onClick={() => upd('enabled', !garden.enabled)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{ background: garden.enabled ? 'rgba(76,175,80,0.15)' : 'var(--bg-3)', color: garden.enabled ? '#4CAF50' : 'var(--text-muted)', border: `1px solid ${garden.enabled ? 'rgba(76,175,80,0.3)' : 'var(--border)'}` }}>
                      {garden.enabled ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Adjust garden size on each side of the house. Trees, flowers, benches, and paths are placed automatically.
                  </p>

                  <div className="flex flex-col gap-2" style={{ opacity: garden.enabled ? 1 : 0.4, pointerEvents: garden.enabled ? 'auto' : 'none' }}>
                    <SliderRow label="🌿 North depth" value={garden.north} min={0} max={12} unit="u"
                      onChange={v => upd('north', v)} />
                    <SliderRow label="🌿 South depth" value={garden.south} min={0} max={12} unit="u"
                      onChange={v => upd('south', v)} />
                    <SliderRow label="🌿 East depth" value={garden.east} min={0} max={12} unit="u"
                      onChange={v => upd('east', v)} />
                    <SliderRow label="🌿 West depth" value={garden.west} min={0} max={12} unit="u"
                      onChange={v => upd('west', v)} />
                  </div>
                </div>

                <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.15)', color: 'var(--text-muted)' }}>
                  <div className="font-semibold mb-1" style={{ color: '#4CAF50' }}>What gets added:</div>
                  <div>• 🌳 Trees placed along edges</div>
                  <div>• 🌸 Flower beds with colorful blooms</div>
                  <div>• 🪑 Garden benches (if depth &gt; 3u)</div>
                  <div>• ⛲ Fountain (north side, if depth &gt; 4u)</div>
                  <div>• 🌿 Bushes and hedges</div>
                  <div>• 🔆 Garden lamps with warm glow</div>
                  <div>• 🪨 Stone pathway to entrance</div>
                  <div>• 🏡 Wooden fence border</div>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>🎨 3D Scene Theme</div>
                  <button onClick={toggleDarkMode}
                    className="w-full py-2 rounded-lg text-sm transition-all hover:opacity-80 flex items-center justify-center gap-2"
                    style={{ background: isDarkMode ? 'rgba(30,40,100,0.5)' : 'rgba(200,220,255,0.15)', color: isDarkMode ? '#7090FF' : '#CBD8E8', border: `1px solid ${isDarkMode ? 'rgba(112,144,255,0.3)' : 'var(--border)'}` }}>
                    {isDarkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                  </button>
                  <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                    Dark mode gives the 3D scene a night-time atmosphere with cool blue lighting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <SceneCanvas onRoomClick={handleRoomClick} gardenConfig={garden} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs"
            style={{ background: 'rgba(5,5,8,0.8)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Click a room to select · Drag to orbit · Scroll to zoom · Edit device positions in Devices tab
          </div>
        </div>
      </div>

      {/* Feature 10: Reset Confirmation Modal */}
      {confirmReset && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 70, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            className="rounded-2xl p-6 w-80"
            style={{ background: 'rgba(8,14,24,0.97)', border: '1px solid rgba(255,77,109,0.3)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-2" style={{ color: '#FF4D6D' }}>⚠️ Reset Everything?</div>
            <div className="text-sm mb-6" style={{ color: '#8AA0B8', lineHeight: 1.6 }}>
              This will delete all rooms, devices, and your custom layout. This cannot be undone.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { resetToDefault(); setConfirmReset(false); }}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: 'rgba(255,77,109,0.15)', color: '#FF4D6D', border: '1px solid rgba(255,77,109,0.4)' }}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
        <span>{label}</span><span>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full" />
    </div>
  );
}

function NumBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 py-1 text-[10px] rounded transition-all hover:opacity-80"
      style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
      {label}
    </button>
  );
}

function AxisControl({ label, value, onMinus, onPlus, onInput }: {
  label: string; value: number;
  onMinus: () => void; onPlus: () => void;
  onInput: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <button onClick={onMinus} className="w-6 h-6 rounded text-xs flex items-center justify-center hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>−</button>
      <input type="number" value={Math.round(value * 100) / 100} step={0.25}
        onChange={e => onInput(parseFloat(e.target.value) || 0)}
        className="flex-1 text-center text-[10px] rounded px-1 py-0.5"
        style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 48 }} />
      <button onClick={onPlus} className="w-6 h-6 rounded text-xs flex items-center justify-center hover:opacity-80" style={{ background: 'var(--bg-3)', color: 'var(--text-secondary)' }}>+</button>
    </div>
  );
}
