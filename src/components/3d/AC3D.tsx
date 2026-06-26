// AC3D.tsx — Wall AC with strong visual on/off state
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Device } from '../../types';
import EnergyAura from './EnergyAura';
import DeviceStatusRing from './DeviceStatusRing';

interface AC3DProps {
  device: Device;
  position: [number, number, number];
  isSelected: boolean;
  showAura: boolean;
  watts: number;
  rotationY?: number;
  onClick: () => void;
}

export default function AC3D({ device, position, isSelected, showAura, watts, onClick, rotationY = 0 }: AC3DProps) {
  const [hovered, setHovered] = useState(false);
  const ledRef = useRef<THREE.Mesh>(null);
  const displayRef = useRef<THREE.Mesh>(null);
  const airFlowRef = useRef<THREE.Group>(null);
  const isOn = device.isOn;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? 2.5 + 1.0 * Math.sin(t * 6) : 0.2;
    }
    if (displayRef.current) {
      const mat = displayRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isOn ? 1.5 + 0.3 * Math.sin(t * 2) : 0;
    }
    if (airFlowRef.current && isOn) {
      airFlowRef.current.children.forEach((child, i) => {
        child.position.y = -0.28 - ((t * 0.4 + i * 0.15) % 0.5);
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const phase = (t * 0.4 + i * 0.15) % 0.5;
        mat.opacity = 0.3 * (1 - phase * 2);
      });
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Main body */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.04 : 1}
        castShadow
      >
        <boxGeometry args={[1.05, 0.34, 0.2]} />
        <meshStandardMaterial
          color={isOn ? '#F5F5F5' : '#B8BEC2'}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Front panel edge highlight */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[1.03, 0.32, 0.005]} />
        <meshStandardMaterial
          color={isOn ? '#FFFFFF' : '#CDD3D7'}
          emissive={isOn ? '#E3F2FD' : '#000000'}
          emissiveIntensity={isOn ? 0.3 : 0}
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>

      {/* Air vent slats */}
      {[-0.08, 0, 0.08].map((y, i) => (
        <mesh key={i} position={[0, y - 0.04, 0.102]}>
          <boxGeometry args={[0.85, 0.025, 0.012]} />
          <meshStandardMaterial
            color={isOn ? '#90CAF9' : '#78909C'}
            emissive={isOn ? '#42A5F5' : '#000000'}
            emissiveIntensity={isOn ? 0.4 : 0}
          />
        </mesh>
      ))}

      {/* LCD display panel */}
      <mesh ref={displayRef} position={[-0.3, 0.08, 0.103]}>
        <boxGeometry args={[0.26, 0.12, 0.01]} />
        <meshStandardMaterial
          color={isOn ? '#1A237E' : '#37474F'}
          emissive={isOn ? '#3F51B5' : '#000000'}
          emissiveIntensity={0}
          roughness={0.1}
        />
      </mesh>

      {/* Temperature display glow when on */}
      {isOn && (
        <mesh position={[-0.3, 0.08, 0.108]}>
          <boxGeometry args={[0.22, 0.08, 0.005]} />
          <meshBasicMaterial color="#64B5F6" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Status LED */}
      <mesh ref={ledRef} position={[0.42, 0.12, 0.103]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial
          color={isOn ? '#00E676' : '#FF1744'}
          emissive={isOn ? '#00E676' : '#FF1744'}
          emissiveIntensity={isOn ? 2.5 : 0.2}
        />
      </mesh>

      {/* Animated cold air flow */}
      <group ref={airFlowRef} position={[0, 0, 0.12]}>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[0, -0.28 - i * 0.12, 0]}>
            <boxGeometry args={[0.78 - i * 0.08, 0.018, 0.01]} />
            <meshBasicMaterial color="#B3E5FC" transparent opacity={isOn ? 0.3 : 0} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Cold air point light */}
      {isOn && (
        <pointLight color="#81D4FA" intensity={1.0} distance={5} position={[0, -0.5, 0.3]} />
      )}

      {isSelected && (
        <mesh>
          <boxGeometry args={[1.2, 0.48, 0.32]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}

      <DeviceStatusRing isOn={isOn} radius={0.42} />
      {showAura && <EnergyAura watts={watts} radius={0.78} />}
    </group>
  );
}
