import { api } from "@GroupScape/backend/convex/_generated/api";
import { OrbitControls, PerspectiveCamera, useCursor } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useAction } from "convex/react";
import {
	Suspense,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import type { BufferGeometry } from "three";
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { Button } from "./ui/button";

interface HeadshotSelectorProps {
	username: string;
	onComplete: (imageData: string) => void;
}

interface SceneHandle {
	capture: () => string | null;
}

const PLAYER_MODEL_SCALE = 2;
const PET_MODEL_SCALE = 1.5;
const MODEL_ROTATION = new THREE.Euler(-1.55, 0, 0.1);

function decodeBase64ToBytes(base64Data: string): Uint8Array {
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

function normalizeGeometry(geometry: BufferGeometry, scaleTarget: number) {
	const positionAttribute = geometry.attributes.position;
	if (!positionAttribute) {
		throw new Error("PLY geometry missing position attribute");
	}

	geometry.computeVertexNormals();

	const box = new THREE.Box3().setFromBufferAttribute(
		positionAttribute as THREE.BufferAttribute,
	);
	const center = box.getCenter(new THREE.Vector3());
	const size = box.getSize(new THREE.Vector3());
	const maxDim = Math.max(size.x, size.y, size.z);
	const scale = maxDim > 0 ? scaleTarget / maxDim : 1;

	geometry.translate(-center.x, -center.y, -center.z);
	geometry.scale(scale, scale, scale);
	geometry.applyQuaternion(new THREE.Quaternion().setFromEuler(MODEL_ROTATION));
}

function usePlyGeometry(base64Data: string | null, scaleTarget: number) {
	const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
	const geometryRef = useRef<BufferGeometry | null>(null);

	useEffect(() => {
		if (!base64Data) {
			setGeometry((previous) => {
				previous?.dispose();
				geometryRef.current = null;
				return null;
			});
			return;
		}

		try {
			const loader = new PLYLoader();
			const bytes = decodeBase64ToBytes(base64Data);
			const geometryBuffer = bytes.buffer.slice(
				bytes.byteOffset,
				bytes.byteOffset + bytes.byteLength,
			) as ArrayBuffer;
			const loadedGeometry = loader.parse(geometryBuffer);
			normalizeGeometry(loadedGeometry, scaleTarget);
			setGeometry((previous) => {
				if (previous && previous !== loadedGeometry) {
					previous.dispose();
				}
				geometryRef.current = loadedGeometry;
				return loadedGeometry;
			});
		} catch (error) {
			console.error("Error loading PLY geometry:", error);
			setGeometry((previous) => {
				previous?.dispose();
				geometryRef.current = null;
				return null;
			});
		}
	}, [base64Data, scaleTarget]);

	useEffect(() => {
		return () => {
			geometryRef.current?.dispose();
			geometryRef.current = null;
		};
	}, []);

	return geometry;
}

function Model({ base64Data }: { base64Data: string }) {
	const geometry = usePlyGeometry(base64Data, PLAYER_MODEL_SCALE);

	if (!geometry) {
		return null;
	}

	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial
				vertexColors
				side={THREE.DoubleSide}
				flatShading={false}
			/>
		</mesh>
	);
}

function PetModel({
	base64Data,
	position,
	onPositionCommit,
	onDragChange,
}: {
	base64Data: string;
	position: [number, number, number];
	onPositionCommit: (position: [number, number, number]) => void;
	onDragChange: (isDragging: boolean) => void;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const geometry = usePlyGeometry(base64Data, PET_MODEL_SCALE);
	const [hovered, setHovered] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
	const mouse = useRef<THREE.Vector2>(new THREE.Vector2());
	const positionRef = useRef<[number, number, number]>(position);
	const { camera, gl } = useThree();

	useCursor(hovered || isDragging);

	useEffect(() => {
		positionRef.current = position;
		if (meshRef.current) {
			meshRef.current.position.set(...position);
		}
	}, [position]);

	const stopDragging = useCallback(() => {
		if (!isDragging) {
			return;
		}
		setIsDragging(false);
		onDragChange(false);
		gl.domElement.style.cursor = "";
		onPositionCommit(positionRef.current);
	}, [gl, isDragging, onDragChange, onPositionCommit]);

	const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
		e.stopPropagation();
		setIsDragging(true);
		onDragChange(true);
		gl.domElement.style.cursor = "grabbing";
	};

	useFrame((state) => {
		if (!isDragging || !meshRef.current) {
			return;
		}

		mouse.current.set(state.pointer.x, state.pointer.y);
		raycaster.current.setFromCamera(mouse.current, camera);

		const plane = new THREE.Plane(
			new THREE.Vector3(0, 1, 0),
			-positionRef.current[1],
		);
		const intersection = new THREE.Vector3();
		const hasIntersection = raycaster.current.ray.intersectPlane(
			plane,
			intersection,
		);
		if (!hasIntersection) {
			return;
		}

		const nextPosition: [number, number, number] = [
			intersection.x,
			positionRef.current[1],
			intersection.z,
		];
		positionRef.current = nextPosition;
		meshRef.current.position.set(...nextPosition);
	});

	useEffect(() => stopDragging, [stopDragging]);

	if (!geometry) {
		return null;
	}

	return (
		<mesh
			ref={meshRef}
			geometry={geometry}
			onPointerOver={() => setHovered(true)}
			onPointerOut={() => {
				setHovered(false);
				stopDragging();
			}}
			onPointerDown={handlePointerDown}
			onPointerUp={stopDragging}
			onPointerCancel={stopDragging}
			onPointerMissed={stopDragging}
			onPointerMove={(e) => {
				if (isDragging) {
					e.stopPropagation();
				}
			}}
		>
			<meshStandardMaterial
				vertexColors
				side={THREE.DoubleSide}
				flatShading={false}
				emissive={hovered || isDragging ? "#ffffff" : "#000000"}
				emissiveIntensity={hovered || isDragging ? 0.3 : 0}
			/>
		</mesh>
	);
}

const Scene = ({
	base64Data,
	petBase64Data,
	captureRef,
}: {
	base64Data: string;
	petBase64Data: string | null;
	captureRef: React.RefObject<SceneHandle | null>;
}) => {
	const [petPosition, setPetPosition] = useState<[number, number, number]>([
		0, 0, -2.5,
	]);
	const [isPetDragging, setIsPetDragging] = useState(false);
	const cameraRef = useRef<THREE.PerspectiveCamera>(null);
	const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
	const { gl, scene } = useThree();

	useImperativeHandle(
		captureRef,
		() => ({
			capture: () => {
				if (!cameraRef.current) {
					return null;
				}

				gl.render(scene, cameraRef.current);

				const canvas = gl.domElement;
				if (!canvas) {
					return null;
				}

				const displayWidth = canvas.clientWidth;
				if (!displayWidth) {
					return null;
				}
				const pixelRatio = canvas.width / displayWidth;

				const viewfinderSizeCss = 256;
				const viewfinderSize = viewfinderSizeCss * pixelRatio;

				const centerX = canvas.width / 2;
				const centerY = canvas.height / 2;
				const halfSize = viewfinderSize / 2;

				const croppedCanvas = document.createElement("canvas");
				croppedCanvas.width = viewfinderSizeCss;
				croppedCanvas.height = viewfinderSizeCss;
				const context = croppedCanvas.getContext("2d");
				if (!context) {
					return null;
				}

				const sourceX = centerX - halfSize;
				const sourceY = centerY - halfSize;

				context.drawImage(
					canvas,
					sourceX,
					sourceY,
					viewfinderSize,
					viewfinderSize,
					0,
					0,
					viewfinderSizeCss,
					viewfinderSizeCss,
				);

				return croppedCanvas.toDataURL("image/png");
			},
		}),
		[gl, scene],
	);

	const handlePetPositionCommit = useCallback(
		(nextPosition: [number, number, number]) => {
			setPetPosition(nextPosition);
		},
		[],
	);

	return (
		<>
			<PerspectiveCamera
				ref={cameraRef}
				makeDefault
				position={[0, 0, 5]}
				fov={50}
			/>
			<ambientLight intensity={0.8} />
			<hemisphereLight intensity={0.6} />
			<directionalLight position={[5, 5, 5]} intensity={1.2} />
			<directionalLight position={[-5, 3, 3]} intensity={0.6} />
			<directionalLight position={[0, 5, -5]} intensity={0.4} />
			<directionalLight position={[0, 10, 0]} intensity={0.5} />
			<OrbitControls
				ref={controlsRef}
				enableDamping
				dampingFactor={0.05}
				minDistance={2}
				maxDistance={10}
				enabled={!isPetDragging}
				mouseButtons={{
					LEFT: THREE.MOUSE.PAN,
					MIDDLE: THREE.MOUSE.DOLLY,
					RIGHT: THREE.MOUSE.ROTATE,
				}}
			/>
			<Model base64Data={base64Data} />
			{petBase64Data ? (
				<PetModel
					base64Data={petBase64Data}
					position={petPosition}
					onPositionCommit={handlePetPositionCommit}
					onDragChange={setIsPetDragging}
				/>
			) : null}
		</>
	);
};

export default function HeadshotSelector({
	username,
	onComplete,
}: HeadshotSelectorProps) {
	const getModel = useAction(api.player.getModelFromRuneProfile);
	const [modelData, setModelData] = useState<string | null>(null);
	const [petModelData, setPetModelData] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isCapturing, setIsCapturing] = useState(false);
	const captureRef = useRef<SceneHandle>(null);
	const activeRequestRef = useRef(0);
	const captureAnimationFrameRef = useRef<number | null>(null);

	useEffect(() => {
		const requestId = activeRequestRef.current + 1;
		activeRequestRef.current = requestId;
		setLoading(true);
		setError(null);
		setModelData(null);
		setPetModelData(null);

		void getModel({ username })
			.then((data) => {
				if (activeRequestRef.current !== requestId) {
					return;
				}

				if (!data.playerModelBase64) {
					setError("No player model found for that username");
					setLoading(false);
					return;
				}

				setModelData(data.playerModelBase64);
				setPetModelData(data.petModelBase64 || null);
				setLoading(false);
			})
			.catch((modelError) => {
				if (activeRequestRef.current !== requestId) {
					return;
				}
				setError(modelError instanceof Error ? modelError.message : "Failed to load model");
				setLoading(false);
			});
	}, [username, getModel]);

	useEffect(() => {
		return () => {
			if (captureAnimationFrameRef.current !== null) {
				cancelAnimationFrame(captureAnimationFrameRef.current);
			}
		};
	}, []);

	const handleCapture = () => {
		setIsCapturing(true);
		captureAnimationFrameRef.current = requestAnimationFrame(() => {
			captureAnimationFrameRef.current = requestAnimationFrame(() => {
				const imageData = captureRef.current?.capture();
				setIsCapturing(false);
				captureAnimationFrameRef.current = null;
				if (imageData) {
					onComplete(imageData);
				}
			});
		});
	};

	if (loading) {
		return (
			<div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
				<div className="text-center">
					<div className="mb-2 text-muted-foreground text-sm">
						Loading model...
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-[600px] items-center justify-center rounded-lg border bg-muted">
				<div className="text-center">
					<div className="mb-2 text-red-500 text-sm">Error: {error}</div>
				</div>
			</div>
		);
	}

	if (!modelData) {
		return null;
	}

	return (
		<div className="relative w-full">
			<div className="relative h-[600px] w-full overflow-hidden rounded-lg border bg-black">
				<Canvas className="h-full w-full">
					<Suspense fallback={null}>
						<Scene
							base64Data={modelData}
							petBase64Data={petModelData}
							captureRef={captureRef}
						/>
					</Suspense>
				</Canvas>

				<div
					className={`pointer-events-none absolute inset-0 flex items-center justify-center ${isCapturing ? "hidden" : ""}`}
				>
					<div className="relative">
						<div className="h-64 w-64 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
						<div className="-left-2 -top-2 absolute h-6 w-6 border-white border-t-2 border-l-2" />
						<div className="-right-2 -top-2 absolute h-6 w-6 border-white border-t-2 border-r-2" />
						<div className="-bottom-2 -left-2 absolute h-6 w-6 border-white border-b-2 border-l-2" />
						<div className="-bottom-2 -right-2 absolute h-6 w-6 border-white border-r-2 border-b-2" />
					</div>
				</div>

				<div
					className={`-translate-x-1/2 absolute bottom-4 left-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white ${isCapturing ? "hidden" : ""}`}
				>
					Left drag to pan • Right drag to rotate • Scroll to zoom • Click
					capture when ready
				</div>
			</div>

			<div className="mt-4 flex justify-center">
				<Button onClick={handleCapture} size="lg">
					Capture Headshot
				</Button>
			</div>
		</div>
	);
}
