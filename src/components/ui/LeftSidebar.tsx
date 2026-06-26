// LeftSidebar.tsx — Rooms + Scenes sidebar
import { useState } from 'react';
import { Zap, Plus, Play, Square, Thermometer, Droplets } from 'lucide-react';
import { useHomeStore } from '../../store/useHomeStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useUIStore } from '../../store/useUIStore';
import { computeDeviceWatts } from '../../store/useHomeStore';
import { calcMonthlyCost } from '../../utils/formatters';
import FloorPlanButton from '../floorplan/FloorPlanButton';

export default function LeftSidebar() {
  const [tab, setTab] = useState<'rooms' | 'scenes'>('rooms');

  const rooms = useHomeStore(s => s.rooms);
  const selectedRoom = useHomeStore(s => s.selectedRoom);
  const selectRoom = useHomeStore(s => s.selectRoom);
  const setCameraTarget = useHomeStore(s => s.setCameraTarget);
  const totalPower = useHomeStore(s => s.getTotalPower());
  const activeCount = useHomeStore(s => s.getActiveDeviceCount());

  const scenes = useSceneStore(s => s.scenes);
  const playScene = useSceneStore(s => s.playScene);
  const stopScene = useSceneStore(s => s.stopScene);
  const activeSceneId = useSceneStore(s => s.activeSceneId);
  const isPlayingScene = useSceneStore(s => s.isPlayingScene);
  const sceneProgress = useSceneStore(s => s.sceneProgress);

  const toggleEnergy = useUIStore(s => s.toggleEnergy);
  const toggleAutomation = useUIStore(s => s.toggleAutomation);
  const toggleCreateScene = useUIStore(s => s.toggleCreateScene);
  const openPanel = useUIStore(s => s.openPanel);

  const handleRoomClick = (room: typeof rooms[0]) => {
    selectRoom(room);
    setCameraTarget(room.id);
    openPanel('room');
  };

  return (
    <aside
      className="flex flex-col w-full h-full"
      style={{
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Mini stats */}
      <div className="flex gap-2 p-3 shrink-0">
        <div className="flex-1 rounded-lg p-2" style={{ background: 'var(--bg-2)' }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Active</span>
          </div>
          <div className="font-display font-bold text-lg leading-none" style={{ color: 'var(--green)' }}>{activeCount}</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>devices on</div>
        </div>
        <div className="flex-1 rounded-lg p-2" style={{ background: 'var(--bg-2)' }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap size={10} style={{ color: 'var(--amber)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Power</span>
          </div>
          <div className="font-display font-bold text-lg leading-none" style={{ color: 'var(--amber)' }}>{Math.round(totalPower)}</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>watts</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex mx-3 mb-3 p-0.5 rounded-lg shrink-0" style={{ background: 'var(--bg-2)' }}>
        {(['rooms', 'scenes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize"
            style={{
              background: tab === t ? 'var(--bg-3)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: tab === t ? '1px solid var(--border-bright)' : '1px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-2">
        {tab === 'rooms' ? (
          rooms.map(room => {
            const roomPower = room.devices.reduce((s, d) => s + computeDeviceWatts(d), 0);
            const activeDevices = room.devices.filter(d => d.isOn).length;
            const isSelected = selectedRoom?.id === room.id;
            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="w-full text-left rounded-xl p-3 transition-all"
                style={{
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg-2)',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{room.icon}</span>
                    <div>
                      <div className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{room.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{room.devices.length} devices</div>
                    </div>
                  </div>
                  {activeDevices > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                      {activeDevices} on
                    </span>
                  )}
                </div>
                {roomPower > 0 && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <Zap size={9} style={{ color: 'var(--amber)' }} />
                    <span className="text-[10px]" style={{ color: 'var(--amber)' }}>{Math.round(roomPower)}W</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>· ₹{Math.round(calcMonthlyCost(roomPower))}/mo</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <Thermometer size={8} />{room.temperature}°C
                  </span>
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <Droplets size={8} />{room.humidity}%
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <>
            {scenes.map(scene => {
              const isActive = activeSceneId === scene.id && isPlayingScene;
              return (
                <div
                  key={scene.id}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: isActive ? `${scene.color}15` : 'var(--bg-2)',
                    border: isActive ? `1px solid ${scene.color}44` : '1px solid var(--border)',
                    boxShadow: isActive ? `0 0 20px ${scene.color}22` : 'none',
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{scene.emoji}</span>
                      <div>
                        <div className="font-medium text-sm leading-tight flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                          {scene.name}
                          {scene.isCustom && (
                            <span className="px-1 rounded text-[8px]" style={{ background: 'var(--purple)', color: 'white' }}>Custom</span>
                          )}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{scene.description}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
                    Affects {scene.steps.length} steps
                  </div>
                  {isActive ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: scene.color }}>Playing... {sceneProgress}%</span>
                        <button onClick={stopScene} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--red)' }}>
                          <Square size={8} />Stop
                        </button>
                      </div>
                      <div className="w-full h-1 rounded-full" style={{ background: 'var(--bg-3)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${sceneProgress}%`, background: scene.color }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => playScene(scene.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium w-full justify-center transition-all hover:opacity-80"
                      style={{ background: 'transparent', border: `1px solid var(--cyan)`, color: 'var(--cyan)' }}
                    >
                      <Play size={11} />Play Scene
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={toggleCreateScene}
              className="flex items-center gap-2 w-full py-2.5 rounded-lg text-sm justify-center transition-all hover:opacity-80"
              style={{ border: '1px dashed var(--border-bright)', color: 'var(--text-secondary)' }}
            >
              <Plus size={14} />Create Scene
            </button>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 flex flex-col gap-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={toggleEnergy}
          className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,184,0,0.2)' }}
        >
          <Zap size={14} />⚡ Energy Monitor
        </button>
        <button
          onClick={toggleAutomation}
          className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)' }}
        >
          <span className="text-base">⚡</span> Automation Engine
        </button>
        <FloorPlanButton variant="sidebar" />
      </div>
    </aside>
  );
}
