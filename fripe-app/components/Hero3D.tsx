'use client';

// Scène 3D du haut de page : trois cartes de l'appli (rendez-vous, facture, chiffres du mois) et une pièce,
// qui flottent et suivent doucement la souris. Les visuels des cartes sont dessinés sur un canvas 2D (aucune ressource externe).
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number, font: string) => void;
const INK = '#121212', MUTED = '#6b675f', GREEN = '#0e7c5a', MINT = '#dcf1e7', BG = '#f5f2ec';

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function pill(c: CanvasRenderingContext2D, x: number, y: number, text: string, font: string, bg = MINT, fg = GREEN) {
  c.font = `600 34px ${font}`; const w = c.measureText(text).width + 52;
  c.fillStyle = bg; roundRect(c, x, y, w, 64, 32); c.fill();
  c.fillStyle = fg; c.fillText(text, x + 26, y + 44); return w;
}

const drawBooking: Draw = (c, w, h, f) => {
  c.fillStyle = MUTED; c.font = `500 30px ${f}`; c.fillText('Rendez-vous confirmé', 60, 92);
  c.fillStyle = MINT; c.beginPath(); c.arc(105, 200, 46, 0, Math.PI * 2); c.fill();
  c.fillStyle = GREEN; c.font = `700 40px ${f}`; c.textAlign = 'center'; c.fillText('L', 105, 214); c.textAlign = 'left';
  c.fillStyle = INK; c.font = `600 44px ${f}`; c.fillText('Léa Martin', 180, 190);
  c.fillStyle = MUTED; c.font = `400 32px ${f}`; c.fillText('Pose gel · samedi 14:00', 180, 236);
  c.strokeStyle = 'rgba(18,18,18,.08)'; c.lineWidth = 3; c.beginPath(); c.moveTo(60, 300); c.lineTo(w - 60, 300); c.stroke();
  pill(c, 60, 336, '✓ Acompte payé · 15 €', f);
  c.fillStyle = MUTED; c.font = `400 30px ${f}`; c.fillText('Rappel envoyé la veille', 60, h - 56);
};
const drawInvoice: Draw = (c, w, h, f) => {
  c.fillStyle = INK; c.font = `600 40px ${f}`; c.fillText('Facture', 60, 96);
  c.fillStyle = MUTED; c.font = `400 30px ${f}`; c.fillText('N° 2026-042', w - 250, 96);
  const rows: [string, string][] = [['Pose gel', '45,00 €'], ['Acompte reçu', '− 15,00 €'], ['Solde réglé', '30,00 €']];
  rows.forEach(([a, b], i) => {
    const y = 190 + i * 70; c.fillStyle = i === 2 ? INK : MUTED; c.font = `${i === 2 ? 600 : 400} 34px ${f}`;
    c.fillText(a, 60, y); c.textAlign = 'right'; c.fillText(b, w - 60, y); c.textAlign = 'left';
  });
  pill(c, 60, h - 120, 'Envoyée automatiquement', f, INK, '#ffffff');
};
const drawMonth: Draw = (c, w, h, f) => {
  c.fillStyle = MUTED; c.font = `500 30px ${f}`; c.fillText('Ce mois-ci', 60, 92);
  c.fillStyle = INK; c.font = `600 104px ${f}`; c.fillText('2 340 €', 56, 210);
  c.fillStyle = GREEN; c.font = `600 32px ${f}`; c.fillText('▲ 18 % vs octobre', 60, 262);
  // petite courbe
  const pts = [0.62, 0.55, 0.58, 0.45, 0.48, 0.34, 0.3, 0.2];
  c.strokeStyle = GREEN; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath();
  pts.forEach((p, i) => { const x = 60 + (i * (w - 120)) / (pts.length - 1), y = 300 + p * 130; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
  c.fillStyle = BG; roundRect(c, 60, h - 130, w - 120, 84, 22); c.fill();
  c.fillStyle = MUTED; c.font = `400 30px ${f}`; c.fillText('Bénéfice', 92, h - 76);
  c.fillStyle = INK; c.font = `600 34px ${f}`; c.textAlign = 'right'; c.fillText('1 612 €', w - 92, h - 76); c.textAlign = 'left';
};

function useCardTexture(draw: Draw, w: number, h: number, ready: boolean) {
  return useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d')!;
    const font = getComputedStyle(document.body).fontFamily || 'system-ui';
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    draw(c, w, h, font);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, [draw, w, h, ready]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Card({ draw, size, position, rotation, ready, speed = 1 }: { draw: Draw; size: [number, number]; position: [number, number, number]; rotation: [number, number, number]; ready: boolean; speed?: number }) {
  const [w, h] = size, tex = useCardTexture(draw, Math.round(w * 340), Math.round(h * 340), ready);
  return (
    <Float speed={speed} rotationIntensity={0.25} floatIntensity={0.6} floatingRange={[-0.08, 0.08]}>
      <group position={position} rotation={rotation}>
        <RoundedBox args={[w, h, 0.09]} radius={0.12} smoothness={6} castShadow>
          <meshPhysicalMaterial color="#ffffff" roughness={0.42} clearcoat={0.6} clearcoatRoughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0465]}>
          <planeGeometry args={[w - 0.12, h - 0.12]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </Float>
  );
}

function Coin() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.9; });
  return (
    <Float speed={1.4} floatIntensity={0.9} rotationIntensity={0.2}>
      <group ref={ref} position={[1.95, 1.55, 0.6]} rotation={[Math.PI / 2.4, 0, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.1, 64]} />
          <meshPhysicalMaterial color="#13a374" metalness={0.55} roughness={0.25} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.0515, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.31, 64]} />
          <meshBasicMaterial color="#dcf1e7" />
        </mesh>
      </group>
    </Float>
  );
}

// la scène entière s'incline vers la souris (ou le doigt), avec inertie
function Rig({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null), { pointer } = useThree();
  useFrame(() => {
    if (!g.current) return;
    g.current.rotation.y += (pointer.x * 0.28 - g.current.rotation.y) * 0.05;
    g.current.rotation.x += (-pointer.y * 0.16 - g.current.rotation.x) * 0.05;
  });
  return <group ref={g}>{children}</group>;
}

export default function Hero3D() {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false), [visible, setVisible] = useState(true), [small, setSmall] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setReady(true));
    setSmall(window.innerWidth < 600);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  const s = small ? 0.78 : 1;
  return (
    <div className="stage" ref={box} aria-hidden="true">
      <div className="halo" />
      {/* zone de dessin plus grande que la colonne, pour que les cartes ne soient jamais coupées */}
      {ready && (<div className="stage-gl">
        <Canvas frameloop={visible ? 'always' : 'never'} dpr={[1, 1.75]} camera={{ position: [0, 0, 10.5], fov: 34 }} gl={{ antialias: true, alpha: true }} shadows>
          <ambientLight intensity={1.1} />
          <directionalLight position={[4, 6, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-5, -2, 3]} intensity={0.5} color="#dcf1e7" />
          <Rig>
            <group scale={s}>
              <Card draw={drawMonth} size={[2.5, 2.05]} position={[1.05, 0.45, -0.7]} rotation={[0.04, -0.32, 0.05]} ready={ready} speed={0.9} />
              <Card draw={drawInvoice} size={[2.4, 1.75]} position={[-1.25, 0.75, -0.2]} rotation={[0.08, 0.28, -0.06]} ready={ready} speed={1.1} />
              <Card draw={drawBooking} size={[2.75, 1.7]} position={[-0.25, -1.05, 0.55]} rotation={[-0.06, 0.12, 0.03]} ready={ready} speed={1.3} />
              <Coin />
            </group>
          </Rig>
        </Canvas>
      </div>)}
    </div>
  );
}
