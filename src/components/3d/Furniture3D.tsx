// Furniture3D.tsx — Detailed architectural furniture models
interface FurnitureProps {
  roomType: number;
  roomName?: string;
  roomSize: { width: number; depth: number };
  floorColor: string;
}

const FABRIC = '#7B8FA1';
const WOOD = '#A0785A';
const WOOD_DARK = '#5C4033';
const WOOD_BED = '#8B6914';
const CREAM = '#F5F0E8';
const WHITE = '#F5F5F5';

function Sofa({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[2.2, 0.4, 0.9]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[0, 0.55, -0.38]} castShadow>
        <boxGeometry args={[2.2, 0.5, 0.15]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      <mesh position={[-1.08, 0.35, 0]} castShadow>
        <boxGeometry args={[0.15, 0.3, 0.9]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      <mesh position={[1.08, 0.35, 0]} castShadow>
        <boxGeometry args={[0.15, 0.3, 0.9]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 0.32, 0.05]} castShadow>
          <boxGeometry args={[0.6, 0.12, 0.7]} />
          <meshStandardMaterial color="#8A9AAD" roughness={0.9} />
        </mesh>
      ))}
      {[
        [-1, 0.075, 0.35],
        [1, 0.075, 0.35],
        [-1, 0.075, -0.35],
        [1, 0.075, -0.35],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.05]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Bed({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[1.8, 0.25, 2.2]} />
        <meshStandardMaterial color={WOOD_BED} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <boxGeometry args={[1.65, 0.2, 1.9]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, -1.05]} castShadow>
        <boxGeometry args={[1.8, 0.6, 0.1]} />
        <meshStandardMaterial color={WOOD_BED} roughness={0.85} />
      </mesh>
      <mesh position={[-0.45, 0.52, -0.7]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.4]} />
        <meshStandardMaterial color={WHITE} roughness={0.95} />
      </mesh>
      <mesh position={[0.45, 0.52, -0.7]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.4]} />
        <meshStandardMaterial color={WHITE} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.49, 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.08, 1.2]} />
        <meshStandardMaterial color="#C4956A" roughness={0.9} />
      </mesh>
      {[
        [-0.75, 0.06, -0.95],
        [0.75, 0.06, -0.95],
        [-0.75, 0.06, 0.95],
        [0.75, 0.06, 0.95],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, 0.12, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
    </group>
  );
}

function Wardrobe({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.4, 2.0, 0.5]} />
        <meshStandardMaterial color="#C4A882" roughness={0.85} />
      </mesh>
      <mesh position={[-0.34, 1.0, 0.26]} castShadow>
        <boxGeometry args={[0.65, 1.85, 0.04]} />
        <meshStandardMaterial color="#D4BC98" roughness={0.85} />
      </mesh>
      <mesh position={[0.34, 1.0, 0.26]} castShadow>
        <boxGeometry args={[0.65, 1.85, 0.04]} />
        <meshStandardMaterial color="#D4BC98" roughness={0.85} />
      </mesh>
      <mesh position={[-0.34, 1.0, 0.28]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#8B7355" metalness={0.3} />
      </mesh>
      <mesh position={[0.34, 1.0, 0.28]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#8B7355" metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <boxGeometry args={[1.42, 0.1, 0.52]} />
        <meshStandardMaterial color="#B89A72" roughness={0.85} />
      </mesh>
    </group>
  );
}

function TVUnit({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.6, 0.4, 0.35]} />
        <meshStandardMaterial color="#3D3D3D" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.85, 0.02]} castShadow>
        <boxGeometry args={[1.4, 0.8, 0.04]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.1, 0.05, 0.1]} />
        <meshStandardMaterial color="#2A2A2A" />
      </mesh>
    </group>
  );
}

function CoffeeTable() {
  return (
    <mesh position={[0, 0.22, 0]} castShadow>
      <boxGeometry args={[1.0, 0.05, 0.55]} />
      <meshStandardMaterial color={WOOD} roughness={0.75} />
    </mesh>
  );
}

function DiningSet({ x, z }: { x: number; z: number }) {
  const chairOffsets: [number, number][] = [
    [-0.55, -0.5],
    [0.55, -0.5],
    [-0.55, 0.5],
    [0.55, 0.5],
  ];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.73, 0]} castShadow>
        <boxGeometry args={[1.4, 0.05, 0.8]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {[
        [-0.6, 0.35, -0.3],
        [0.6, 0.35, -0.3],
        [-0.6, 0.35, 0.3],
        [0.6, 0.35, 0.3],
      ].map((p, i) => (
        <mesh key={`leg-${i}`} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      {chairOffsets.map(([cx, cz], i) => (
        <group key={i} position={[cx, 0, cz]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <boxGeometry args={[0.4, 0.05, 0.4]} />
            <meshStandardMaterial color={WOOD} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.5, -0.18]} castShadow>
            <boxGeometry args={[0.4, 0.4, 0.04]} />
            <meshStandardMaterial color={WOOD} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function KitchenCounter({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <mesh position={[-W / 2 + 0.55, 0.425, -D / 2 + 1.2]} castShadow>
        <boxGeometry args={[1.0, 0.85, 2.0]} />
        <meshStandardMaterial color="#E8E8D8" roughness={0.8} />
      </mesh>
      <mesh position={[-W / 2 + 0.55, 0.875, -D / 2 + 1.2]}>
        <boxGeometry args={[1.05, 0.05, 2.05]} />
        <meshStandardMaterial color={WHITE} roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh position={[-W / 2 + 0.55, 0.9, -D / 2 + 0.5]}>
        <boxGeometry args={[0.35, 0.04, 0.35]} />
        <meshStandardMaterial color="#C8C8C0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.425, -D / 2 + 0.35]} castShadow>
        <boxGeometry args={[W - 1.2, 0.85, 0.55]} />
        <meshStandardMaterial color="#E8E8D8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.875, -D / 2 + 0.35]}>
        <boxGeometry args={[W - 1.1, 0.05, 0.6]} />
        <meshStandardMaterial color={WHITE} roughness={0.4} />
      </mesh>
    </group>
  );
}

function BathroomFixtures({ W, D }: { W: number; D: number }) {
  return (
    <group>
      <group position={[W / 2 - 0.5, 0, 0.5]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.35, 0.35, 0.45]} />
          <meshStandardMaterial color={WHITE} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.42, -0.15]} castShadow>
          <boxGeometry args={[0.3, 0.25, 0.2]} />
          <meshStandardMaterial color={WHITE} roughness={0.5} />
        </mesh>
      </group>
      <group position={[-W / 2 + 0.6, 0, -0.3]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[1.5, 0.4, 0.75]} />
          <meshStandardMaterial color={WHITE} roughness={0.35} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[1.55, 0.06, 0.8]} />
          <meshStandardMaterial color="#E8E8E8" roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, 0.45, D / 2 - 0.5]} castShadow>
        <boxGeometry args={[0.6, 0.85, 0.4]} />
        <meshStandardMaterial color="#E8E8E0" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── clampToRoom utility ──────────────────────────────────────────────────
const clampToRoom = (val: number, half: number, margin = 0.3) =>
  Math.min(half - margin, Math.max(-(half - margin), val));

function resolveCategory(roomType: number, roomName?: string): string {
  const n = (roomName ?? '').toLowerCase();
  if (n.includes('bath')) return 'bathroom';
  if (n.includes('kitchen')) return 'kitchen';
  if (n.includes('living') || n.includes('hall')) return 'living';
  if (n.includes('bed')) return 'bedroom';
  switch (roomType) {
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

export default function Furniture3D({ roomType, roomName, roomSize }: FurnitureProps) {
  const W = roomSize.width;
  const D = roomSize.depth;
  const hw = W / 2;
  const hd = D / 2;
  const cat = resolveCategory(roomType, roomName);

  switch (cat) {
    case 'bedroom': {
      const bedX = clampToRoom(0, hw);
      const bedZ = clampToRoom(-hd + 1.4, hd);
      const wardX = clampToRoom(hw - 0.75, hw);
      const wardZ = clampToRoom(0, hd);
      const deskX = clampToRoom(-hw + 1.0, hw);
      const deskZ = clampToRoom(hd - 0.5, hd);
      const chairX = clampToRoom(-hw + 1.0, hw);
      const chairZ = clampToRoom(hd - 1.15, hd);
      const bsX = clampToRoom(-hw + 0.7, hw);
      const bsZ = clampToRoom(-hd + 0.2, hd);
      const plantX = clampToRoom(hw - 0.35, hw);
      const plantZ = clampToRoom(hd - 0.35, hd);
      const lampX = clampToRoom(-hw + 0.35, hw);
      const lampZ = clampToRoom(hd - 0.35, hd);
      return (
        <group>
          <Bed x={bedX} z={bedZ} />
          <Wardrobe x={wardX} z={wardZ} />
          <StudyDesk x={deskX} z={deskZ} W={1.2} />
          <DeskChair x={chairX} z={chairZ} />
          <Bookshelf x={bsX} z={bsZ} h={1.5} />
          <PottedPlant x={plantX} z={plantZ} />
          <FloorLamp x={lampX} z={lampZ} />
        </group>
      );
    }
    case 'living': {
      const sofaZ = clampToRoom(hd - 1.1, hd);
      const plantX1 = clampToRoom(hw - 0.3, hw);
      const plantZ1 = clampToRoom(hd - 0.4, hd);
      const plantX2 = clampToRoom(-hw + 0.3, hw);
      const lampX = clampToRoom(hw - 0.35, hw);
      const lampZ = clampToRoom(-hd + 0.35, hd);
      const bsX = clampToRoom(-hw + 0.7, hw);
      const bsZ = clampToRoom(-hd + 0.2, hd);
      return (
        <group>
          <Sofa z={sofaZ} />
          <CoffeeTable />
          <PottedPlant x={plantX1} z={plantZ1} />
          <PottedPlant x={plantX2} z={plantZ1} />
          <FloorLamp x={lampX} z={lampZ} />
          <Bookshelf x={bsX} z={bsZ} h={1.6} />
        </group>
      );
    }
    case 'kitchen': {
      const diningX = clampToRoom(hw - 1.6, hw);
      const diningZ = clampToRoom(0, hd);
      const fridgeX = clampToRoom(-hw + 0.42, hw);
      const fridgeZ = clampToRoom(-hd + 0.36, hd);
      const plantX = clampToRoom(hw - 0.25, hw);
      const plantZ = clampToRoom(hd - 0.3, hd);
      return (
        <group>
          <KitchenCounter W={W} D={D} />
          <DiningSet x={diningX} z={diningZ} />
          <Refrigerator x={fridgeX} z={fridgeZ} />
          <PottedPlant x={plantX} z={plantZ} />
        </group>
      );
    }
    case 'bathroom': {
      return (
        <group>
          <BathroomFixtures W={W} D={D} />
          <WashingMachine
            x={clampToRoom(hw - 0.38, hw)}
            z={clampToRoom(-hd + 0.38, hd)}
          />
        </group>
      );
    }
    default: {
      const deskX = clampToRoom(0, hw);
      const deskZ = clampToRoom(0, hd);
      const chairZ = clampToRoom(0.75, hd);
      const plantX = clampToRoom(hw - 0.35, hw);
      const plantZ = clampToRoom(-hd + 0.35, hd);
      return (
        <group>
          <StudyDesk x={deskX} z={deskZ} W={1.4} />
          <DeskChair x={deskX} z={chairZ} />
          <PottedPlant x={plantX} z={plantZ} />
        </group>
      );
    }
  }
}

// ── Additional furniture & electrical prop components ────────────────────

export function Laptop({ x, z, y = 0.76 }: { x: number; z: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.015, 0.28]} />
        <meshStandardMaterial color="#2A2A2A" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.14, -0.13]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <boxGeometry args={[0.4, 0.27, 0.01]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.145, -0.125]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.36, 0.23, 0.005]} />
        <meshStandardMaterial color="#0A1A3A" emissive="#1040A0" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function DeskChair({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.55, 0.06, 0.52]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.82, -0.24]} castShadow>
        <boxGeometry args={[0.52, 0.58, 0.06]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 5]} />
        <meshStandardMaterial color="#333" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

export function Bookshelf({ x, z, h = 1.8 }: { x: number; z: number; h?: number }) {
  const BOOK_COLORS = ['#C0392B', '#2980B9', '#27AE60', '#F39C12', '#8E44AD', '#16A085'];
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[1.2, h, 0.3]} />
        <meshStandardMaterial color="#8B6914" roughness={0.85} />
      </mesh>
      {[0.25, 0.6, 0.95, 1.3].map((sy, si) =>
        BOOK_COLORS.map((c, bi) => (
          <mesh key={`b-${si}-${bi}`} position={[-0.48 + bi * 0.16, sy, 0.01]} castShadow>
            <boxGeometry args={[0.12, 0.22, 0.28]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function PottedPlant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.28, 8]} />
        <meshStandardMaterial color="#D84315" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 7]} />
        <meshStandardMaterial color="#388E3C" roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 0.52, 0.08]} castShadow>
        <sphereGeometry args={[0.14, 8, 7]} />
        <meshStandardMaterial color="#43A047" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function Refrigerator({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.75, 1.8, 0.65]} />
        <meshStandardMaterial color="#EEEEEE" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.4, 0.33]}>
        <boxGeometry args={[0.65, 0.8, 0.01]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.33]}>
        <boxGeometry args={[0.65, 0.75, 0.01]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0.28, 1.4, 0.34]}>
        <boxGeometry args={[0.06, 0.35, 0.04]} />
        <meshStandardMaterial color="#BDBDBD" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.28, 0.5, 0.34]}>
        <boxGeometry args={[0.06, 0.28, 0.04]} />
        <meshStandardMaterial color="#BDBDBD" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  );
}

export function WashingMachine({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.9, 0.6]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.42, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#90CAF9" roughness={0.1} metalness={0.3} transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.1, 0.78, 0.31]}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 8]} />
        <meshStandardMaterial color="#2196F3" emissive="#2196F3" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export function StudyDesk({ x, z, W = 1.5 }: { x: number; z: number; W?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[W, 0.04, 0.65]} />
        <meshStandardMaterial color="#A0785A" roughness={0.8} />
      </mesh>
      {[[-W / 2 + 0.05, -0.3], [W / 2 - 0.05, -0.3]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx as number, 0.375, lz as number]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <meshStandardMaterial color="#8B6914" roughness={0.85} />
        </mesh>
      ))}
      <Laptop x={-0.2} z={0} y={0.78} />
    </group>
  );
}

export function FloorLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.8, 6]} />
        <meshStandardMaterial color="#616161" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <coneGeometry args={[0.22, 0.3, 12, 1, true]} />
        <meshStandardMaterial color="#FFF9C4" roughness={0.7} side={2} />
      </mesh>
      <pointLight position={[x, 1.75, z]} intensity={0.6} color="#FFF3D0" distance={5} />
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 8]} />
        <meshStandardMaterial color="#424242" roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  );
}
