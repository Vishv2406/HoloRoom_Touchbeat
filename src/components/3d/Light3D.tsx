// Light3D.tsx — Ceiling light with dramatic on/off visual difference
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface Light3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function Light3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: Light3DProps) {
  const bulbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const floorGlowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const brightness = (device.brightness ?? 100) / 100;
  const colorTemp = device.colorTemp ?? 4000;
  const warmFactor = Math.max(0, Math.min(1, (6500 - colorTemp) / (6500 - 2700)));
  const bulbColor = warmFactor > 0.5 ? '#FFD54F' : '#FFFDE7';
  const lightColor = warmFactor > 0.5 ? '#FFB300' : '#FFE57F';
  const glowColor = warmFactor > 0.5 ? '#FF8F00' : '#FFD740';
  const isOn = device.isOn;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = isOn ? 0.88 + 0.12 * Math.sin(t * 3.5) : 0;

    if (bulbRef.current) {
      const mat = bulbRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? 4.5 * brightness * pulse : 0;
      mat.color.set(isOn ? bulbColor : '#555555');
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(isOn ? (1.0 + 0.08 * Math.sin(t * 4)) * brightness : 0.01);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isOn ? 0.35 * brightness * pulse : 0;
    }
    if (coneRef.current) {
      coneRef.current.visible = isOn;
      if (isOn) {
        coneRef.current.scale.set(1, 0.9 + 0.1 * Math.sin(t * 3), 1);
        const mat = coneRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.28 * brightness;
      }
    }
    if (floorGlowRef.current) {
      floorGlowRef.current.visible = isOn;
      if (isOn) {
        const mat = floorGlowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.18 * brightness * pulse;
      }
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Mount rod */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.44, 10]} />
        <meshStandardMaterial color="#7A7068" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Ceiling canopy */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
        <meshStandardMaterial color="#C8BAA8" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Shade / reflector housing — angled outward for realism */}
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.22, 0.18, 24]} />
        <meshStandardMaterial
          color={isOn ? '#FFF8E6' : '#A0A0A0'}
          emissive={isOn ? glowColor : '#000000'}
          emissiveIntensity={isOn ? 0.6 * brightness : 0}
          roughness={0.3}
          metalness={0.15}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Inner reflector (bright when on) */}
      <mesh position={[0, -0.07, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.19, 0.16, 24]} />
        <meshStandardMaterial
          color={isOn ? bulbColor : '#888888'}
          emissive={isOn ? lightColor : '#000000'}
          emissiveIntensity={isOn ? 3.5 * brightness : 0}
          roughness={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Bulb */}
      <mesh
        ref={bulbRef}
        position={[0, -0.12, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.12 : 1}
        castShadow
      >
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial
          color={isOn ? bulbColor : '#555555'}
          emissive={isOn ? lightColor : '#111111'}
          emissiveIntensity={isOn ? 4.5 * brightness : 0}
          roughness={0.05}
          toneMapped={false}
        />
      </mesh>

      {/* Glow halo around bulb */}
      <mesh ref={glowRef} position={[0, -0.12, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial
          color={lightColor}
          transparent
          opacity={isOn ? 0.35 : 0}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Light cone beam */}
      <mesh ref={coneRef} position={[0, -0.65, 0]} rotation={[Math.PI, 0, 0]} visible={isOn}>
        <coneGeometry args={[0.75, 1.3, 28, 1, true]} />
        <meshBasicMaterial
          color={lightColor}
          transparent
          opacity={0.28 * brightness}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Secondary wider softer cone */}
      {isOn && (
        <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[1.1, 1.6, 24, 1, true]} />
          <meshBasicMaterial
            color={lightColor}
            transparent
            opacity={0.09 * brightness}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Floor glow pool */}
      <mesh ref={floorGlowRef} position={[0, -2.9, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={isOn}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial
          color={lightColor}
          transparent
          opacity={0.18 * brightness}
          depthWrite={false}
        />
      </mesh>

      {/* Actual point light — strong and warm */}
      {isOn && (
        <pointLight
          color={lightColor}
          intensity={8 * brightness}
          distance={12}
          decay={2}
          position={[0, -0.2, 0]}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
      )}

      {/* OFF indicator */}
      {!isOn && (
        <mesh position={[0.12, -0.05, 0.12]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#EF5350" emissive="#C62828" emissiveIntensity={0.5} />
        </mesh>
      )}

      {isSelected && (
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.26, 10, 10]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.32} />
      {showAura && <EnergyAura watts={watts} radius={0.42} />}
    </group>
  );
}
