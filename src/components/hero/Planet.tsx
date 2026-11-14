"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { PROFESSIONS, type ProfessionKey } from "@/config/professions";

export interface PlanetLabel {
  key: ProfessionKey;
  name: string;
}

interface PlanetProps {
  labels: readonly PlanetLabel[];
  selected: ProfessionKey | null;
  onSelect: (key: ProfessionKey | null) => void;
  ariaLabel: string;
}

/* ------------------------------- Shaders ---------------------------------- */

const PLANET_VERTEX = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNV;
  void main() {
    vPos = position;
    vNV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLANET_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying vec3 vNV;
  uniform float uTime;
  uniform vec3 uLight;
  const float PI = 3.14159265;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5; float s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  void main() {
    vec3 n = normalize(vPos);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float lon = atan(n.z, n.x);

    // Evenly spaced dot grid on the sphere: rows by latitude, columns shrink toward the poles.
    const float ROWS = 70.0;
    float row = floor(lat / PI * ROWS + 0.5);
    float rowLat = row / ROWS * PI;
    float cols = max(4.0, floor(ROWS * 2.0 * cos(rowLat)));
    float col = floor(lon / (2.0 * PI) * cols + 0.5);
    float cLon = col / cols * 2.0 * PI;
    vec3 c = vec3(cos(rowLat) * cos(cLon), sin(rowLat), cos(rowLat) * sin(cLon));
    float d = distance(n, c);
    float dotMask = smoothstep(0.0165, 0.008, d);

    float land = smoothstep(0.47, 0.56, fbm(n * 2.3 + 3.0));
    float tint = noise(n * 3.0 + 11.0);

    float diff = clamp(dot(normalize(vNV), normalize(uLight)) * 0.5 + 0.5, 0.0, 1.0);
    float lit = 0.22 + 0.78 * diff;
    float twinkle = 0.86 + 0.14 * sin(uTime * 1.5 + hash(vec3(row, col, 1.0)) * 6.2831);

    vec3 body = vec3(0.012, 0.018, 0.06) + vec3(0.02, 0.035, 0.13) * diff;
    vec3 ocean = vec3(0.09, 0.2, 0.52);
    vec3 earth = mix(vec3(0.28, 0.62, 1.0), vec3(0.66, 0.42, 1.0), tint);
    vec3 dotColor = mix(ocean, earth, land);
    float strength = mix(0.4, 1.15, land);

    vec3 color = body + dotColor * dotMask * strength * lit * twinkle;

    float fres = pow(1.0 - max(dot(normalize(vNV), vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
    color += vec3(0.22, 0.4, 1.0) * fres * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNV;
  void main() {
    vNV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  varying vec3 vNV;
  uniform float uOpacity;
  void main() {
    float i = pow(max(0.0, 0.62 - dot(vNV, vec3(0.0, 0.0, 1.0))), 3.2);
    gl_FragColor = vec4(vec3(0.32, 0.5, 1.0) * i * 1.25, i * uOpacity * 0.9);
  }
`;

/* ------------------------------- Constants -------------------------------- */

const RING_RADII = [1.38, 1.74, 2.1] as const;
const RING_TILT_X = [0.4, -0.34, 0.52] as const;
const RING_TILT_Z = [0.1, -0.16, 0.22] as const;
const RING_SPEED = [0.17, -0.115, 0.078] as const;
const RING_PHASE = [0.3, 1.1, 2.0] as const;
const LIGHT_DIR = new Vector3(-0.5, 0.4, 0.75);
const MAX_PITCH = 0.55;

interface RingItem {
  key: ProfessionKey;
  ring: 0 | 1 | 2;
  anchor: Object3D;
}

function hslDot(hue: number): string {
  return `hsl(${hue} 90% 64%)`;
}

/** Cheap capability probe; Planet only renders on the client (dynamic, ssr: false). */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    // Release the probe context right away; browsers cap live WebGL contexts (~16).
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function Planet({ labels, selected, onSelect, ariaLabel }: PlanetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Partial<Record<ProfessionKey, HTMLButtonElement | null>>>({});
  const selectedRef = useRef<ProfessionKey | null>(selected);
  const onSelectRef = useRef(onSelect);
  const pausedRef = useRef(false);
  const focusedRef = useRef<ProfessionKey | null>(null);
  const [fallback, setFallback] = useState(() => !hasWebGL());

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return; // fallback markup is showing

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      const id = requestAnimationFrame(() => setFallback(true));
      return () => cancelAnimationFrame(id);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 120);
    const world = new Group();
    scene.add(world);

    /* Planet */
    const planetMaterial = new ShaderMaterial({
      vertexShader: PLANET_VERTEX,
      fragmentShader: PLANET_FRAGMENT,
      uniforms: { uTime: { value: 0 }, uLight: { value: LIGHT_DIR.clone().normalize() } },
    });
    const planetGeometry = new SphereGeometry(1, 96, 96);
    const planet = new Mesh(planetGeometry, planetMaterial);
    world.add(planet);

    const atmosphereMaterial = new ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: { uOpacity: { value: 0 } },
      blending: AdditiveBlending,
      side: BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereGeometry = new SphereGeometry(1.22, 64, 64);
    world.add(new Mesh(atmosphereGeometry, atmosphereMaterial));

    /* Orbits */
    const ringsRoot = new Group();
    world.add(ringsRoot);
    const spinners: Group[] = [];
    const ringLines: LineBasicMaterial[] = [];
    const ringDots: PointsMaterial[] = [];
    const geometries: BufferGeometry[] = [planetGeometry, atmosphereGeometry];
    const items: RingItem[] = [];

    ([0, 1, 2] as const).forEach((ringIndex) => {
      const tilt = new Group();
      tilt.rotation.x = RING_TILT_X[ringIndex];
      tilt.rotation.z = RING_TILT_Z[ringIndex];
      const spinner = new Group();
      tilt.add(spinner);
      ringsRoot.add(tilt);
      spinners.push(spinner);

      const radius = RING_RADII[ringIndex];
      const segments = 220;
      const positions: number[] = [];
      for (let i = 0; i < segments; i += 1) {
        const a = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
      }
      const lineGeometry = new BufferGeometry();
      lineGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
      geometries.push(lineGeometry);
      const lineMaterial = new LineBasicMaterial({ color: 0x8aa4ff, transparent: true, opacity: 0.26 });
      ringLines.push(lineMaterial);
      tilt.add(new LineLoop(lineGeometry, lineMaterial));

      // Fine dust along the orbit for depth.
      const dustPositions: number[] = [];
      for (let i = 0; i < 90; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const r = radius + (Math.random() - 0.5) * 0.06;
        dustPositions.push(Math.cos(a) * r, (Math.random() - 0.5) * 0.04, Math.sin(a) * r);
      }
      const dustGeometry = new BufferGeometry();
      dustGeometry.setAttribute("position", new Float32BufferAttribute(dustPositions, 3));
      geometries.push(dustGeometry);
      const dustMaterial = new PointsMaterial({ color: 0xbfd0ff, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false });
      ringDots.push(dustMaterial);
      tilt.add(new Points(dustGeometry, dustMaterial));

      const members = PROFESSIONS.filter((p) => p.ring === ringIndex);
      members.forEach((member, index) => {
        const angle = RING_PHASE[ringIndex] + (index / members.length) * Math.PI * 2;
        const anchor = new Object3D();
        anchor.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        spinner.add(anchor);
        items.push({ key: member.key, ring: ringIndex, anchor });
      });
    });

    /* Starfield */
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const r = 14 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new BufferGeometry();
    starGeometry.setAttribute("position", new Float32BufferAttribute(starPositions, 3));
    geometries.push(starGeometry);
    const starMaterial = new PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false });
    const stars = new Points(starGeometry, starMaterial);
    scene.add(stars);

    /* Sizing */
    const size = { w: 1, h: 1 };
    let labelScale = 1;
    const fovTan = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const resize = () => {
      size.w = Math.max(1, container.clientWidth);
      size.h = Math.max(1, container.clientHeight);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      // Frame the scene in pixels: the outer ring plus half a label must fit horizontally,
      // the planet and the tilted rings must fit vertically. Take the tighter of the two.
      const compact = size.w < 520;
      const ringScale = compact ? 0.86 : 1;
      labelScale = compact ? 0.84 : 1;
      ringsRoot.scale.setScalar(ringScale);
      const outer = RING_RADII[2] * ringScale;
      const labelHalfPx = compact ? 46 : 70;
      const pxPerUnitX = (size.w / 2 - labelHalfPx) / outer;
      const pxPerUnitY = (size.h / 2 - 34) / Math.max(1.35, outer * 0.62);
      const pxPerUnit = Math.min(pxPerUnitX, pxPerUnitY) * 0.94; // margin for perspective
      const visibleHeight = size.h / pxPerUnit;
      camera.position.set(0, 0, visibleHeight / 2 / fovTan);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    /* Interaction state */
    let yaw = 0.5;
    let pitch = 0.2;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let motion = reduceMotion ? 0 : 1; // eased auto-rotation multiplier

    const isOnLabel = (target: EventTarget | null) => target instanceof Element && target.closest("button") !== null;

    const onPointerDown = (event: PointerEvent) => {
      if (isOnLabel(event.target)) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      velocity = 0;
      container.setPointerCapture(event.pointerId);
      container.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        velocity = dx * 0.006;
        yaw += velocity;
        pitch = MathUtils.clamp(pitch + dy * 0.004, -MAX_PITCH, MAX_PITCH);
      } else if (event.pointerType === "mouse") {
        const rect = container.getBoundingClientRect();
        parallaxX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        parallaxY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      }
    };
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      container.style.cursor = "grab";
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    };
    const onLeave = () => {
      parallaxX = 0;
      parallaxY = 0;
    };

    container.style.cursor = "grab";
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    container.addEventListener("pointerleave", onLeave);

    /* Render loop (paused while off-screen or tab hidden) */
    const worldPos = new Vector3();
    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    const start = last;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      const intro = reduceMotion ? 1 : Math.min(1, (now - start) / 1700);
      const eased = 1 - Math.pow(1 - intro, 3);

      const wantsPause = pausedRef.current || selectedRef.current !== null || dragging;
      const target = reduceMotion ? 0 : wantsPause ? 0 : 1;
      motion += (target - motion) * Math.min(1, dt * 3);

      planetMaterial.uniforms.uTime.value = t;
      planet.rotation.y += dt * 0.06 * motion;
      stars.rotation.y += dt * 0.004 * motion;
      spinners.forEach((spinner, i) => {
        spinner.rotation.y += dt * RING_SPEED[i] * motion;
      });

      if (!dragging) {
        yaw += velocity;
        velocity *= 0.94;
      }
      world.rotation.y = yaw;
      world.rotation.x = MathUtils.lerp(world.rotation.x, pitch + parallaxY * 0.07, 0.08);
      world.position.x = MathUtils.lerp(world.position.x, parallaxX * 0.08, 0.06);
      world.scale.setScalar(0.72 + 0.28 * eased);
      atmosphereMaterial.uniforms.uOpacity.value = eased;

      const selectedRing = PROFESSIONS.find((p) => p.key === selectedRef.current)?.ring ?? -1;
      ringLines.forEach((material, i) => {
        material.opacity = MathUtils.lerp(material.opacity, (i === selectedRing ? 0.8 : 0.26) * eased, 0.1);
      });
      ringDots.forEach((material, i) => {
        material.opacity = MathUtils.lerp(material.opacity, (i === selectedRing ? 0.95 : 0.55) * eased, 0.1);
      });

      renderer.render(scene, camera);

      // Project each profession anchor to screen space and position its DOM button.
      for (const item of items) {
        const element = labelRefs.current[item.key];
        if (!element) continue;
        item.anchor.getWorldPosition(worldPos);
        const depth = worldPos.z / (RING_RADII[item.ring] * ringsRoot.scale.x);
        const t01 = MathUtils.clamp((depth + 1) / 2, 0, 1);
        const hiddenByPlanet = worldPos.z < 0 && worldPos.x * worldPos.x + worldPos.y * worldPos.y < 1.15;
        const isSelected = item.key === selectedRef.current;
        const isFocused = item.key === focusedRef.current;

        // Labels behind the planet fade to a faint ghost but stay in the tab order; a focused or
        // selected label is always shown so keyboard and screen-reader users can reach every profession.
        let opacity = (0.4 + 0.6 * t01) * eased;
        if (hiddenByPlanet) opacity = 0.14 * eased;
        if (isSelected || isFocused) opacity = Math.max(opacity, 0.98 * eased);

        worldPos.project(camera);
        const x = (worldPos.x * 0.5 + 0.5) * size.w;
        const y = (-worldPos.y * 0.5 + 0.5) * size.h;
        const scale = (0.9 + 0.2 * t01) * (isSelected ? 1.08 : 1) * labelScale;

        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        element.style.opacity = opacity.toFixed(3);
        element.style.zIndex = String(Math.round(t01 * 100) + (isSelected ? 200 : 0));
        element.style.visibility = eased < 0.05 ? "hidden" : "visible";
      }
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (visible && !document.hidden ? startLoop() : stopLoop());

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(container);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      stopLoop();
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endDrag);
      container.removeEventListener("pointercancel", endDrag);
      container.removeEventListener("pointerleave", onLeave);
      geometries.forEach((geometry) => geometry.dispose());
      planetMaterial.dispose();
      atmosphereMaterial.dispose();
      ringLines.forEach((material) => material.dispose());
      ringDots.forEach((material) => material.dispose());
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  const meta = (key: ProfessionKey) => PROFESSIONS.find((p) => p.key === key);

  if (fallback) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-4">
        <div
          aria-hidden
          className="size-44 rounded-full bg-[radial-gradient(circle_at_32%_30%,#7aa7ff,#4a3bd8_45%,#0b0b2e_80%)] shadow-[0_0_80px_rgb(80_90_255/0.45)]"
        />
        <ul className="flex max-w-2xl flex-wrap justify-center gap-2" aria-label={ariaLabel}>
          {labels.map((label) => (
            <li key={label.key}>
              <button
                type="button"
                aria-pressed={selected === label.key}
                onClick={() => onSelect(selected === label.key ? null : label.key)}
                className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-[rgb(28_28_30/0.8)] px-4 text-[14px] font-medium text-white aria-pressed:bg-white aria-pressed:text-black"
              >
                <span aria-hidden className="size-2 rounded-full" style={{ background: hslDot(meta(label.key)?.hue ?? 210) }} />
                {label.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div ref={containerRef} role="group" aria-label={ariaLabel} className="relative isolate h-full w-full touch-pan-y select-none overflow-hidden">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      {labels.map((label) => (
        <button
          key={label.key}
          type="button"
          ref={(element) => {
            labelRefs.current[label.key] = element;
          }}
          aria-pressed={selected === label.key}
          onClick={() => onSelect(selected === label.key ? null : label.key)}
          onPointerEnter={() => {
            pausedRef.current = true;
          }}
          onPointerLeave={() => {
            pausedRef.current = false;
          }}
          onFocus={() => {
            pausedRef.current = true;
            focusedRef.current = label.key;
          }}
          onBlur={() => {
            pausedRef.current = false;
            focusedRef.current = null;
          }}
          style={{ opacity: 0, visibility: "hidden" }}
          className="absolute left-0 top-0 flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[rgb(28_28_30/0.74)] px-3.5 text-[14px] font-medium text-white will-change-transform transition-[background-color,color,box-shadow] duration-200 hover:bg-[rgb(62_62_68/0.92)] aria-pressed:bg-white aria-pressed:text-black aria-pressed:shadow-[0_0_30px_rgb(120_140_255/0.6)]"
        >
          <span aria-hidden className="size-2 rounded-full" style={{ background: hslDot(meta(label.key)?.hue ?? 210) }} />
          {label.name}
        </button>
      ))}
    </div>
  );
}
