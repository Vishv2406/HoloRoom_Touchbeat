// EnergyAura.tsx — Subtle energy consumption ring
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface EnergyAuraProps {
  watts: number;
  radius: number;
}

function getAuraColor(watts: number): string {
  if (watts <= 0) return '#4CAF50';
  if (watts <= 100) return '#4CAF50';
  if (watts <= 500) return '#FFC107';
  return '#F44336';
}

export default function EnergyAura({ watts, radius }: EnergyAuraProps) {
  const meshRef = useRef<Mesh>(null);
  const color = getAuraColor(watts);
  const inner = radius * 0.55;
  const outer = radius * 0.7;

  useFrame(() => {
    if (!meshRef.current) return;
    const pulse = 0.95 + 0.05 * Math.sin(Date.now() * 0.004);
    meshRef.current.scale.setScalar(pulse);
  });

  if (watts <= 0) return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <ringGeometry args={[inner, outer, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}
