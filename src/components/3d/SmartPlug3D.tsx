// SmartPlug3D.tsx — Smart plug with LED indicator
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface SmartPlug3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function SmartPlug3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: SmartPlug3DProps) {
  const ledRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isOn = device.isOn;

  useFrame(() => {
    if (!ledRef.current || !isOn) return;
    const mat = ledRef.current.material as import('three').MeshStandardMaterial;
    mat.emissiveIntensity = 0.8 + 0.5 * Math.sin(Date.now() * 0.008);
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
        castShadow
      >
        <boxGeometry args={[0.22, 0.22, 0.1]} />
        <meshStandardMaterial
          color={isOn ? '#F5F5F5' : '#757575'}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <mesh ref={ledRef} position={[0, 0.06, 0.052]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color={isOn ? '#4CAF50' : '#424242'}
          emissive={isOn ? '#66BB6A' : '#111111'}
          emissiveIntensity={isOn ? 1.2 : 0}
        />
      </mesh>

      {[-0.04, 0.04].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.052]}>
          <boxGeometry args={[0.02, 0.04, 0.01]} />
          <meshStandardMaterial color={isOn ? '#2E7D32' : '#3A3A3A'} />
        </mesh>
      ))}

      {isSelected && (
        <mesh>
          <boxGeometry args={[0.32, 0.32, 0.18]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.18} />
      {showAura && <EnergyAura watts={watts} radius={0.22} />}
    </group>
  );
}
