import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface DiceSpawnAnimationProps {
    diceCount: number;
    diceRolls: number[];
    onComplete: (spawnedCount: number) => void;
}

const Die = ({ position, roll, delay, onLand }: { position: [number, number, number], roll: number, delay: number, onLand: () => void }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const [landed, setLanded] = useState(false);
    const startTime = useMemo(() => Date.now() + delay, [delay]);

    const targetRotation = useMemo(() => {
        // Determine rotation to make the 'roll' face point UP (+Y)
        // Face 1: Top. Target: (0, 0, 0)
        // Face 2: Front. Target: (-PI/2, 0, 0) -> Rotates X so Front becomes Top
        // Face 3: Right. Target: (0, 0, PI/2) -> Rotates Z so Right becomes Top
        // Face 4: Back. Target: (PI/2, 0, 0) -> Rotates X so Back becomes Top
        // Face 5: Left. Target: (0, 0, -PI/2) -> Rotates Z so Left becomes Top
        // Face 6: Bottom. Target: (PI, 0, 0) -> Rotates X so Bottom becomes Top
        // Add random Y rotation for variety
        const yRand = Math.random() * Math.PI * 2;

        switch (roll) {
            case 1: return new THREE.Euler(0, yRand, 0);
            case 2: return new THREE.Euler(-Math.PI / 2, yRand, 0);
            case 3: return new THREE.Euler(0, yRand, Math.PI / 2);
            case 4: return new THREE.Euler(Math.PI / 2, yRand, 0);
            case 5: return new THREE.Euler(0, yRand, -Math.PI / 2);
            case 6: return new THREE.Euler(Math.PI, yRand, 0);
            default: return new THREE.Euler(0, yRand, 0);
        }
    }, [roll]);

    useFrame(() => {
        if (!mesh.current) return;

        const now = Date.now();
        if (now < startTime) return; // Waiting for delay

        const elapsed = (now - startTime) / 1000;
        const duration = 1.5; // Fall duration

        if (elapsed < duration) {
            // Falling phase
            const progress = elapsed / duration;
            // Ease out bounce? Or just linear fall + bounce logic manually
            // Simple parabolic fall: y = startY - 0.5 * g * t^2
            // Let's just lerp for simplicity and control

            // Position
            const startY = 10;
            const endY = 0.5; // Half size of cube (size 1)
            // Bounce effect
            let y = THREE.MathUtils.lerp(startY, endY, progress * progress); // Accelerate down

            if (progress > 0.8) {
                // Small bounce at the end
                const bounceProgress = (progress - 0.8) / 0.2;
                y = endY + Math.sin(bounceProgress * Math.PI) * 0.5;
            }

            mesh.current.position.set(position[0], y, position[2]);

            // Rotation: Spin wildly, lerping to target
            if (progress < 0.8) {
                mesh.current.rotation.x += 0.2;
                mesh.current.rotation.z += 0.2;
                mesh.current.rotation.y += 0.2;
            } else {
                // Snap to target in last 20%
                const finalProgress = (progress - 0.8) / 0.2;
                mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x % (Math.PI * 2), targetRotation.x, finalProgress);
                mesh.current.rotation.z = THREE.MathUtils.lerp(mesh.current.rotation.z % (Math.PI * 2), targetRotation.z, finalProgress);
                mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y % (Math.PI * 2), targetRotation.y, finalProgress);
            }

        } else {
            // Landed
            if (!landed) {
                setLanded(true);
                mesh.current.position.y = 0.5;
                mesh.current.rotation.copy(targetRotation);
                onLand();
            }
        }
    });

    const FaceText = ({ val, ...props }: { val: number } & any) => (
        <group {...props}>
            <Text fontSize={0.5} color="black" anchorX="center" anchorY="middle">
                {val}
            </Text>
        </group>
    );

    return (
        <mesh ref={mesh} position={[position[0], 10, position[2]]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#dddddd" roughness={0.5} metalness={0.1} />

            {/* Face 1 (Top) */}
            <FaceText val={1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.51, 0]} />
            {/* Face 2 (Front) */}
            <FaceText val={2} position={[0, 0, 0.51]} />
            {/* Face 3 (Right) */}
            <FaceText val={3} rotation={[0, Math.PI / 2, 0]} position={[0.51, 0, 0]} />
            {/* Face 4 (Back) */}
            <FaceText val={4} rotation={[0, Math.PI, 0]} position={[0, 0, -0.51]} />
            {/* Face 5 (Left) */}
            <FaceText val={5} rotation={[0, -Math.PI / 2, 0]} position={[-0.51, 0, 0]} />
            {/* Face 6 (Bottom) */}
            <FaceText val={6} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} />
        </mesh>
    );
};

export const DiceSpawnAnimation: React.FC<DiceSpawnAnimationProps> = ({
    diceCount,
    diceRolls,
    onComplete
}) => {
    const [landedCount, setLandedCount] = useState(0);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        if (landedCount === diceCount && !finished) {
            setFinished(true);
            // Auto-close removed in favor of button
        }
    }, [landedCount, diceCount, finished]);

    // Calculate positions for dice
    const positions = useMemo(() => {
        const pos: [number, number, number][] = [];
        const cols = Math.ceil(Math.sqrt(diceCount));
        const spacing = 1.5;

        for (let i = 0; i < diceCount; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            // Center the grid
            const x = (col - (cols - 1) / 2) * spacing;
            const z = (row - (Math.ceil(diceCount / cols) - 1) / 2) * spacing;
            pos.push([x, 0, z]);
        }
        return pos;
    }, [diceCount]);

    const totalSum = diceRolls.reduce((a, b) => a + b, 0);
    const enemiesSpawned = Math.floor(totalSum / 5);

    return (
        <div className="fixed inset-0 z-50 bg-stone-950/95 flex items-center justify-center">
            <div className="absolute top-10 text-center z-10 w-full animate-in fade-in slide-in-from-top duration-700">
                <h2 className="text-3xl font-bold text-red-500 tracking-widest uppercase drop-shadow-lg">
                    Fate Check
                </h2>
                <p className="text-stone-400 mt-2 font-mono">Rolling {diceCount} Dice...</p>
            </div>

            <Canvas camera={{ position: [0, 12, 8], fov: 45 }}>
                {/* Improved Lighting */}
                <ambientLight intensity={0.7} />
                <hemisphereLight intensity={0.5} groundColor="#000000" />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, 10, -10]} intensity={1} />
                <spotLight position={[0, 15, 0]} angle={0.6} penumbra={1} intensity={2} castShadow />

                {/* Floor */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <planeGeometry args={[50, 50]} />
                    <meshStandardMaterial color="#a2a2a2" roughness={0.8} metalness={0.2} />
                </mesh>

                {diceRolls.map((roll, i) => (
                    <Die
                        key={i}
                        position={positions[i]}
                        roll={roll}
                        delay={i * 200} // Staggered drop
                        onLand={() => setLandedCount(prev => prev + 1)}
                    />
                ))}
            </Canvas>

            {finished && (
                <div className="absolute bottom-20 text-center z-10 w-full animate-in fade-in slide-in-from-bottom duration-500 flex flex-col items-center gap-4">
                    <div className="text-2xl font-bold text-stone-200 flex flex-col gap-2">
                        <div className="text-amber-400">Total: {totalSum}</div>
                        {enemiesSpawned > 0
                            ? <span className="text-red-500 drop-shadow-md">{enemiesSpawned} Enemies Spawned!</span>
                            : <span className="text-green-500 drop-shadow-md">Safe (Total &lt; 5)</span>}
                    </div>

                    <button
                        onClick={() => onComplete(enemiesSpawned)}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-8 py-3 rounded-lg font-bold border border-stone-600 transition-colors shadow-lg"
                    >
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
};
