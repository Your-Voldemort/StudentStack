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

function createFrontTexture(live: number, categoryCount: number, year: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1292;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#f3f5f8");
  bgGrad.addColorStop(0.25, "#e5e9ee");
  bgGrad.addColorStop(0.5, "#f8fafc");
  bgGrad.addColorStop(0.75, "#dfe4ea");
  bgGrad.addColorStop(1, "#edf0f4");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
  for (let i = 0; i < canvas.height; i += 2) {
    if (Math.random() > 0.35) {
      ctx.fillRect(0, i, canvas.width, 1.2);
    }
  }

  ctx.fillStyle = "#0f1115";
  ctx.font = "900 86px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.letterSpacing = "0.03em";
  ctx.fillText("STUDENTSTACK", 130, 165);

  ctx.font = "700 50px monospace";
  ctx.fillStyle = "#1a1d24";
  ctx.fillText("STUDENT PASS", canvas.width - 560, 160);

  ctx.fillStyle = "#0f1115";
  ctx.fillRect(130, 210, canvas.width - 260, 6);

  const boxX = 130;
  const boxY = 275;
  const boxW = 350;
  const boxH = 435;
  const boxR = 40;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, boxR);
  ctx.fillStyle = "#121316";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 250px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", boxX + boxW / 2, boxY + boxH / 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const fieldX = 540;
  let curY = 325;

  ctx.fillStyle = "#1a1d24";
  ctx.font = "700 42px monospace";
  ctx.fillText("HOLDER", fieldX, curY);
  ctx.fillStyle = "#050608";
  ctx.font = "800 74px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("You", fieldX, curY + 70);

  curY += 155;
  ctx.fillStyle = "#1a1d24";
  ctx.font = "700 42px monospace";
  ctx.fillText("VALID", fieldX, curY);
  ctx.fillStyle = "#050608";
  ctx.font = "800 74px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("While enrolled", fieldX, curY + 70);

  curY += 155;
  ctx.fillStyle = "#1a1d24";
  ctx.font = "700 42px monospace";
  ctx.fillText("UNLOCKS", fieldX, curY);
  ctx.fillStyle = "#050608";
  ctx.font = "800 74px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`${live} live offers`, fieldX, curY + 70);

  const serial = String(live).padStart(4, "0");
  const barcodeY = 880;
  const barcodeH = 115;
  let barX = 130;
  const patternSeed = `STUDENTSTACK${serial}`;
  for (let i = 0; i < patternSeed.length; i++) {
    const code = patternSeed.charCodeAt(i);
    for (let b = 0; b < 4; b++) {
      const w = ((code >> b) & 1) ? 9 : 4;
      ctx.fillStyle = "#0f1115";
      ctx.fillRect(barX, barcodeY, w, barcodeH);
      barX += w + ((code >> (4 + b)) & 1 ? 8 : 4);
    }
  }

  ctx.fillStyle = "#2d3036";
  ctx.font = "600 38px monospace";
  ctx.fillText(`No. ${serial} - ${year}`, canvas.width - 560, barcodeY + 82);

  ctx.fillStyle = "#43464d";
  ctx.font = "600 38px monospace";
  ctx.fillText(`P<STUDENTSTACK<<${live}<LIVE<<${categoryCount}<CATEGORIES<<`, 130, 1080);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createBackTexture(zones: Zone[], moreZones: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1292;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, "#191a1d");
  bgGrad.addColorStop(0.5, "#22252a");
  bgGrad.addColorStop(1, "#151619");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e4e8ec";
  ctx.font = "900 68px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("ACCESS ZONES", 130, 150);

  ctx.fillStyle = "#555962";
  ctx.fillRect(130, 185, canvas.width - 260, 4);

  const startY = 280;
  const colWidth = 840;
  const rowHeight = 90;

  ctx.font = "600 48px -apple-system, BlinkMacSystemFont, sans-serif";
  zones.forEach((zone, idx) => {
    const col = idx < 4 ? 0 : 1;
    const row = idx % 4;
    const x = 130 + col * colWidth;
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
    ctx.fillText(`+ ${moreZones} more zones inside`, 130, startY + 4 * rowHeight + 60);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createStudioEnvMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#08090b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const topGrad = ctx.createLinearGradient(0, 0, 0, 220);
  topGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  topGrad.addColorStop(0.5, "rgba(235, 240, 250, 0.7)");
  topGrad.addColorStop(1, "rgba(8, 9, 11, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, canvas.width, 220);

  const blueGrad = ctx.createLinearGradient(680, 0, 1024, 0);
  blueGrad.addColorStop(0, "rgba(8, 9, 11, 0)");
  blueGrad.addColorStop(0.5, "rgba(103, 232, 249, 0.75)");
  blueGrad.addColorStop(1, "rgba(8, 9, 11, 0)");
  ctx.fillStyle = blueGrad;
  ctx.fillRect(680, 0, 344, canvas.height);

  const lavGrad = ctx.createLinearGradient(0, 0, 360, 0);
  lavGrad.addColorStop(0, "rgba(8, 9, 11, 0)");
  lavGrad.addColorStop(0.5, "rgba(216, 180, 254, 0.65)");
  lavGrad.addColorStop(1, "rgba(8, 9, 11, 0)");
  ctx.fillStyle = lavGrad;
  ctx.fillRect(0, 0, 360, canvas.height);

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

function createRoundedFaceGeometry(shape: THREE.Shape, width: number, height: number): THREE.ShapeGeometry {
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    uvs[i * 2] = (px + width / 2) / width;
    uvs[i * 2 + 1] = (py + height / 2) / height;
  }

  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geo;
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

  const targetYawRef = useRef(0);
  const targetPitchRef = useRef(0);
  const currentYawRef = useRef(0);
  const currentPitchRef = useRef(0);
  const currentFlipRef = useRef(flipped ? Math.PI : 0);
  const scrollProgressRef = useRef(0);
  const currentYRef = useRef(0.08);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !webglSupported) return;

    const width = container.clientWidth || 490;
    const height = container.clientHeight || 380;
    const aspect = width / height;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);

    const cardW = 3.20;
    const cardH = 3.20 / 1.585;
    const cardR = 0.18;

    const targetWidthFraction = 0.91;
    const vFovRad = (38 * Math.PI) / 180;
    const reqZ = (cardW / targetWidthFraction) / (2 * Math.tan(vFovRad / 2) * aspect);
    camera.position.set(0, 0.28, Math.max(3.6, reqZ));

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const envMap = createStudioEnvMap();
    scene.environment = envMap;

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
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    };

    const cardGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    cardGeometry.center();

    const metalMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf2f5f8),
      metalness: 0.96,
      roughness: 0.25,
      clearcoat: 0.35,
      clearcoatRoughness: 0.1,
      iridescence: 0.35,
      iridescenceIOR: 1.45,
      iridescenceThicknessRange: [120, 380],
      envMapIntensity: 1.5,
    });

    const cardMesh = new THREE.Mesh(cardGeometry, metalMaterial);

    const frontTex = createFrontTexture(live, categoryCount, year);
    const backTex = createBackTexture(zones, moreZones);

    const frontFaceGeo = createRoundedFaceGeometry(shape, cardW, cardH);
    const frontFaceMat = new THREE.MeshPhysicalMaterial({
      map: frontTex,
      metalness: 0.25,
      roughness: 0.35,
      clearcoat: 0.2,
      envMapIntensity: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const frontPlane = new THREE.Mesh(frontFaceGeo, frontFaceMat);
    frontPlane.position.z = 0.036;

    const backFaceGeo = createRoundedFaceGeometry(shape, cardW, cardH);
    const backFaceMat = new THREE.MeshPhysicalMaterial({
      map: backTex,
      metalness: 0.4,
      roughness: 0.35,
      clearcoat: 0.15,
      envMapIntensity: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const backPlane = new THREE.Mesh(backFaceGeo, backFaceMat);
    backPlane.rotation.y = Math.PI;
    backPlane.position.z = -0.036;

    const tiltGroup = new THREE.Group();
    tiltGroup.add(cardMesh);
    tiltGroup.add(frontPlane);
    tiltGroup.add(backPlane);
    tiltGroup.position.set(0, 0.08, 0);

    const flipGroup = new THREE.Group();
    flipGroup.add(tiltGroup);
    flipGroup.rotation.set(0, 0, 0);

    scene.add(flipGroup);

    const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
    frontLight.position.set(0, 2, 5);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.2);
    topLight.position.set(0, 6, 3);
    scene.add(topLight);

    const rimLightBlue = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLightBlue.position.set(6, 2, -1);
    scene.add(rimLightBlue);

    const rimLightLav = new THREE.DirectionalLight(0xc084fc, 2.0);
    rimLightLav.position.set(-6, 2, -1);
    scene.add(rimLightLav);

    const ambientLight = new THREE.AmbientLight(0x2d3139, 1.2);
    scene.add(ambientLight);

    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let needsRender = true;
    const wake = () => {
      needsRender = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!hasFinePointer || prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));

      targetYawRef.current = THREE.MathUtils.degToRad(nx * 12);
      targetPitchRef.current = THREE.MathUtils.degToRad(-ny * 8);
      wake();
    };

    const handlePointerLeave = () => {
      targetYawRef.current = 0;
      targetPitchRef.current = 0;
      wake();
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          isVisible = entries[0].isIntersecting;
          if (isVisible) wake();
        }
      },
      { threshold: 0.02 }
    );
    intersectionObserver.observe(container);

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const progress = Math.min(Math.max(scrollY / 180, 0), 1);
      scrollProgressRef.current = progress;
      wake();
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          const newAspect = newW / newH;
          camera.aspect = newAspect;
          const rz = (cardW / targetWidthFraction) / (2 * Math.tan(vFovRad / 2) * newAspect);
          camera.position.z = Math.max(3.6, rz);
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
          wake();
        }
      }
    });
    resizeObserver.observe(container);

    let animId: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) {
        lastTime = now;
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const alpha = 1 - Math.exp(-10 * deltaSeconds);

      const targetY = 0.08 + scrollProgressRef.current * 0.36;
      const targetFlip = flipped ? Math.PI : 0;

      const yawDiff = Math.abs(targetYawRef.current - currentYawRef.current);
      const pitchDiff = Math.abs(targetPitchRef.current - currentPitchRef.current);
      const yDiff = Math.abs(targetY - currentYRef.current);
      const flipDiff = Math.abs(targetFlip - currentFlipRef.current);

      if (needsRender || yawDiff > 0.0003 || pitchDiff > 0.0003 || yDiff > 0.0003 || flipDiff > 0.0003) {
        currentYawRef.current += (targetYawRef.current - currentYawRef.current) * alpha;
        currentPitchRef.current += (targetPitchRef.current - currentPitchRef.current) * alpha;
        tiltGroup.rotation.y = currentYawRef.current;
        tiltGroup.rotation.x = currentPitchRef.current;

        currentYRef.current += (targetY - currentYRef.current) * alpha;
        tiltGroup.position.set(0, currentYRef.current, 0);

        currentFlipRef.current += (targetFlip - currentFlipRef.current) * alpha;
        flipGroup.rotation.y = currentFlipRef.current;

        renderer.render(scene, camera);

        if (yawDiff <= 0.0003 && pitchDiff <= 0.0003 && yDiff <= 0.0003 && flipDiff <= 0.0003) {
          needsRender = false;
        }
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();

      cardGeometry.dispose();
      metalMaterial.dispose();
      frontTex.dispose();
      frontFaceMat.dispose();
      frontFaceGeo.dispose();
      backTex.dispose();
      backFaceMat.dispose();
      backFaceGeo.dispose();
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
      aria-label="3D metallic student pass. Click to flip, move cursor to tilt, scroll to lift."
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleFlip();
        }
      }}
    />
  );
}
