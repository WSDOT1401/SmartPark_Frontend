import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Box(props) {
  return (
    <mesh {...props}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function App() {
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Box position={[0, 0.5, 0]} />
      <gridHelper args={[10, 10]} />
      <OrbitControls />
    </Canvas>
  );
}
