"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useWindowActivity } from "@/lib/window-activity";

/** Frames per second while the window is visible but unfocused. */
const BACKGROUND_FPS = 10;

const PETAL_PINKS = ["#ffe4ec", "#f7c4d4", "#f4a8be", "#ffd0de", "#f9b8c9", "#fff0f5"];
const WOOD = ["#5c4538", "#6b5344", "#7a5f4d", "#8a6b55"];

function clampScore(score: number) {
  return Math.min(1, Math.max(0, score));
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function petalCount(score: number) {
  return Math.round(28 + score * 110);
}

function fallCount(score: number) {
  return Math.round(8 + score * 36);
}

function branchScale(score: number) {
  return 0.62 + score * 0.55;
}

type BranchDesc = {
  position: [number, number, number];
  rotation: [number, number, number];
  radiusTop: number;
  radiusBottom: number;
  length: number;
  color: string;
};

function buildBranches(score: number): BranchDesc[] {
  const branches: BranchDesc[] = [];

  // Trunk — grows upward from the ground.
  branches.push({
    position: [0, 0, 0],
    rotation: [0.03, 0.1, 0.02],
    radiusTop: 0.06,
    radiusBottom: 0.13,
    length: 1.55,
    color: WOOD[0],
  });

  type Tip = {
    x: number;
    y: number;
    z: number;
    yaw: number;
  };
  const tips: Tip[] = [];

  const primary = 5 + Math.round(score * 3);
  for (let i = 0; i < primary; i += 1) {
    const t = 0.45 + (i / primary) * 0.5;
    const yaw = (i / primary) * Math.PI * 2 + hash(i + 2) * 0.55;
    const lean = (0.65 + hash(i + 9) * 0.5) * (i % 2 === 0 ? 1 : -1);
    const length = 0.55 + hash(i + 4) * 0.38 + score * 0.22;
    const y = t * 1.45;
    const side = 0.02 + t * 0.04;

    branches.push({
      position: [Math.cos(yaw) * side, y, Math.sin(yaw) * side],
      rotation: [0.25 + hash(i) * 0.35, yaw, lean],
      radiusTop: 0.016,
      radiusBottom: 0.036 - t * 0.008,
      length,
      color: WOOD[1 + (i % 2)],
    });

    tips.push({
      x: Math.cos(yaw) * (side + Math.sin(Math.abs(lean)) * length * 0.55),
      y: y + Math.cos(0.4) * length * 0.75,
      z: Math.sin(yaw) * (side + Math.sin(Math.abs(lean)) * length * 0.5),
      yaw,
    });
  }

  const secondary = 7 + Math.round(score * 8);
  for (let i = 0; i < secondary; i += 1) {
    const parent = tips[i % tips.length];
    if (!parent) continue;
    const yaw = parent.yaw + (hash(i + 21) - 0.5) * 1.6;
    const lean = (hash(i + 33) - 0.5) * 1.4;
    const length = 0.26 + hash(i + 17) * 0.3 + score * 0.14;
    branches.push({
      position: [
        parent.x + (hash(i) - 0.5) * 0.06,
        parent.y + (hash(i + 1) - 0.35) * 0.08,
        parent.z + (hash(i + 2) - 0.5) * 0.06,
      ],
      rotation: [0.2 + hash(i + 6) * 0.5, yaw, lean],
      radiusTop: 0.007,
      radiusBottom: 0.018,
      length,
      color: WOOD[2 + (i % 2)],
    });
  }

  return branches;
}

function Branches({ score }: { score: number }) {
  const branches = useMemo(() => buildBranches(score), [score]);
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.035;
    group.current.rotation.z = Math.sin(t * 0.09) * 0.015;
  });

  return (
    <group ref={group}>
      {branches.map((branch, index) => (
        <group key={index} position={branch.position} rotation={branch.rotation}>
          <mesh position={[0, branch.length / 2, 0]}>
            <cylinderGeometry
              args={[branch.radiusTop, branch.radiusBottom, branch.length, 7]}
            />
            <meshStandardMaterial
              color={branch.color}
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Instance tints never change once the mesh is built, so paint them once
 * instead of re-parsing every hex string and re-uploading the colour buffer on
 * every frame.
 */
function useStaticInstanceColors(
  mesh: React.RefObject<THREE.InstancedMesh | null>,
  tints: string[],
) {
  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const color = new THREE.Color();
    for (let index = 0; index < tints.length; index += 1) {
      color.set(tints[index]);
      instanced.setColorAt(index, color);
    }
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [mesh, tints]);
}

function Canopy({ score }: { score: number }) {
  const count = petalCount(score);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const layer = index % 5;
      const angle =
        (index * 2.399) + hash(index + 3) * 0.35;
      const radius =
        0.2 +
        (index % 11) * 0.055 +
        score * 0.42 +
        layer * 0.04 +
        hash(index) * 0.12;
      const height =
        1.25 +
        (index % 7) * 0.11 +
        score * 0.75 +
        Math.sin(angle * 2) * 0.12 +
        layer * 0.05;
      return {
        base: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius * 0.82,
        ),
        phase: hash(index + 8) * Math.PI * 2,
        spin: 0.4 + hash(index + 11) * 0.8,
        size: 0.05 + (index % 4) * 0.018 + score * 0.035 + hash(index) * 0.02,
        pink: PETAL_PINKS[index % PETAL_PINKS.length],
      };
    });
  }, [count, score]);

  const tints = useMemo(() => positions.map((petal) => petal.pink), [positions]);
  useStaticInstanceColors(mesh, tints);

  useFrame((state) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = state.clock.elapsedTime;
    for (let index = 0; index < positions.length; index += 1) {
      const petal = positions[index];
      const breeze = Math.sin(t * 0.55 + petal.phase) * 0.045;
      const lift = Math.cos(t * 0.7 + petal.phase * 1.3) * 0.05;
      dummy.position.set(
        petal.base.x + breeze,
        petal.base.y + lift,
        petal.base.z + Math.sin(t * 0.4 + petal.phase) * 0.03,
      );
      dummy.rotation.set(
        t * 0.15 * petal.spin + petal.phase,
        t * 0.22 * petal.spin,
        Math.sin(t * 0.5 + petal.phase) * 0.4,
      );
      dummy.scale.set(petal.size, petal.size * 0.32, petal.size * 0.72);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial
        roughness={0.35}
        metalness={0.05}
        emissive="#f3a9bc"
        emissiveIntensity={0.08 + score * 0.22}
      />
    </instancedMesh>
  );
}

function BloomCloud({ score }: { score: number }) {
  const clusters = useMemo(() => {
    const n = 4 + Math.round(score * 5);
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2 + 0.2;
      const radius = 0.15 + score * 0.25 + hash(i + 40) * 0.2;
      return {
        position: [
          Math.cos(angle) * radius,
          1.55 + score * 0.55 + hash(i) * 0.2,
          Math.sin(angle) * radius * 0.75,
        ] as [number, number, number],
        scale: 0.35 + score * 0.35 + hash(i + 7) * 0.2,
        opacity: 0.1 + score * 0.16,
        color: PETAL_PINKS[(i + 2) % PETAL_PINKS.length],
      };
    });
  }, [score]);

  // Guard *after* the hooks — an early return above would change hook order the
  // moment the score crossed the threshold.
  if (score < 0.12) return null;

  return (
    <group>
      {clusters.map((cluster, index) => (
        <mesh key={index} position={cluster.position} scale={cluster.scale}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial
            color={cluster.color}
            transparent
            opacity={cluster.opacity}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FallingPetals({ score }: { score: number }) {
  const count = fallCount(score);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      x: (hash(index + 50) - 0.5) * 2.8,
      z: (hash(index + 60) - 0.5) * 2.2,
      startY: 1.8 + hash(index + 70) * 1.6,
      speed: 0.18 + hash(index + 80) * 0.28,
      sway: 0.12 + hash(index + 90) * 0.2,
      phase: hash(index + 100) * Math.PI * 2,
      size: 0.04 + hash(index + 110) * 0.035,
      pink: PETAL_PINKS[index % PETAL_PINKS.length],
    }));
  }, [count]);

  const tints = useMemo(() => seeds.map((seed) => seed.pink), [seeds]);
  useStaticInstanceColors(mesh, tints);

  useFrame((state) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = state.clock.elapsedTime;
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      const fall = (t * seed.speed + seed.phase) % 1.15;
      const y = seed.startY - fall * 3.2;
      dummy.position.set(
        seed.x + Math.sin(t * 0.7 + seed.phase) * seed.sway,
        y,
        seed.z + Math.cos(t * 0.5 + seed.phase) * seed.sway * 0.6,
      );
      dummy.rotation.set(
        t * 1.1 + seed.phase,
        t * 0.8,
        Math.sin(t + seed.phase) * 2,
      );
      dummy.scale.set(seed.size, seed.size * 0.28, seed.size * 0.7);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  });

  if (score < 0.08) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshStandardMaterial
        roughness={0.4}
        transparent
        opacity={0.85}
        depthWrite={false}
        emissive="#f7c4d4"
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  );
}

function Ground() {
  return (
    <group position={[0, -1.12, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial
          color="#e4d6c8"
          roughness={1}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.1, 48]} />
        <meshStandardMaterial
          color="#d9c4b4"
          roughness={1}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Tree({ score }: { score: number }) {
  const scale = branchScale(score);

  return (
    <group scale={[scale, scale, scale]} position={[0, -1.15, 0]}>
      <Branches score={score} />
      <Canopy score={score} />
      <BloomCloud score={score} />
    </group>
  );
}

/**
 * In `demand` mode R3F only renders when something asks it to, so pump it at a
 * low fixed rate to keep the tree drifting without holding a 60fps GPU loop
 * open behind whatever the user is actually working in.
 */
function LowPowerTicker({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
    const id = window.setInterval(invalidate, 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);

  return null;
}

function Scene({ score }: { score: number }) {
  return (
    <>
      <hemisphereLight args={["#ffe8f0", "#e8ddd2", 0.7]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 7, 3]}
        intensity={1.15}
        color="#fff6ea"
      />
      <directionalLight
        position={[-4, 3, -2]}
        intensity={0.35}
        color="#ffc0d4"
      />
      <pointLight position={[0, 2.4, 1]} intensity={0.35} color="#ffd6e4" />
      <Float speed={1.05} rotationIntensity={0.06} floatIntensity={0.18}>
        <Tree score={score} />
      </Float>
      <FallingPetals score={score} />
      <Ground />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.1}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate
        autoRotateSpeed={0.28}
      />
    </>
  );
}

export function SakuraScene({ score }: { score: number }) {
  const clamped = clampScore(score);
  const activity = useWindowActivity();

  // Tray/minimised stops the loop dead; unfocused drops to a trickle.
  const frameloop =
    activity === "hidden" ? "never" : activity === "background" ? "demand" : "always";

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0.15, 1.35, 4.35], fov: 40 }}
        dpr={[1, 1.5]}
        frameloop={frameloop}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Scene score={clamped} />
        {frameloop === "demand" ? <LowPowerTicker fps={BACKGROUND_FPS} /> : null}
      </Canvas>
    </div>
  );
}
