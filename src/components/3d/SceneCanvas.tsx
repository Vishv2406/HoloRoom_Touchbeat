// SceneCanvas.tsx — Architectural floor-plan 3D scene with 2D/3D toggle, dark mode, garden
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useRef, useEffect, Suspense, useMemo, createRef } from 'react';
import type React from 'react';
import { useHomeStore } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import { resolveCameraPreset } from '../../utils/cameraPositions';
import { computeHouseBounds } from '../../utils/roomAdjacency';
import { RoomMesh } from './RoomMesh';
import type { Room } from '../../types';

const SCENE_BG_LIGHT = '#D8E8F0';
const SCENE_BG_DARK = '#0A0E14';
const SCENE_BG_2D = '#1A2535';

// Shared OrbitControls ref — RoomMesh reads this to disable orbit during drag
export const orbitControlsRef = createRef<any>();

function CameraController({ rooms, is2DMode }: { rooms: Room[]; is2DMode: boolean }) {
  const { camera } = useThree();
  const controlsRef = orbitControlsRef as React.MutableRefObject<any>;
  const targetRoom = useHomeStore(s => s.cameraTargetRoom);
  const initializedRef = useRef(false);
  const lastTargetRef = useRef<number | null | undefined>(undefined);
  const last2DModeRef = useRef(false);

  useEffect(() => {
    if (is2DMode !== last2DModeRef.current) {
      last2DModeRef.current = is2DMode;
      if (is2DMode) {
        const bounds = computeHouseBounds(rooms);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cz = (bounds.minZ + bounds.maxZ) / 2;
        const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 8);
        camera.position.set(cx, span * 1.4, cz);
        if (controlsRef.current) {
          controlsRef.current.target.set(cx, 0, cz);
          controlsRef.current.update();
        }
        return;
      }
    }
    if (!is2DMode && (!initializedRef.current || lastTargetRef.current !== targetRoom)) {
      initializedRef.current = true;
      lastTargetRef.current = targetRoom;
      const preset = resolveCameraPreset(rooms, targetRoom);
      const [px, py, pz] = preset.position;
      const [tx, ty, tz] = preset.target;
      camera.position.set(px, py, pz);
      if (controlsRef.current) {
        controlsRef.current.target.set(tx, ty, tz);
        controlsRef.current.update();
      }
    }
  }, [targetRoom, is2DMode]);

  const bounds = useMemo(() => computeHouseBounds(rooms), [rooms]);
  const maxDist = useMemo(() => {
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 10);
    return Math.max(60, span * 2.5);
  }, [bounds]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={!is2DMode}
      dampingFactor={0.05}
      minDistance={6}
      maxDistance={maxDist}
      minPolarAngle={is2DMode ? 0 : 0}
      maxPolarAngle={is2DMode ? 0.01 : Math.PI / 2.15}
      enableRotate={!is2DMode}
      makeDefault
    />
  );
}

function SceneLighting({ is2DMode, isDarkMode }: { is2DMode: boolean; isDarkMode: boolean }) {
  if (is2DMode) {
    return (
      <>
        <ambientLight color="#FFFFFF" intensity={2.5} />
        <directionalLight position={[0, 40, 0.001]} intensity={1.0} color="#FFFFFF" />
      </>
    );
  }
  if (isDarkMode) {
    return (
      <>
        <ambientLight color="#1A2040" intensity={0.35} />
        <hemisphereLight color="#2030A0" groundColor="#050810" intensity={0.3} />
        <directionalLight position={[12, 24, 10]} intensity={0.5} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-far={60} shadow-camera-left={-30} shadow-camera-right={30}
          shadow-camera-top={30} shadow-camera-bottom={-30} color="#4060CC" />
        <directionalLight position={[-12, 14, -8]} intensity={0.2} color="#8040FF" />
        <pointLight position={[0, 4, 0]} intensity={0.4} color="#2060FF" distance={20} />
      </>
    );
  }
  return (
    <>
      <ambientLight color="#FFF5EC" intensity={0.55} />
      <hemisphereLight color="#FFF0DC" groundColor="#B8A898" intensity={0.4} />
      <directionalLight
        position={[12, 24, 10]} intensity={0.9} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={60} shadow-camera-left={-30} shadow-camera-right={30}
        shadow-camera-top={30} shadow-camera-bottom={-30} color="#FFF8F0"
      />
      <directionalLight position={[-12, 14, -8]} intensity={0.35} color="#D4E8F8" />
    </>
  );
}

function HouseFoundation({ rooms, isDarkMode }: { rooms: Room[]; isDarkMode: boolean }) {
  const bounds = useMemo(() => computeHouseBounds(rooms), [rooms]);
  const width = bounds.maxX - bounds.minX + 1.4;
  const depth = bounds.maxZ - bounds.minZ + 1.4;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group>
      <mesh position={[cx, -0.06, cz]} receiveShadow>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial color={isDarkMode ? '#1A1A2A' : '#C0B5A8'} roughness={0.92} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.12, cz]} receiveShadow>
        <planeGeometry args={[width * 1.1, depth * 1.1]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

// ── Garden Components ────────────────────────────────────────────────────────

function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      {/* trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 1.0, 8]} />
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </mesh>
      {/* canopy layers */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <coneGeometry args={[0.8, 1.2, 8]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#388E3C" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[0.38, 0.8, 8]} />
        <meshStandardMaterial color="#43A047" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Bush({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshStandardMaterial color="#558B2F" roughness={0.85} />
      </mesh>
      <mesh position={[0.3, 0.25, 0.1]} castShadow>
        <sphereGeometry args={[0.32, 8, 6]} />
        <meshStandardMaterial color="#689F38" roughness={0.85} />
      </mesh>
      <mesh position={[-0.28, 0.25, 0.15]} castShadow>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshStandardMaterial color="#7CB342" roughness={0.85} />
      </mesh>
    </group>
  );
}

function FlowerBed({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const flowers = useMemo(() => {
    const arr: { fx: number; fz: number; color: string }[] = [];
    const colors = ['#E91E63', '#FF5722', '#FFEB3B', '#9C27B0', '#FF9800', '#F44336'];
    const cols = Math.floor(w / 0.5);
    const rows = Math.floor(d / 0.5);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        arr.push({
          fx: -w / 2 + 0.25 + i * 0.5,
          fz: -d / 2 + 0.25 + j * 0.5,
          color: colors[Math.floor((i + j * cols) % colors.length)],
        });
      }
    }
    return arr;
  }, [w, d]);

  return (
    <group position={[x, 0.02, z]}>
      {/* soil bed */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial color="#5D4037" roughness={0.95} />
      </mesh>
      {flowers.map((f, i) => (
        <group key={i} position={[f.fx, 0.15, f.fz]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
            <meshStandardMaterial color="#558B2F" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.09, 6, 5]} />
            <meshStandardMaterial color={f.color} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GardenPath({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const stones = useMemo(() => {
    const arr: { sx: number; sz: number }[] = [];
    const count = Math.floor(d / 0.7);
    for (let i = 0; i < count; i++) {
      arr.push({ sx: 0, sz: -d / 2 + 0.35 + i * 0.7 });
    }
    return arr;
  }, [d]);
  return (
    <group position={[x, 0.01, z]}>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.sx, 0.02, s.sz]} rotation={[0, (i * 0.3) % Math.PI, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 7]} />
          <meshStandardMaterial color="#9E9E9E" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function GardenBench({ x, z, rotY = 0 }: { x: number; z: number; rotY?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* seat */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.4, 0.06, 0.5]} />
        <meshStandardMaterial color="#8D6E63" roughness={0.85} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 0.72, -0.22]} castShadow>
        <boxGeometry args={[1.4, 0.5, 0.06]} />
        <meshStandardMaterial color="#8D6E63" roughness={0.85} />
      </mesh>
      {/* legs */}
      {[[-0.6, -0.2], [0.6, -0.2], [-0.6, 0.2], [0.6, 0.2]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx as number, 0.2, lz as number]} castShadow>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#5D4037" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Fountain({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* base */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.24, 16]} />
        <meshStandardMaterial color="#90A4AE" roughness={0.7} />
      </mesh>
      {/* basin */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.08, 16]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* water */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.04, 16]} />
        <meshStandardMaterial color="#29B6F6" roughness={0.1} metalness={0.2} transparent opacity={0.75} />
      </mesh>
      {/* pillar */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#90A4AE" roughness={0.7} />
      </mesh>
      {/* top bowl */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.5} />
      </mesh>
    </group>
  );
}

function GardenLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.0, 6]} />
        <meshStandardMaterial color="#424242" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#FFF9C4" emissive="#FFD54F" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[x, 2.1, z]} intensity={0.5} color="#FFD54F" distance={4} />
    </group>
  );
}

interface GardenConfig {
  enabled: boolean;
  north: number;
  south: number;
  east: number;
  west: number;
}

interface GardenProps {
  rooms: Room[];
  config: GardenConfig;
  isDarkMode: boolean;
}

function Garden({ rooms, config, isDarkMode }: GardenProps) {
  if (!config.enabled) return null;

  const bounds = useMemo(() => computeHouseBounds(rooms), [rooms]);
  const houseW = bounds.maxX - bounds.minX;
  const houseD = bounds.maxZ - bounds.minZ;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  const { north, south, east, west } = config;
  const totalW = houseW + east + west + 1.4;
  const totalD = houseD + north + south + 1.4;
  const gardenCx = cx + (east - west) / 2;
  const gardenCz = cz + (south - north) / 2;

  const grassColor = isDarkMode ? '#1B3A1F' : '#4CAF50';
  const grassDark = isDarkMode ? '#142B17' : '#388E3C';

  return (
    <group>
      {/* Main grass slab */}
      <mesh position={[gardenCx, -0.08, gardenCz]} receiveShadow>
        <boxGeometry args={[totalW, 0.06, totalD]} />
        <meshStandardMaterial color={grassColor} roughness={0.95} />
      </mesh>
      {/* Grass texture lines */}
      {Array.from({ length: Math.floor(totalW / 1.2) }).map((_, i) => (
        <mesh key={`gl-${i}`} position={[gardenCx - totalW / 2 + 0.6 + i * 1.2, -0.04, gardenCz]} receiveShadow>
          <boxGeometry args={[0.02, 0.06, totalD]} />
          <meshStandardMaterial color={grassDark} roughness={0.95} />
        </mesh>
      ))}

      {/* North garden strip */}
      {north > 1 && (
        <>
          <FlowerBed x={cx - houseW * 0.25} z={bounds.minZ - north / 2} w={houseW * 0.35} d={Math.min(north * 0.6, 2)} />
          <FlowerBed x={cx + houseW * 0.25} z={bounds.minZ - north / 2} w={houseW * 0.3} d={Math.min(north * 0.6, 2)} />
          <Tree x={cx - houseW * 0.45} z={bounds.minZ - north * 0.65} scale={0.8} />
          <Tree x={cx + houseW * 0.45} z={bounds.minZ - north * 0.65} scale={0.9} />
          {north > 3 && <GardenBench x={cx} z={bounds.minZ - north * 0.55} rotY={Math.PI} />}
          {north > 4 && <Fountain x={cx + houseW * 0.15} z={bounds.minZ - north * 0.75} />}
          <GardenLamp x={cx - houseW * 0.35} z={bounds.minZ - 1.5} />
          <GardenLamp x={cx + houseW * 0.35} z={bounds.minZ - 1.5} />
          <GardenPath x={cx} z={bounds.minZ - north / 2} w={0.6} d={north * 0.8} />
        </>
      )}

      {/* South garden strip */}
      {south > 1 && (
        <>
          <FlowerBed x={cx - houseW * 0.2} z={bounds.maxZ + south / 2} w={houseW * 0.35} d={Math.min(south * 0.6, 2)} />
          <Tree x={cx - houseW * 0.45} z={bounds.maxZ + south * 0.65} scale={0.85} />
          <Tree x={cx + houseW * 0.45} z={bounds.maxZ + south * 0.65} scale={0.75} />
          <Bush x={cx + houseW * 0.2} z={bounds.maxZ + 1.5} />
          <Bush x={cx + houseW * 0.3} z={bounds.maxZ + 2.0} scale={0.8} />
          {south > 3 && <GardenBench x={cx} z={bounds.maxZ + south * 0.5} />}
          <GardenLamp x={cx - houseW * 0.35} z={bounds.maxZ + 1.5} />
          <GardenLamp x={cx + houseW * 0.35} z={bounds.maxZ + 1.5} />
        </>
      )}

      {/* East garden strip */}
      {east > 1 && (
        <>
          <Bush x={bounds.maxX + east * 0.4} z={cz - houseD * 0.25} />
          <Bush x={bounds.maxX + east * 0.4} z={cz + houseD * 0.25} />
          <Tree x={bounds.maxX + east * 0.7} z={cz} scale={0.9} />
          {east > 3 && <GardenBench x={bounds.maxX + east * 0.5} z={cz} rotY={-Math.PI / 2} />}
        </>
      )}

      {/* West garden strip */}
      {west > 1 && (
        <>
          <Bush x={bounds.minX - west * 0.4} z={cz - houseD * 0.25} />
          <Bush x={bounds.minX - west * 0.4} z={cz + houseD * 0.25} scale={0.85} />
          <Tree x={bounds.minX - west * 0.7} z={cz} scale={0.85} />
          {west > 3 && <GardenBench x={bounds.minX - west * 0.5} z={cz} rotY={Math.PI / 2} />}
        </>
      )}

      {/* Outer fence/border */}
      {/* North fence */}
      <mesh position={[gardenCx, 0.25, gardenCz - totalD / 2]} castShadow>
        <boxGeometry args={[totalW, 0.5, 0.08]} />
        <meshStandardMaterial color={isDarkMode ? '#2A2A3A' : '#795548'} roughness={0.9} />
      </mesh>
      {/* South fence */}
      <mesh position={[gardenCx, 0.25, gardenCz + totalD / 2]} castShadow>
        <boxGeometry args={[totalW, 0.5, 0.08]} />
        <meshStandardMaterial color={isDarkMode ? '#2A2A3A' : '#795548'} roughness={0.9} />
      </mesh>
      {/* East fence */}
      <mesh position={[gardenCx + totalW / 2, 0.25, gardenCz]} castShadow>
        <boxGeometry args={[0.08, 0.5, totalD]} />
        <meshStandardMaterial color={isDarkMode ? '#2A2A3A' : '#795548'} roughness={0.9} />
      </mesh>
      {/* West fence */}
      <mesh position={[gardenCx - totalW / 2, 0.25, gardenCz]} castShadow>
        <boxGeometry args={[0.08, 0.5, totalD]} />
        <meshStandardMaterial color={isDarkMode ? '#2A2A3A' : '#795548'} roughness={0.9} />
      </mesh>
      {/* Fence posts */}
      {Array.from({ length: Math.floor(totalW / 2.5) + 1 }).map((_, i) => (
        <group key={`fp-n-${i}`}>
          <mesh position={[gardenCx - totalW / 2 + i * (totalW / Math.floor(totalW / 2.5)), 0.35, gardenCz - totalD / 2]}>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color={isDarkMode ? '#3A3A4A' : '#6D4C41'} roughness={0.9} />
          </mesh>
          <mesh position={[gardenCx - totalW / 2 + i * (totalW / Math.floor(totalW / 2.5)), 0.35, gardenCz + totalD / 2]}>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color={isDarkMode ? '#3A3A4A' : '#6D4C41'} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SceneEnvironment({ is2DMode, isDarkMode }: { is2DMode: boolean; isDarkMode: boolean }) {
  const bg = is2DMode ? SCENE_BG_2D : isDarkMode ? SCENE_BG_DARK : SCENE_BG_LIGHT;
  return (
    <>
      <color attach="background" args={[bg]} />
      <Grid
        args={[200, 200]}
        cellSize={1}
        cellThickness={is2DMode ? 0.3 : 0.4}
        cellColor={is2DMode ? '#2A3D55' : isDarkMode ? '#1A2040' : '#B8C8D0'}
        sectionSize={5}
        sectionThickness={is2DMode ? 0.7 : 0.8}
        sectionColor={is2DMode ? '#3A5070' : isDarkMode ? '#2A3060' : '#A0B4BC'}
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.04, 0]}
      />
    </>
  );
}

interface SceneCanvasProps {
  onDeviceClick?: (deviceId: number, roomId: number, roomName: string) => void;
  onRoomClick?: (roomId: number) => void;
  gardenConfig?: GardenConfig;
}

export type { GardenConfig };

export default function SceneCanvas({ onDeviceClick, onRoomClick, gardenConfig }: SceneCanvasProps) {
  const rooms = useHomeStore(s => s.rooms);
  const showEnergyAura = useHomeStore(s => s.showEnergyAura);
  const selectedDevice = useHomeStore(s => s.selectedDevice);
  const isDesignMode = useHomeStore(s => s.isDesignMode);
  const selectedRoom = useHomeStore(s => s.selectedRoom);
  const is2DMode = useUIStore(s => s.is2DMode);
  const isDarkMode = useUIStore(s => s.isDarkMode);

  const defaultGarden: GardenConfig = gardenConfig ?? {
    enabled: true, north: 5, south: 5, east: 4, west: 4,
  };

  const initialCamera = useMemo(
    () => resolveCameraPreset(rooms, null).position,
    [],
  );

  const bg = is2DMode ? SCENE_BG_2D : isDarkMode ? SCENE_BG_DARK : SCENE_BG_LIGHT;

  return (
    <Canvas
      camera={{ position: initialCamera, fov: 45, near: 0.1, far: 500 }}
      shadows={is2DMode ? false : { type: THREE.PCFShadowMap }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', background: bg }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <SceneEnvironment is2DMode={is2DMode} isDarkMode={isDarkMode} />
        {!is2DMode && <Environment preset={isDarkMode ? 'night' : 'apartment'} environmentIntensity={isDarkMode ? 0.1 : 0.2} />}
        <SceneLighting is2DMode={is2DMode} isDarkMode={isDarkMode} />
        <CameraController rooms={rooms} is2DMode={is2DMode} />
        <Garden rooms={rooms} config={defaultGarden} isDarkMode={isDarkMode} />
        <HouseFoundation rooms={rooms} isDarkMode={isDarkMode} />
        {rooms.map(room => (
          <RoomMesh
            key={room.id}
            room={room}
            allRooms={rooms}
            isSelected={selectedRoom?.id === room.id}
            isDesignMode={isDesignMode}
            selectedDeviceId={selectedDevice?.id ?? null}
            showEnergyAura={showEnergyAura}
            onDeviceClick={onDeviceClick}
            onRoomClick={onRoomClick}
            is2DMode={is2DMode}
            isDarkMode={isDarkMode}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
