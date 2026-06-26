// App.tsx — HOLOROOM 3D main application entry point
import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import LoadingScreen from './components/ui/LoadingScreen';
import TopBar from './components/ui/TopBar';
import LeftSidebar from './components/ui/LeftSidebar';
import DeviceControlPanel from './components/ui/DeviceControlPanel';
import RoomControlPanel from './components/ui/RoomControlPanel';
import EnergyMonitor from './components/ui/EnergyMonitor';
import AICopilotPanel from './components/ui/AICopilotPanel';
import { useAIStore } from './store/useAIStore';
import AutomationEngine from './components/ui/AutomationEngine';
import NotificationsPanel from './components/ui/NotificationsPanel';
import SettingsPanel from './components/ui/SettingsPanel';
import HomeDesignEditor from './components/ui/HomeDesignEditor';
import CreateSceneModal from './components/ui/CreateSceneModal';
import SceneCanvas from './components/3d/SceneCanvas';
import FloorPlanImporter from './components/floorplan/FloorPlanImporter';
import ResizableHandle from './components/ui/ResizableHandle';
import ToastNotification from './components/ui/ToastNotification';
import VoiceButton from './components/ui/VoiceButton';
import OnboardingTour from './components/ui/OnboardingTour';

import { useHomeStore } from './store/useHomeStore';
import { useUIStore } from './store/useUIStore';
import { useAutomationStore } from './store/useAutomationStore';
import { useSceneStore } from './store/useSceneStore';
import { useAutomationRunner } from './hooks/useAutomationRunner';
import { automationEngine } from './services/automationEngine';
import { holoroomBroker } from './services/websocketBroker';
import { useBrokerSync } from './hooks/useBroker';
import { useFloorPlanStore } from './store/useFloorPlanStore';
import { useActivityStore } from './store/useActivityStore';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const GARDEN_STORAGE_KEY = 'holoroom_garden';

function loadGardenConfig() {
  try {
    const raw = localStorage.getItem(GARDEN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: true, north: 5, south: 5, east: 4, west: 4 };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function AppContent() {
  useEffect(() => {
    useAIStore.getState().initFromStorage();
  }, []);

  useAutomationRunner();
  useBrokerSync(); // wire broker status into Zustand

  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(340);

  const isDesignMode = useHomeStore(s => s.isDesignMode);
  const selectDevice = useHomeStore(s => s.selectDevice);
  const selectRoom = useHomeStore(s => s.selectRoom);
  const setCameraTarget = useHomeStore(s => s.setCameraTarget);
  const getDeviceById = useHomeStore(s => s.getDeviceById);
  const rooms = useHomeStore(s => s.rooms);
  const closePanel = useHomeStore(s => s.closePanel);
  const selectedDevice = useHomeStore(s => s.selectedDevice);
  const selectedRoom = useHomeStore(s => s.selectedRoom);

  const { openPanel, closeAll } = useUIStore();
  const is2DMode = useUIStore(s => s.is2DMode);
  const panelType = useUIStore(s => s.panelType);

  const isFloorPlanOpen = useFloorPlanStore(s => s.isOpen);

  // Feature 8: Load garden config from localStorage
  const [gardenConfig, setGardenConfig] = useState(loadGardenConfig);

  // Start broker on mount (tries real connection, falls back to mock automatically)
  useEffect(() => {
    const savedUrl = localStorage.getItem('holoroom_broker_url') || undefined;
    holoroomBroker.connect(savedUrl);
    return () => holoroomBroker.disconnect();
  }, []);

  // Prune old activity events on mount
  useEffect(() => {
    useActivityStore.getState().pruneOld();
  }, []);

  useEffect(() => {
    const { addNotification } = useUIStore.getState();
    const t1 = setTimeout(() => addNotification('🔆 Tip: Set AC to 26°C — saves up to 18% energy!', 'info'), 25000);
    const t2 = setTimeout(() => addNotification('⏰ Geyser has been running — consider turning off', 'warning'), 55000);
    const t3 = setTimeout(() => addNotification('🌙 Bedtime soon — try the Sleep Mode scene', 'info'), 90000);
    const t4 = setTimeout(() => addNotification('💡 Kitchen light on with no motion detected', 'warning'), 120000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel();
        closeAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePanel, closeAll]);

  // Feature 8: Listen for garden config updates from HomeDesignEditor via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === GARDEN_STORAGE_KEY && e.newValue) {
        try { setGardenConfig(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleDeviceClick = useCallback((deviceId: number, roomId: number, roomName: string) => {
    const device = getDeviceById(deviceId);
    if (device) {
      selectDevice(device, roomId, roomName);
      openPanel('device');
    }
  }, [getDeviceById, selectDevice, openPanel]);

  const handleRoomClick = useCallback((roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      selectRoom(room);
      setCameraTarget(room.id);
      openPanel('room');
    }
  }, [rooms, selectRoom, setCameraTarget, openPanel]);

  const showRightPanel = panelType === 'device' && selectedDevice
    || panelType === 'room' && selectedRoom;

  if (isDesignMode) {
    return <HomeDesignEditor />;
  }

  return (
    <div className="flex flex-col" style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: 'var(--bg-0)' }}>
      <TopBar onViewAll={() => { selectRoom(null); setCameraTarget(null); closePanel(); }} />
      <div className="flex flex-1 overflow-hidden min-h-0 relative">

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <>
            <div className="flex shrink-0 h-full min-h-0" style={{ width: leftWidth }}>
              <LeftSidebar />
            </div>
            <ResizableHandle
              side="left"
              onResize={(d) => setLeftWidth(w => clamp(w + d, 220, 480))}
            />
          </>
        )}

        {/* ── Mobile sidebar overlay ── */}
        {isMobile && mobileSidebarOpen && (
          <>
            <div
              className="absolute inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div
              className="absolute left-0 top-0 h-full z-50 overflow-y-auto"
              style={{ width: 280, background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}
            >
              <LeftSidebar />
            </div>
          </>
        )}

        {/* ── Main canvas ── */}
        <div
          className="flex-1 relative overflow-hidden min-w-0"
          style={{ isolation: 'isolate', zIndex: 0 }}
          data-tour="canvas"
        >
          <SceneCanvas onDeviceClick={handleDeviceClick} onRoomClick={handleRoomClick} gardenConfig={gardenConfig} />

          {/* Mobile: sidebar toggle button */}
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(v => !v)}
              className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(13,17,23,0.9)', color: 'var(--text-secondary)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Rooms
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.92)', color: '#5C6B7A', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 5, whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 2rem)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {is2DMode ? 'Scroll to zoom · Click room to select · Switch to 3D for device control' : 'Drag to rotate · Scroll to zoom · Click device to control'}
          </div>
          {/* Feature 4: Voice button */}
          <div data-tour="voice-btn">
            <VoiceButton />
          </div>
        </div>

        {/* ── Desktop right panel ── */}
        {showRightPanel && !isMobile && (
          <>
            <ResizableHandle
              side="right"
              onResize={(d) => setRightWidth(w => clamp(w + d, 280, 560))}
            />
            <div className="flex shrink-0 h-full min-h-0 overflow-hidden" style={{ width: rightWidth }}>
              <AnimatePresence mode="wait">
                {panelType === 'device' && selectedDevice && (
                  <DeviceControlPanel key="device-panel" device={selectedDevice} onClose={closePanel} />
                )}
                {panelType === 'room' && selectedRoom && (
                  <RoomControlPanel key="room-panel" room={selectedRoom} onClose={closePanel} />
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <EnergyMonitor />
      <AICopilotPanel />

      {/* ── Mobile bottom-sheet panel (fixed, above sidebar z-50) ── */}
      {isMobile && showRightPanel && (
        <AnimatePresence mode="wait">
          <>
            {/* Backdrop */}
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0"
              style={{ background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
              onClick={closePanel}
            />
            {/* Sheet */}
            <motion.div
              key="panel-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 40 }}
              className="fixed inset-x-0 bottom-0 rounded-t-2xl overflow-hidden"
              style={{ height: '70vh', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)', zIndex: 61 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                {panelType === 'device' && selectedDevice && (
                  <DeviceControlPanel key="device-panel" device={selectedDevice} onClose={closePanel} />
                )}
                {panelType === 'room' && selectedRoom && (
                  <RoomControlPanel key="room-panel" room={selectedRoom} onClose={closePanel} />
                )}
              </div>
            </motion.div>
          </>
        </AnimatePresence>
      )}
      <AutomationEngine />
      <NotificationsPanel />
      <SettingsPanel />
      <CreateSceneModal />
      {isFloorPlanOpen && <FloorPlanImporter />}

      {/* Feature 1: Toast notifications */}
      <ToastNotification />
      {/* Feature 7: Onboarding tour */}
      <OnboardingTour />
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    useHomeStore.getState().loadLayoutFromStorage();
    useAutomationStore.getState().loadFromStorage();
    useSceneStore.getState().loadCustomScenes();
    useFloorPlanStore.getState().checkSavedSession();
    automationEngine.start();
    return () => automationEngine.stop();
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>
      {!loading && <AppContent />}
    </>
  );
}
