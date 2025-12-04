import { api } from "@GroupScape/backend/convex/_generated/api";
import { OrbitControls, PerspectiveCamera, useCursor } from "@react-three/drei";
import {
	Canvas,
	type ThreeEvent,
	useFrame,
	useThree,
} from "@react-three/fiber";
import { useAction } from "convex/react";
import {
	Suspense,
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

function Model({ base64Data }: { base64Data: string }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

	useEffect(() => {
		// Decode base64 PLY data
		const binaryString = atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// Create a blob and load it with PLYLoader
		const blob = new Blob([bytes], { type: "application/octet-stream" });
		const url = URL.createObjectURL(blob);

		const loader = new PLYLoader();
		loader.load(
			url,
			(loadedGeometry: BufferGeometry) => {
				// Center and scale the geometry
				loadedGeometry.computeVertexNormals();
				const box = new THREE.Box3().setFromBufferAttribute(
					loadedGeometry.attributes.position as THREE.BufferAttribute,
				);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());
				const maxDim = Math.max(size.x, size.y, size.z);
				const scale = 2 / maxDim;

				// Center the geometry
				loadedGeometry.translate(-center.x, -center.y, -center.z);
				// Scale to fit in view
				loadedGeometry.scale(scale, scale, scale);

				// Apply initial rotation
				const euler = new THREE.Euler(-1.55, 0, 0.1);
				const quaternion = new THREE.Quaternion().setFromEuler(euler);
				loadedGeometry.applyQuaternion(quaternion);

				setGeometry(loadedGeometry);
				URL.revokeObjectURL(url);
			},
			undefined,
			(error: unknown) => {
				console.error("Error loading PLY:", error);
				URL.revokeObjectURL(url);
			},
		);
	}, [base64Data]);

	if (!geometry) {
		return null;
	}

	return (
		<mesh ref={meshRef} geometry={geometry}>
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
	onPositionChange,
	onDragChange,
}: {
	base64Data: string;
	position: [number, number, number];
	onPositionChange: (position: [number, number, number]) => void;
	onDragChange: (isDragging: boolean) => void;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
	const [hovered, setHovered] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
	const mouse = useRef<THREE.Vector2>(new THREE.Vector2());
	const { camera, gl } = useThree();

	useCursor(hovered || isDragging);

	useEffect(() => {
		if (!base64Data) return;

		// Decode base64 PLY data
		const binaryString = atob(base64Data);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		// Create a blob and load it with PLYLoader
		const blob = new Blob([bytes], { type: "application/octet-stream" });
		const url = URL.createObjectURL(blob);

		const loader = new PLYLoader();
		loader.load(
			url,
			(loadedGeometry: BufferGeometry) => {
				// Center and scale the geometry (smaller scale for pet)
				loadedGeometry.computeVertexNormals();
				const box = new THREE.Box3().setFromBufferAttribute(
					loadedGeometry.attributes.position as THREE.BufferAttribute,
				);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());
				const maxDim = Math.max(size.x, size.y, size.z);
				const scale = 1.5 / maxDim; // Slightly smaller than player

				// Center the geometry
				loadedGeometry.translate(-center.x, -center.y, -center.z);
				// Scale to fit in view
				loadedGeometry.scale(scale, scale, scale);

				// Apply initial rotation (same as player model)
				const euler = new THREE.Euler(-1.55, 0, 0.1);
				const quaternion = new THREE.Quaternion().setFromEuler(euler);
				loadedGeometry.applyQuaternion(quaternion);

				setGeometry(loadedGeometry);
				URL.revokeObjectURL(url);
			},
			undefined,
			(error: unknown) => {
				console.error("Error loading pet PLY:", error);
				URL.revokeObjectURL(url);
			},
		);
	}, [base64Data]);

	const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
		e.stopPropagation();
		setIsDragging(true);
		onDragChange(true);
		gl.domElement.style.cursor = "grabbing";
	};

	const handlePointerUp = () => {
		setIsDragging(false);
		onDragChange(false);
		gl.domElement.style.cursor = "";
	};

	useFrame((state) => {
		if (!isDragging || !meshRef.current) return;

		// Use pointer position directly (already in normalized device coordinates)
		mouse.current.set(state.pointer.x, state.pointer.y);

		// Create ray from camera through mouse position
		raycaster.current.setFromCamera(mouse.current, camera);

		// Intersect with the drag plane (Y = position[1])
		const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position[1]);
		const intersection = new THREE.Vector3();
		raycaster.current.ray.intersectPlane(plane, intersection);

		if (intersection) {
			// Update position (only X and Z, keep Y fixed)
			const newPosition: [number, number, number] = [
				intersection.x,
				position[1],
				intersection.z,
			];
			onPositionChange(newPosition);
			meshRef.current.position.set(...newPosition);
		}
	});

	useEffect(() => {
		if (meshRef.current) {
			meshRef.current.position.set(...position);
		}
	}, [position]);

	if (!geometry) {
		return null;
	}

	return (
		<mesh
			ref={meshRef}
			geometry={geometry}
			position={position}
			onPointerOver={() => setHovered(true)}
			onPointerOut={() => setHovered(false)}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
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

interface SceneHandle {
	capture: () => string | null;
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
	const { gl } = useThree();

	useImperativeHandle(
		captureRef,
		() => ({
			capture: () => {
				if (!cameraRef.current) return null;

				// Get the canvas from the renderer
				const canvas = gl.domElement;
				if (!canvas) return null;

				// Get display size and device pixel ratio
				const displayWidth = canvas.clientWidth;
				const pixelRatio = canvas.width / displayWidth;

				// Viewfinder size in CSS pixels: h-64 w-64 = 256px x 256px
				const viewfinderSizeCSS = 256;
				// Convert to actual canvas pixels
				const viewfinderSize = viewfinderSizeCSS * pixelRatio;

				// Calculate center position in canvas pixels
				const centerX = canvas.width / 2;
				const centerY = canvas.height / 2;
				const halfSize = viewfinderSize / 2;

				// Create a new canvas for the square crop (use CSS size for output)
				const croppedCanvas = document.createElement("canvas");
				croppedCanvas.width = viewfinderSizeCSS;
				croppedCanvas.height = viewfinderSizeCSS;
				const ctx = croppedCanvas.getContext("2d");
				if (!ctx) return null;

				// Draw the source canvas centered in the cropped canvas
				// Calculate source rectangle (centered on canvas, in canvas pixels)
				const sourceX = centerX - halfSize;
				const sourceY = centerY - halfSize;

				ctx.drawImage(
					canvas,
					sourceX,
					sourceY,
					viewfinderSize,
					viewfinderSize,
					0,
					0,
					viewfinderSizeCSS,
					viewfinderSizeCSS,
				);

				// Return the cropped square image
				return croppedCanvas.toDataURL("image/png");
			},
		}),
		[gl],
	);

	return (
		<>
			<PerspectiveCamera
				ref={cameraRef}
				makeDefault
				position={[0, 0, 5]}
				fov={50}
			/>
			{/* Ambient light for base illumination */}
			<ambientLight intensity={0.8} />
			{/* Hemisphere light for natural sky/ground lighting */}
			<hemisphereLight intensity={0.6} />
			{/* Main key light from front-right */}
			<directionalLight position={[5, 5, 5]} intensity={1.2} />
			{/* Fill light from left */}
			<directionalLight position={[-5, 3, 3]} intensity={0.6} />
			{/* Rim light from behind */}
			<directionalLight position={[0, 5, -5]} intensity={0.4} />
			{/* Top light for additional detail */}
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
			{petBase64Data && (
				<PetModel
					base64Data={petBase64Data}
					position={petPosition}
					onPositionChange={setPetPosition}
					onDragChange={setIsPetDragging}
				/>
			)}
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

	useEffect(() => {
		getModel({ username })
			.then((data) => {
				setModelData(data.playerModelBase64);
				setPetModelData(data.petModelBase64 || null);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message || "Failed to load model");
				setLoading(false);
			});
	}, [username, getModel]);

	const handleCapture = () => {
		// Hide overlay temporarily for clean screenshot
		setIsCapturing(true);

		// Wait for the DOM to update and canvas to render without overlay
		setTimeout(() => {
			const imageData = captureRef.current?.capture();
			setIsCapturing(false);
			if (imageData) {
				onComplete(imageData);
			}
		}, 50);
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
				<Canvas gl={{ preserveDrawingBuffer: true }} className="h-full w-full">
					<Suspense fallback={null}>
						<Scene
							base64Data={modelData}
							petBase64Data={petModelData}
							captureRef={captureRef}
						/>
					</Suspense>
				</Canvas>

				{/* Viewfinder overlay */}
				<div
					className={`pointer-events-none absolute inset-0 flex items-center justify-center ${isCapturing ? "hidden" : ""}`}
				>
					<div className="relative">
						{/* Viewfinder frame */}
						<div className="h-64 w-64 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
						{/* Corner indicators */}
						<div className="-left-2 -top-2 absolute h-6 w-6 border-white border-t-2 border-l-2" />
						<div className="-right-2 -top-2 absolute h-6 w-6 border-white border-t-2 border-r-2" />
						<div className="-bottom-2 -left-2 absolute h-6 w-6 border-white border-b-2 border-l-2" />
						<div className="-bottom-2 -right-2 absolute h-6 w-6 border-white border-r-2 border-b-2" />
					</div>
				</div>

				{/* Instructions */}
				<div
					className={`-translate-x-1/2 absolute bottom-4 left-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm text-white ${isCapturing ? "hidden" : ""}`}
				>
					Left drag to pan • Right drag to rotate • Scroll to zoom • Click
					capture when ready
				</div>
			</div>

			{/* Capture button */}
			<div className="mt-4 flex justify-center">
				<Button onClick={handleCapture} size="lg">
					Capture Headshot
				</Button>
			</div>
		</div>
	);
}
