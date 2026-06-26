// ExhaustFan3D.tsx — Wall exhaust fan with spinning blades when on
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface ExhaustFan3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function ExhaustFan3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: ExhaustFan3DProps) {
  const bladesRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const speedRef = useRef(0);
  const isOn = device.isOn;

  useFrame(() => {
    const target = isOn ? 0.08 : 0;
    speedRef.current += (target - speedRef.current) * 0.05;
    if (bladesRef.current) bladesRef.current.rotation.z += speedRef.current;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.05 : 1}
      >
        <torusGeometry args={[0.22, 0.04, 8, 32]} />
        <meshStandardMaterial
          color={isOn ? '#E0E0E0' : '#888888'}
          metalness={0.35}
          roughness={0.5}
        />
      </mesh>

      <group ref={bladesRef}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]}>
            <boxGeometry args={[0.32, 0.06, 0.02]} />
            <meshStandardMaterial color={isOn ? '#B0BEC5' : '#666666'} />
          </mesh>
        ))}
      </group>

      {isOn && (
        <mesh position={[0, 0, 0.05]}>
          <circleGeometry args={[0.12, 16]} />
          <meshStandardMaterial color="#81D4FA" transparent opacity={0.3} emissive="#4FC3F7" emissiveIntensity={0.3} />
        </mesh>
      )}

      {isSelected && (
        <mesh>
          <torusGeometry args={[0.28, 0.06, 8, 32]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.28} />
      {showAura && <EnergyAura watts={watts} radius={0.32} />}
    </group>
  );
}
