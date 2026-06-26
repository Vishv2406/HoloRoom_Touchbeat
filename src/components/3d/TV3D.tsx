// TV3D.tsx — Television with vivid on/off screen contrast
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface TV3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
  isDarkMode?: boolean;
}

export default function TV3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0, isDarkMode = false }: TV3DProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isOn = device.isOn;
  const darkGlow = isOn && isDarkMode;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? (darkGlow ? 3.5 : 2.0) + 0.5 * Math.sin(t * 3) : 0;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isOn ? (darkGlow ? 0.4 : 0.22) + 0.06 * Math.sin(t * 2.5) : 0;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* TV frame — slim bezel, premium black */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.02 : 1}
        castShadow
      >
        <boxGeometry args={[1.38, 0.84, 0.07]} />
        <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Screen bezel inner edge */}
      <mesh position={[0, 0, 0.032]}>
        <boxGeometry args={[1.28, 0.74, 0.01]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
      </mesh>

      {/* Screen */}
      <mesh ref={screenRef} position={[0, 0, 0.04]} castShadow>
        <boxGeometry args={[1.24, 0.70, 0.01]} />
        <meshStandardMaterial
          color={isOn ? '#0D47A1' : '#0A0A0A'}
          emissive={isOn ? '#1565C0' : '#050505'}
          emissiveIntensity={isOn ? 2.0 : 0}
          roughness={0.05}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* Screen ambient glow */}
      <mesh ref={glowRef} position={[0, 0, 0.06]}>
        <boxGeometry args={[1.28, 0.74, 0.01]} />
        <meshBasicMaterial
          color="#42A5F5"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Dark mode: rim glow rectangle */}
      {darkGlow && (
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.5, 0.96, 0.01]} />
          <meshBasicMaterial color="#CE93D8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}

      {/* Screen content overlay when on */}
      {isOn && (
        <>
          <mesh position={[0, 0.12, 0.046]}>
            <boxGeometry args={[1.0, 0.04, 0.005]} />
            <meshBasicMaterial color="#1976D2" transparent opacity={0.6} />
          </mesh>
          <mesh position={[-0.25, -0.1, 0.046]}>
            <boxGeometry args={[0.5, 0.25, 0.005]} />
            <meshBasicMaterial color="#0D47A1" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0.3, -0.08, 0.046]}>
            <boxGeometry args={[0.35, 0.18, 0.005]} />
            <meshBasicMaterial color="#1565C0" transparent opacity={0.45} />
          </mesh>
          {/* Backlight bleed */}
          <pointLight color="#2196F3" intensity={darkGlow ? 2.5 : 1.5} distance={darkGlow ? 6 : 5} position={[0, 0, 0.5]} />
        </>
      )}

      {/* Power LED */}
      <mesh position={[0.55, -0.36, 0.038]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial
          color={isOn ? '#4CAF50' : '#F44336'}
          emissive={isOn ? '#66BB6A' : '#E53935'}
          emissiveIntensity={isOn ? 2.0 : 0.4}
        />
      </mesh>

      {/* Stand */}
      <mesh position={[0, -0.46, 0.01]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.24]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.435, 0.01]} castShadow>
        <boxGeometry args={[0.08, 0.05, 0.08]} />
        <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.35} />
      </mesh>

      {isSelected && (
        <mesh>
          <boxGeometry args={[1.48, 0.94, 0.16]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.6} />
      {showAura && <EnergyAura watts={watts} radius={0.95} />}
    </group>
  );
}

