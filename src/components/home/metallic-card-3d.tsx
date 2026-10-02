"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./brand.module.css";

type Zone = { name: string; count: number };

interface MetallicCard3DProps {
  live: number;
  categoryCount: number;
  zones: Zone[];
  moreZones: number;
  year: number;
  flipped: boolean;
  onToggleFlip: () => void;
}

// Generate high-resolution front texture on canvas
function createFrontTexture(live: number, categoryCount: number, year: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1292;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle silver brushed-metal gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#f0f2f5");
  bgGrad.addColorStop(0.3, "#e2e6eb");
  bgGrad.addColorStop(0.5, "#f7f9fa");
  bgGrad.addColorStop(0.7, "#d8dde3");
  bgGrad.addColorStop(1, "#e6eaef");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle brushed metallic horizontal micro-lines
  ctx.fillStyle = "rgba(0, 0, 0, 0.015)";
  for (let i = 0; i < canvas.height; i += 3) {
    if (Math.random() > 0.4) {
      ctx.fillRect(0, i, canvas.width, 1.5);
    }
  }

  // Top header bar
  ctx.fillStyle = "#121417";
  ctx.font = "900 80px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "0.04em";
  ctx.fillText("STUDENTSTACK", 120, 160);

  ctx.font = "700 48px monospace";
  ctx.fillStyle = "#3a3d42";
  ctx.fillText("STUDENT PASS", canvas.width - 540, 155);

  // Divider rule
  ctx.fillStyle = "#121417";
  ctx.fillRect(120, 205, canvas.width - 240, 6);

  // Photo / Monogram Box
  ctx.fillStyle = "#16171a";
  const boxX = 120;
  const boxY = 270;
  const boxW = 340;
  const boxH = 430;
  const boxR = 36;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, boxR);
  ctx.fill();

  // White "S" monogram
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 240px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", boxX + boxW / 2, boxY + boxH / 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  // Data fields
  const fieldX = 520;
  let curY = 320;

  // HOLDER
  ctx.fillStyle = "#63676e";
  ctx.font = "600 36px monospace";
  ctx.fillText("HOLDER", fieldX, curY);
  ctx.fillStyle = "#121417";
  ctx.font = "800 68px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("You", fieldX, curY + 68);

  curY += 150;
  // VALID
  ctx.fillStyle = "#63676e";
  ctx.font = "600 36px monospace";
  ctx.fillText("VALID", fieldX, curY);
  ctx.fillStyle = "#121417";
  ctx.font = "800 68px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("While enrolled", fieldX, curY + 68);

  curY += 150;
  // UNLOCKS
  ctx.fillStyle = "#63676e";
  ctx.font = "600 36px monospace";
  ctx.fillText("UNLOCKS", fieldX, curY);
  ctx.fillStyle = "#121417";
  ctx.font = "800 68px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`${live} live offers`, fieldX, curY + 68);

  // Barcode stripes
  const serial = String(live).padStart(4, "0");
  const barcodeY = 870;
  const barcodeH = 110;
  let barX = 120;
  const patternSeed = `STUDENTSTACK${serial}`;
  for (let i = 0; i < patternSeed.length; i++) {
    const code = patternSeed.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const w = ((code >> b) & 1) ? 9 : 4;
      ctx.fillStyle = "#121417";
      ctx.fillRect(barX, barcodeY, w, barcodeH);
      barX += w + ((code >> (4 + b)) & 1 ? 8 : 4);
    }
  }

  // Serial number
  ctx.fillStyle = "#33363b";
  ctx.font = "600 38px monospace";
  ctx.fillText(`No. ${serial} - ${year}`, canvas.width - 560, barcodeY + 80);

  // Bottom machine-readable line
  ctx.fillStyle = "#4a4e54";
  ctx.font = "600 38px monospace";
  ctx.fillText(`P<STUDENTSTACK<<${live}<LIVE<<${categoryCount}<CATEGORIES<<`, 120, 1080);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Generate high-resolution back texture on canvas
function createBackTexture(zones: Zone[], moreZones: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1292;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark metallic slate back
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#1c1e22");
  bgGrad.addColorStop(0.5, "#25282d");
  bgGrad.addColorStop(1, "#181a1d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top header bar
  ctx.fillStyle = "#e4e8ec";
  ctx.font = "900 68px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("ACCESS ZONES", 120, 150);

  ctx.fillStyle = "#63676e";
  ctx.fillRect(120, 185, canvas.width - 240, 4);

  // 2-column zones list
  const startY = 280;
  const colWidth = 840;
  const rowHeight = 90;

  ctx.font = "600 48px -apple-system, BlinkMacSystemFont, sans-serif";
  zones.forEach((zone, idx) => {
    const col = idx < 4 ? 0 : 1;
    const row = idx % 4;
    const x = 120 + col * colWidth;
    const y = startY + row * rowHeight;

    ctx.fillStyle = "#d0d4d9";
    ctx.fillText(zone.name, x, y);

    ctx.fillStyle = "#a2a8b0";
    ctx.font = "700 48px monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(zone.count), x + colWidth - 80, y);
    ctx.textAlign = "start";
    ctx.font = "600 48px -apple-system, BlinkMacSystemFont, sans-serif";
  });

  if (moreZones > 0) {
    ctx.fillStyle = "#9ba1a8";
    ctx.font = "600 40px monospace";
    ctx.fillText(`+ ${moreZones} more zones inside`, 120, startY + 4 * rowHeight + 60);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Generate studio environment with silver, lavender, and ice-blue reflection bands
function createStudioEnvMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep neutral studio ground
  ctx.fillStyle = "#0c0d10";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Broad central overhead silver-white light
  const topGrad = ctx.createLinearGradient(0, 0, 0, 200);
  topGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  topGrad.addColorStop(0.5, "rgba(230, 235, 245, 0.6)");
  topGrad.addColorStop(1, "rgba(12, 13, 16, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, canvas.width, 200);

  // Right key reflection band with subtle ice-blue tone
  const blueGrad = ctx.createLinearGradient(700, 0, 1000, 0);
  blueGrad.addColorStop(0, "rgba(12, 13, 16, 0)");
  blueGrad.addColorStop(0.5, "rgba(180, 220, 255, 0.55)");
  blueGrad.addColorStop(1, "rgba(12, 13, 16, 0)");
  ctx.fillStyle = blueGrad;
  ctx.fillRect(700, 0, 300, canvas.height);

  // Left fill reflection band with subtle lavender tone
  const lavGrad = ctx.createLinearGradient(80, 0, 380, 0);
  lavGrad.addColorStop(0, "rgba(12, 13, 16, 0)");
  lavGrad.addColorStop(0.5, "rgba(225, 195, 255, 0.45)");
  lavGrad.addColorStop(1, "rgba(12, 13, 16, 0)");
  ctx.fillStyle = lavGrad;
  ctx.fillRect(80, 0, 300, canvas.height);

  const envTexture = new THREE.CanvasTexture(canvas);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  return envTexture;
}

function checkWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function MetallicCard3D({
  live,
  categoryCount,
  zones,
  moreZones,
  year,
  flipped,
  onToggleFlip,
}: MetallicCard3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported] = useState(checkWebGL);

  // Target and current rotation tracking
  const targetYawRef = useRef(0);
  const targetPitchRef = useRef(0);
  const currentYawRef = useRef(0);
  const currentPitchRef = useRef(0);
  const currentFlipRef = useRef(flipped ? Math.PI : 0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !webglSupported) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 280;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup with generous framing to prevent tilt clipping
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment map
    const envMap = createStudioEnvMap();
    scene.environment = envMap;

    // 5. Card Geometry (ID-1 aspect ratio: 85.6mm x 54mm = 1.585)
    const cardW = 3.25;
    const cardH = 3.25 / 1.585; // approx 2.05
    const cardR = 0.14; // corner radius

    const shape = new THREE.Shape();
    const x = -cardW / 2;
    const y = -cardH / 2;
    shape.moveTo(x + cardR, y);
    shape.lineTo(x + cardW - cardR, y);
    shape.quadraticCurveTo(x + cardW, y, x + cardW, y + cardR);
    shape.lineTo(x + cardW, y + cardH - cardR);
    shape.quadraticCurveTo(x + cardW, y + cardH, x + cardW - cardR, y + cardH);
    shape.lineTo(x + cardR, y + cardH);
    shape.quadraticCurveTo(x, y + cardH, x, y + cardH - cardR);
    shape.lineTo(x, y + cardR);
    shape.quadraticCurveTo(x, y, x + cardR, y);

    const extrudeSettings = {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    };

    const cardGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    cardGeometry.center();

    // 6. Metallic Body Material
    const metalMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xdce0e5),
      metalness: 1.0,
      roughness: 0.28,
      iridescence: 0.22,
      iridescenceIOR: 1.35,
      clearcoat: 0.1,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.25,
    });

    const cardMesh = new THREE.Mesh(cardGeometry, metalMaterial);

    // 7. High-Res Artwork Face Textures
    const frontTex = createFrontTexture(live, categoryCount, year);
    const backTex = createBackTexture(zones, moreZones);

    const frontPlaneGeo = new THREE.PlaneGeometry(cardW - 0.01, cardH - 0.01);
    const frontPlaneMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      metalness: 0.65,
      roughness: 0.32,
      iridescence: 0.18,
      clearcoat: 0.2,
      envMapIntensity: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const frontPlane = new THREE.Mesh(frontPlaneGeo, frontPlaneMat);
    frontPlane.position.z = 0.032;

    const backPlaneGeo = new THREE.PlaneGeometry(cardW - 0.01, cardH - 0.01);
    const backPlaneMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      metalness: 0.45,
      roughness: 0.38,
      clearcoat: 0.1,
      envMapIntensity: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const backPlane = new THREE.Mesh(backPlaneGeo, backPlaneMat);
    backPlane.rotation.y = Math.PI;
    backPlane.position.z = -0.032;

    // 8. Separate Groups for Flip and Tilt to prevent interference
    const tiltGroup = new THREE.Group();
    tiltGroup.add(cardMesh);
    tiltGroup.add(frontPlane);
    tiltGroup.add(backPlane);

    const flipGroup = new THREE.Group();
    flipGroup.add(tiltGroup);

    // Resting card angle: subtle -3deg tilt on Z, +5deg on X
    flipGroup.rotation.z = THREE.MathUtils.degToRad(-3.5);
    flipGroup.rotation.x = THREE.MathUtils.degToRad(3.0);

    scene.add(flipGroup);

    // 9. Directional studio lights for rim highlights
    const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topLight.position.set(0, 5, 4);
    scene.add(topLight);

    const rimLightBlue = new THREE.DirectionalLight(0xcde6ff, 1.5);
    rimLightBlue.position.set(5, 2, 2);
    scene.add(rimLightBlue);

    const rimLightLav = new THREE.DirectionalLight(0xf1dbff, 1.2);
    rimLightLav.position.set(-5, -2, 2);
    scene.add(rimLightLav);

    // 10. Pointer Tracking for Cursor Tilt
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handlePointerMove = (e: PointerEvent) => {
      if (!hasFinePointer || prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));

      // targetYaw up to 12 degrees, targetPitch up to 8 degrees
      targetYawRef.current = THREE.MathUtils.degToRad(nx * 12);
      targetPitchRef.current = THREE.MathUtils.degToRad(-ny * 8);
    };

    const handlePointerLeave = () => {
      targetYawRef.current = 0;
      targetPitchRef.current = 0;
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    // 11. Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 12. Animation Loop with frame-rate independent exponential damping
    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const alpha = 1 - Math.exp(-10 * deltaSeconds);

      // Interpolate tilt
      currentYawRef.current += (targetYawRef.current - currentYawRef.current) * alpha;
      currentPitchRef.current += (targetPitchRef.current - currentPitchRef.current) * alpha;

      tiltGroup.rotation.y = currentYawRef.current;
      tiltGroup.rotation.x = currentPitchRef.current;

      // Interpolate flip rotation
      const targetFlip = flipped ? Math.PI : 0;
      currentFlipRef.current += (targetFlip - currentFlipRef.current) * alpha;
      flipGroup.rotation.y = currentFlipRef.current;

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver.disconnect();

      cardGeometry.dispose();
      metalMaterial.dispose();
      frontTex.dispose();
      frontPlaneMat.dispose();
      frontPlaneGeo.dispose();
      backTex.dispose();
      backPlaneMat.dispose();
      backPlaneGeo.dispose();
      envMap.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [live, categoryCount, year, zones, moreZones, flipped, webglSupported]);

  if (!webglSupported) {
    return (
      <div className={styles.cardFallback}>
        <div className={styles.fallbackCard}>
          <span className={styles.issuer}>StudentStack</span>
          <p className={styles.fallbackHolder}>HOLDER: You</p>
          <p className={styles.fallbackOffers}>{live} live offers</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={styles.canvasContainer}
      onClick={onToggleFlip}
      role="button"
      tabIndex={0}
      aria-label="3D metallic student pass. Click to flip, move cursor to tilt."
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleFlip();
        }
      }}
    />
  );
}
