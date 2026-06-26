// DeviceStatusRing.tsx — On/off status ring (always visible, prominent)
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DeviceStatusRingProps {
  isOn: boolean;
  radius?: number;
}

export default function DeviceStatusRing({ isOn, radius = 0.22 }: DeviceStatusRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const inner = radius * 0.72;
  const outer = radius;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = isOn ? 0.9 + 0.1 * Math.sin(clock.getElapsedTime() * 5) : 1;
    meshRef.current.scale.set(pulse, pulse, 1);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = isOn ? 0.85 + 0.15 * Math.sin(clock.getElapsedTime() * 5) : 0.5;
  });

  return (
    <group position={[0, 0.025, 0]}>
      {/* Outer glow ring */}
      {isOn && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[outer * 0.95, outer * 1.22, 32]} />
          <meshBasicMaterial color="#66BB6A" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      {/* Main ring */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[inner, outer, 32]} />
        <meshBasicMaterial
          color={isOn ? '#4CAF50' : '#616161'}
          transparent
          opacity={isOn ? 0.9 : 0.5}
        />
      </mesh>
    </group>
  );
}
