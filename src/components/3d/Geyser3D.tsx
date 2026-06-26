// Geyser3D.tsx — Water heater with heating glow when on
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface Geyser3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function Geyser3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: Geyser3DProps) {
  const bodyRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isOn = device.isOn;

  useFrame(() => {
    if (!bodyRef.current || !isOn) return;
    const mat = bodyRef.current.material as import('three').MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + 0.35 * Math.sin(Date.now() * 0.005);
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh
        ref={bodyRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.05 : 1}
        castShadow
      >
        <cylinderGeometry args={[0.28, 0.28, 0.65, 16]} />
        <meshStandardMaterial
          color={isOn ? '#E8E0D8' : '#9E9E9E'}
          emissive={isOn ? '#FF6D00' : '#333333'}
          emissiveIntensity={isOn ? 0.65 : 0}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>

      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 0.08, 16]} />
        <meshStandardMaterial color={isOn ? '#FF8F00' : '#666666'} metalness={0.4} />
      </mesh>

      {isOn && (
        <>
          <pointLight color="#FF9800" intensity={0.5} distance={2.5} />
          <mesh position={[0, -0.15, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#FF6D00" transparent opacity={0.25} emissive="#FF6D00" emissiveIntensity={0.8} />
          </mesh>
        </>
      )}

      {isSelected && (
        <mesh>
          <cylinderGeometry args={[0.38, 0.38, 0.8, 16]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.3} />
      {showAura && <EnergyAura watts={watts} radius={0.5} />}
    </group>
  );
}
