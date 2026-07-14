"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function petalCount(score: number) {
  return Math.round(12 + score * 80);
}

function branchScale(score: number) {
  return 0.55 + score * 0.65;
}

function Petals({ score }: { score: number }) {
  const count = petalCount(score);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2;
      const radius = 0.35 + (index % 7) * 0.08 + score * 0.25;
      const height = 1.1 + (index % 5) * 0.18 + score * 0.6;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius * 0.85,
      );
    });
  }, [count, score]);

  useFrame((state) => {
    if (!mesh.current) return;
    positions.forEach((position, index) => {
      const t = state.clock.elapsedTime;
      dummy.position.set(
        position.x + Math.sin(t * 0.6 + index) * 0.03,
        position.y + Math.cos(t * 0.8 + index * 0.4) * 0.04,
        position.z,
      );
      dummy.rotation.set(t * 0.2 + index, t * 0.15, 0);
      const size = 0.08 + (index % 3) * 0.02 + score * 0.04;
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        color="#f7c4d4"
        roughness={0.45}
        emissive="#f3a9bc"
        emissiveIntensity={0.12 + score * 0.25}
      />
    </instancedMesh>
  );
}

function Tree({ score }: { score: number }) {
  const scale = branchScale(score);
  const trunkRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!trunkRef.current) return;
    trunkRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.04;
  });

  return (
    <group scale={[scale, scale, scale]} position={[0, -1.1, 0]}>
      <mesh ref={trunkRef} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.14, 1.4, 10]} />
        <meshStandardMaterial color="#6b5344" roughness={0.9} />
      </mesh>
      <mesh position={[0.25, 1.35, 0]} rotation={[0, 0, -0.7]}>
        <cylinderGeometry args={[0.035, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#705846" roughness={0.9} />
      </mesh>
      <mesh position={[-0.28, 1.4, 0.1]} rotation={[0.2, 0, 0.75]}>
        <cylinderGeometry args={[0.03, 0.045, 0.75, 8]} />
        <meshStandardMaterial color="#705846" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.7, -0.15]} rotation={[0.4, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.55, 8]} />
        <meshStandardMaterial color="#7a5f4d" roughness={0.9} />
      </mesh>
      <Petals score={score} />
      {score > 0.35 ? (
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.55 + score * 0.25, 16, 16]} />
          <meshStandardMaterial
            color="#f8d5e0"
            transparent
            opacity={0.18 + score * 0.25}
            roughness={0.2}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function Scene({ score }: { score: number }) {
  return (
    <>
      <color attach="background" args={["#f7efe8"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 2]} intensity={1.1} color="#fff2e8" />
      <pointLight position={[-3, 2, -2]} intensity={0.4} color="#ffd0de" />
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.25}>
        <Tree score={score} />
      </Float>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.12, 0]}>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color="#e8ddd2" roughness={1} />
      </mesh>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  );
}

export function SakuraScene({ score }: { score: number }) {
  const clamped = Math.min(1, Math.max(0, score));

  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 1.2, 4.2], fov: 42 }} dpr={[1, 1.75]}>
        <Scene score={clamped} />
      </Canvas>
    </div>
  );
}
