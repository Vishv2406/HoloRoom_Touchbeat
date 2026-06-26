// Fan3D.tsx — Ceiling fan — aesthetic, clear on/off state
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface Fan3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function Fan3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: Fan3DProps) {
  const bladesRef = useRef<THREE.Group>(null);
  const hubRef = useRef<THREE.Mesh>(null);
  const airGlowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const speedRef = useRef(0);
  const isOn = device.isOn;
  const targetSpeed = isOn ? (device.speed ?? 3) * 0.03 : 0;

  useFrame(({ clock }) => {
    speedRef.current += (targetSpeed - speedRef.current) * 0.07;
    if (bladesRef.current) bladesRef.current.rotation.y += speedRef.current;

    if (hubRef.current) {
      const mat = hubRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? 0.4 + 0.2 * Math.sin(clock.getElapsedTime() * 8) : 0;
    }
    if (airGlowRef.current) {
      const mat = airGlowRef.current.material as THREE.MeshBasicMaterial;
      const speed = Math.abs(speedRef.current);
      mat.opacity = speed * 4;
      airGlowRef.current.scale.setScalar(1 + speed * 5);
    }
  });

  const bladeAngles = [0, 1, 2, 3].map(i => (i / 4) * Math.PI * 2);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Drop rod — two-tone metallic */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.022, 0.018, 0.48, 12]} />
        <meshStandardMaterial color="#8C8680" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ceiling canopy */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 20]} />
        <meshStandardMaterial color="#C8BAA8" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Motor housing — rounder, more realistic */}
      <mesh
        ref={hubRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        position={[0, -0.06, 0]}
        scale={hovered ? 1.05 : 1}
        castShadow
      >
        <cylinderGeometry args={[0.13, 0.13, 0.14, 24]} />
        <meshStandardMaterial
          color={isOn ? '#D4A860' : '#8A8A8A'}
          emissive={isOn ? '#B8860B' : '#000000'}
          emissiveIntensity={0}
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>

      {/* Hub bottom cap */}
      <mesh position={[0, -0.13, 0]}>
        <sphereGeometry args={[0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={isOn ? '#C89040' : '#707070'}
          metalness={0.45}
          roughness={0.4}
        />
      </mesh>

      {/* Speed LED ring */}
      {isOn && (
        <mesh position={[0, -0.065, 0]}>
          <torusGeometry args={[0.1, 0.008, 8, 24]} />
          <meshBasicMaterial color="#4FC3F7" />
        </mesh>
      )}

      {/* Blades — wider, more natural wood look */}
      <group ref={bladesRef} position={[0, -0.065, 0]}>
        {bladeAngles.map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            {/* Blade arm */}
            <mesh position={[0.16, 0, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.22, 0.02, 0.04]} />
              <meshStandardMaterial color="#6D5A40" roughness={0.8} metalness={0.1} />
            </mesh>
            {/* Blade paddle */}
            <mesh position={[0.42, -0.01, 0]} rotation={[0.05, 0, 0]}>
              <boxGeometry args={[0.62, 0.025, 0.16]} />
              <meshStandardMaterial
                color={isOn ? '#C4935A' : '#8A7A6A'}
                roughness={0.75}
                metalness={0}
              />
            </mesh>
            {/* Blade underside stripe */}
            <mesh position={[0.42, -0.024, 0]} rotation={[0.05, 0, 0]}>
              <boxGeometry args={[0.6, 0.005, 0.12]} />
              <meshStandardMaterial color="#A07840" roughness={0.85} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Air movement glow when running */}
      <mesh ref={airGlowRef} position={[0, -0.35, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.45, 0.6, 20, 1, true]} />
        <meshBasicMaterial color="#B3E5FC" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Downward breeze lines when on */}
      {isOn && [0, 1, 2].map(i => (
        <mesh key={i} position={[Math.cos(i * 2.1) * 0.18, -0.4 - i * 0.12, Math.sin(i * 2.1) * 0.18]}>
          <cylinderGeometry args={[0.006, 0.002, 0.1, 6]} />
          <meshBasicMaterial color="#81D4FA" transparent opacity={0.4 - i * 0.1} />
        </mesh>
      ))}

      {isSelected && (
        <mesh position={[0, -0.065, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.16, 20]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.45} />
      {showAura && <EnergyAura watts={watts} radius={0.65} />}
    </group>
  );
}
