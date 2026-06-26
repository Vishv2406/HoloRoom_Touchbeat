// RoomMesh.tsx — Architectural cut-away room with walls, floors, devices
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Room } from '../../types';
import { computeDeviceWatts, useHomeStore } from '../../store/useHomeStore';
import { useUIStore } from '../../store/useUIStore';
import { useFloorPlanStore } from '../../store/useFloorPlanStore';
import { orbitControlsRef } from './SceneCanvas';
import {
  getRoomBounds,
  getAdjacentRoom,
  DOOR_WIDTH,
  type WallSide,
} from '../../utils/roomAdjacency';
import Light3D from './Light3D';
import Fan3D from './Fan3D';
import AC3D from './AC3D';
import TV3D from './TV3D';
import Geyser3D from './Geyser3D';
import SmartPlug3D from './SmartPlug3D';
import ExhaustFan3D from './ExhaustFan3D';
import Furniture3D from './Furniture3D';

interface RoomMeshProps {
  room: Room;
  allRooms: Room[];
  isSelected: boolean;
  isDesignMode: boolean;
  selectedDeviceId: number | null;
  showEnergyAura: boolean;
  is2DMode?: boolean;
  isDarkMode?: boolean;
  onDeviceClick?: (deviceId: number, roomId: number, roomName: string) => void;
  onRoomClick?: (roomId: number) => void;
}

const WALL_H = 3.2;
const CUT_H = 2.8;
const WALL_T = 0.25;
const FLOOR_THICK = 0.08;
const WALL_EXT_LIGHT = '#D4C5B0';
const WALL_EXT_DARK = '#2A2A3A';
type FloorStyle = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'default';

function getFloorStyle(room: Room): FloorStyle {
  const n = room.name.toLowerCase();
  if (n.includes('bath') || n.includes('toilet')) return 'bathroom';
  if (n.includes('kitchen')) return 'kitchen';
  if (n.includes('bed')) return 'bedroom';
  if (n.includes('living') || n.includes('hall') || n.includes('lounge')) return 'living';
  switch (room.id) {
    case 1:
    case 2:
      return 'bedroom';
    case 3:
      return 'living';
    case 4:
      return 'kitchen';
    case 5:
      return 'bathroom';
    default:
      return 'default';
  }
}

const FLOOR_COLORS: Record<FloorStyle, string> = {
  living: '#F2EDE4',
  bedroom: '#C4956A',
  kitchen: '#E8E8E0',
  bathroom: '#F0F0F0',
  default: '#EDE8E0',
};

function FloorPattern({ W, D, style }: { W: number; D: number; style: FloorStyle }) {
  const y = FLOOR_THICK + 0.002;
  const lines: ReactElement[] = [];

  if (style === 'bedroom') {
    const count = Math.floor(D / 0.45);
    for (let i = 0; i < count; i++) {
      const z = -D / 2 + 0.25 + i * 0.45;
      lines.push(
        <mesh key={`plank-${i}`} position={[0, y, z]} receiveShadow>
          <boxGeometry args={[W * 0.96, 0.008, 0.04]} />
          <meshStandardMaterial color="#A67B52" roughness={0.85} />
        </mesh>,
      );
    }
  } else if (style === 'living' || style === 'kitchen' || style === 'bathroom') {
    const step = style === 'bathroom' ? 0.35 : 0.55;
    const countX = Math.floor(W / step);
    const countZ = Math.floor(D / step);
    for (let i = 0; i <= countX; i++) {
      const x = -W / 2 + i * step;
      lines.push(
        <mesh key={`gx-${i}`} position={[x, y, 0]} receiveShadow>
          <boxGeometry args={[0.02, 0.006, D * 0.96]} />
          <meshStandardMaterial color="#D8D4CC" roughness={0.9} />
        </mesh>,
      );
    }
    for (let j = 0; j <= countZ; j++) {
      const z = -D / 2 + j * step;
      lines.push(
        <mesh key={`gz-${j}`} position={[0, y, z]} receiveShadow>
          <boxGeometry args={[W * 0.96, 0.006, 0.02]} />
          <meshStandardMaterial color="#D8D4CC" roughness={0.9} />
        </mesh>,
      );
    }
  }

  return <group>{lines}</group>;
}

function WallWithDoorway({
  length,
  side,
  hasDoorway,
  position,
  rotation,
  isDark = false,
}: {
  length: number;
  side: 'ns' | 'ew';
  hasDoorway: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  isDark?: boolean;
}) {
  const h = CUT_H;
  const t = WALL_T;
  const wallColor = isDark ? WALL_EXT_DARK : WALL_EXT_LIGHT;
  const mat = (
    <meshStandardMaterial color={wallColor} roughness={0.9} metalness={0} />
  );

  if (!hasDoorway || length <= DOOR_WIDTH + 0.5) {
    const args = side === 'ns' ? [length, h, t] : [t, h, length];
    return (
      <mesh position={position} rotation={rotation} castShadow receiveShadow>
        <boxGeometry args={args as [number, number, number]} />
        {mat}
      </mesh>
    );
  }

  const segLen = (length - DOOR_WIDTH) / 2;
  const offset = (DOOR_WIDTH / 2 + segLen / 2);
  const segments: { pos: [number, number, number]; len: number }[] = [
    { pos: side === 'ns' ? [-offset, 0, 0] : [0, 0, -offset], len: segLen },
    { pos: side === 'ns' ? [offset, 0, 0] : [0, 0, offset], len: segLen },
  ];

  return (
    <group position={position} rotation={rotation}>
      {segments.map((seg, i) => {
        const args = side === 'ns' ? [seg.len, h, t] : [t, h, seg.len];
        return (
          <mesh key={i} position={seg.pos} castShadow receiveShadow>
            <boxGeometry args={args as [number, number, number]} />
            {mat}
          </mesh>
        );
      })}
      <mesh position={[0, h / 2 - 0.05, 0]}>
        <boxGeometry args={side === 'ns' ? [DOOR_WIDTH + 0.08, 0.08, t + 0.02] : [t + 0.02, 0.08, DOOR_WIDTH + 0.08]} />
        <meshStandardMaterial color="#8B7D6B" roughness={0.85} />
      </mesh>
    </group>
  );
}

function RoomWalls({
  room,
  allRooms,
  W,
  D,
  floorY,
  isDark = false,
}: {
  room: Room;
  allRooms: Room[];
  W: number;
  D: number;
  floorY: number;
  isDark?: boolean;
}) {
  const bounds = getRoomBounds(room);
  const y = floorY + CUT_H / 2;

  const sides: { side: WallSide; pos: [number, number, number]; len: number; orient: 'ns' | 'ew' }[] = [
    { side: 'north', pos: [0, y, -D / 2], len: W, orient: 'ns' },
    { side: 'south', pos: [0, y, D / 2], len: W, orient: 'ns' },
    { side: 'west', pos: [-W / 2, y, 0], len: D, orient: 'ew' },
    { side: 'east', pos: [W / 2, y, 0], len: D, orient: 'ew' },
  ];

  return (
    <>
      {sides.map(({ side, pos, len, orient }) => {
        const adjacent = getAdjacentRoom(bounds, side, allRooms);
        const hasDoorway = adjacent !== null;
        return (
          <WallWithDoorway
            key={side}
            length={len}
            side={orient}
            hasDoorway={hasDoorway}
            position={pos}
            isDark={isDark}
          />
        );
      })}
    </>
  );
}

export function RoomMesh({
  room,
  allRooms,
  isSelected,
  isDesignMode,
  selectedDeviceId,
  showEnergyAura,
  is2DMode = false,
  isDarkMode = false,
  onDeviceClick,
  onRoomClick,
}: RoomMeshProps) {
  const { position, size, devices, name, icon } = room;
  const W = Math.max(3, size.width || 5);
  const D = Math.max(3, size.depth || 5);
  const cx = position.x;
  const cz = position.z;
  const floorStyle = getFloorStyle(room);
  const floorColor = isDarkMode ? '#1A1A2E' : FLOOR_COLORS[floorStyle];
  const activeCount = devices.filter(d => d.isOn).length;
  const hideLabels = useUIStore(s =>
    s.isSettingsOpen || s.isEnergyOpen || s.isAutomationOpen
    || s.isCreateSceneOpen || s.isNotificationsOpen,
  );
  const floorPlanOpen = useFloorPlanStore(s => s.isOpen);
  const showLabel = !hideLabels && !floorPlanOpen;

  const handleRoomClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isDesignMode) onRoomClick?.(room.id);
  };

  const selectionEmissive = isSelected ? '#E8DCC8' : '#000000';
  const selectionIntensity = isSelected ? 0.15 : 0;

  // ── Drag-to-move rooms (Feature 3) ─────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ ox: number; oz: number }>({ ox: 0, oz: 0 });
  const updateRoomPosition = useHomeStore(s => s.updateRoomPosition);
  const { camera, gl } = useThree();
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());

  const snapGrid = (v: number) => Math.round(v * 2) / 2;

  const getWorldXZ = (event: PointerEvent): { x: number; z: number } | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const target = new THREE.Vector3();
    const hit = raycaster.current.ray.intersectPlane(planeRef.current, target);
    if (!hit) return null;
    return { x: target.x, z: target.z };
  };

  const handleFloorPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isDesignMode) return;
    e.stopPropagation();
    setIsDragging(true);
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
    const world = getWorldXZ(e.nativeEvent);
    if (world) {
      dragOffset.current = { ox: world.x - cx, oz: world.z - cz };
    }
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const handleFloorPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !isDesignMode) return;
    e.stopPropagation();
    const world = getWorldXZ(e.nativeEvent);
    if (world) {
      const newX = snapGrid(world.x - dragOffset.current.ox);
      const newZ = snapGrid(world.z - dragOffset.current.oz);
      updateRoomPosition(room.id, { x: newX, z: newZ });
    }
  };

  const handleFloorPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
    gl.domElement.releasePointerCapture(e.pointerId);
    onRoomClick?.(room.id);
  };

  // ── Device glow colors for dark mode (Feature 6) ──────────────────────
  const DEVICE_GLOW: Record<string, { color: string; intensity: number; distance: number }> = {
    light:   { color: '#FFD54F', intensity: 0.8, distance: 3 },
    fan:     { color: '#81D4FA', intensity: 0.4, distance: 2.5 },
    ac:      { color: '#80DEEA', intensity: 0.5, distance: 3 },
    tv:      { color: '#CE93D8', intensity: 1.2, distance: 4 },
    geyser:  { color: '#FF8A65', intensity: 0.6, distance: 2.5 },
  };

  // ── 2D flat floor-plan mode ──────────────────────────────────────────────
  if (is2DMode) {
    const onDevices = devices.filter(d => d.isOn);
    return (
      <group position={[cx, 0, cz]}>
        {/* Floor slab */}
        <mesh position={[0, 0, 0]} receiveShadow onClick={(e) => { e.stopPropagation(); onRoomClick?.(room.id); }}>
          <boxGeometry args={[W, 0.04, D]} />
          <meshStandardMaterial
            color={isSelected ? '#2A4A6A' : floorColor}
            roughness={0.9}
            emissive={isSelected ? '#1A3A5A' : '#000000'}
            emissiveIntensity={isSelected ? 0.4 : 0}
          />
        </mesh>
        {/* Walls as thin lines */}
        {/* North wall */}
        <mesh position={[0, 0.08, -D / 2]}>
          <boxGeometry args={[W, 0.16, 0.18]} />
          <meshStandardMaterial color={isSelected ? '#4A8AB0' : '#8A7A6A'} />
        </mesh>
        {/* South wall */}
        <mesh position={[0, 0.08, D / 2]}>
          <boxGeometry args={[W, 0.16, 0.18]} />
          <meshStandardMaterial color={isSelected ? '#4A8AB0' : '#8A7A6A'} />
        </mesh>
        {/* West wall */}
        <mesh position={[-W / 2, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.16, D]} />
          <meshStandardMaterial color={isSelected ? '#4A8AB0' : '#8A7A6A'} />
        </mesh>
        {/* East wall */}
        <mesh position={[W / 2, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.16, D]} />
          <meshStandardMaterial color={isSelected ? '#4A8AB0' : '#8A7A6A'} />
        </mesh>

        {/* Active device dots */}
        {onDevices.map((d, i) => {
          const angle = (i / Math.max(onDevices.length, 1)) * Math.PI * 2;
          const r = Math.min(W, D) * 0.18;
          const dotColor = d.type === 'light' ? '#FFD54F' : d.type === 'fan' ? '#81D4FA' : d.type === 'ac' ? '#80DEEA' : d.type === 'tv' ? '#CE93D8' : '#A5D6A7';
          return (
            <group key={d.id} position={[Math.cos(angle) * r, 0.06, Math.sin(angle) * r]}>
              <mesh>
                <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
                <meshBasicMaterial color={dotColor} />
              </mesh>
            </group>
          );
        })}

        {/* Room label */}
        {showLabel && (
          <Html position={[0, 0.5, 0]} center distanceFactor={16} zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: isSelected ? 'rgba(10,30,55,0.9)' : 'rgba(8,18,32,0.75)',
              backdropFilter: 'blur(6px)',
              borderRadius: 8,
              padding: '4px 10px 3px',
              boxShadow: isSelected ? '0 0 0 1.5px rgba(100,180,255,0.5)' : '0 0 0 1px rgba(255,255,255,0.08)',
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              <div style={{ fontWeight: 700, color: isSelected ? '#90CAF9' : '#CBD8E8', fontSize: 12 }}>{icon} {name}</div>
              <div style={{ color: activeCount > 0 ? '#5BC8A8' : '#4A6070', fontSize: 10, marginTop: 1 }}>
                {activeCount > 0 ? `● ${activeCount} on` : '○ all off'}
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  }

  return (
    <group position={[cx, 0, cz]}>
      <mesh
        position={[0, FLOOR_THICK / 2, 0]}
        receiveShadow
        onClick={handleRoomClick}
        onPointerDown={isDesignMode ? handleFloorPointerDown : undefined}
        onPointerMove={isDesignMode ? handleFloorPointerMove : undefined}
        onPointerUp={isDesignMode ? handleFloorPointerUp : undefined}
        castShadow
      >
        <boxGeometry args={[W, FLOOR_THICK, D]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.8}
          metalness={0}
          emissive={isDragging ? '#3A8AFF' : selectionEmissive}
          emissiveIntensity={isDragging ? 0.35 : selectionIntensity}
        />
      </mesh>

      {/* Drag border highlight */}
      {isDragging && (
        <mesh position={[0, FLOOR_THICK / 2 + 0.01, 0]}>
          <boxGeometry args={[W + 0.12, 0.02, D + 0.12]} />
          <meshBasicMaterial color="#3A8AFF" transparent opacity={0.7} />
        </mesh>
      )}

      <FloorPattern W={W} D={D} style={floorStyle} />

      <RoomWalls room={room} allRooms={allRooms} W={W} D={D} floorY={FLOOR_THICK} isDark={isDarkMode} />

      {isSelected && isDesignMode && (
        <mesh position={[0, CUT_H / 2, 0]}>
          <boxGeometry args={[W + 0.15, CUT_H + 0.1, D + 0.15]} />
          <meshBasicMaterial color="#A89880" wireframe transparent opacity={0.6} />
        </mesh>
      )}

      {showLabel && (
        <Html
          position={[0, 3.8, 0]}
          center
          distanceFactor={18}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            data-tour="room-label"
            style={{
              background: isSelected
                ? 'rgba(10,20,35,0.82)'
                : 'rgba(8,14,24,0.62)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '5px 11px 4px',
              boxShadow: isSelected
                ? '0 0 0 1.5px rgba(100,180,255,0.45), 0 4px 18px rgba(0,0,0,0.5)'
                : '0 0 0 1px rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.35)',
              fontSize: 11,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              lineHeight: 1.4,
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              fontWeight: 700,
              fontSize: 12,
              color: isSelected ? '#E8F4FF' : '#CBD8E8',
              letterSpacing: '0.01em',
            }}>
              {icon} {name}
            </div>
            <div style={{
              color: activeCount > 0 ? '#5BC8A8' : '#607080',
              fontSize: 10,
              marginTop: 1,
              fontWeight: 500,
            }}>
              {activeCount > 0
                ? `● ${activeCount} on`
                : '○ all off'}
            </div>
          </div>
        </Html>
      )}

      <Furniture3D roomType={room.id} roomName={name} roomSize={size} floorColor={floorColor} />

      {devices.map(device => {
        const dPos: [number, number, number] = [
          device.position.x,
          device.position.y,
          device.position.z,
        ];
        const dRotY = device.rotation?.y ?? 0;
        const isDeviceSelected = selectedDeviceId === device.id;
        const watts = computeDeviceWatts(device);
        const commonProps = {
          device,
          position: dPos,
          isSelected: isDeviceSelected,
          showAura: showEnergyAura && device.isOn,
          watts,
          onClick: () => !isDesignMode && onDeviceClick?.(device.id, room.id, room.name),
        };

        switch (device.type) {
          case 'light':
            return <Light3D key={device.id} {...commonProps} rotationY={dRotY} />;
          case 'fan':
            return <Fan3D key={device.id} {...commonProps} rotationY={dRotY} />;
          case 'ac':
            return <AC3D key={device.id} {...commonProps} rotationY={dRotY} />;
          case 'tv':
            return <TV3D key={device.id} {...commonProps} rotationY={dRotY} isDarkMode={isDarkMode} />;
          case 'geyser':
            return <Geyser3D key={device.id} {...commonProps} rotationY={dRotY} />;
          case 'plug':
            return <SmartPlug3D key={device.id} {...commonProps} rotationY={dRotY} />;
          case 'exhaust':
            return <ExhaustFan3D key={device.id} {...commonProps} rotationY={dRotY} />;
          default:
            return null;
        }
      })}

      {/* Dark mode device glow lights (Feature 6) */}
      {isDarkMode && devices.map(device => {
        if (!device.isOn) return null;
        const glow = DEVICE_GLOW[device.type];
        if (!glow) return null;
        return (
          <pointLight
            key={`glow-${device.id}`}
            color={glow.color}
            intensity={glow.intensity}
            distance={glow.distance}
            position={[device.position.x, device.position.y - 0.5, device.position.z]}
          />
        );
      })}
    </group>
  );
}
