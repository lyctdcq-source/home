import { useEffect, useRef, useState } from 'react';
import { ResolvedAtmosphereMode, GisProject } from '../types/gis';

interface InteractiveGlobeProps {
  projects: GisProject[];
  activeProject: GisProject;
  lightingMode: ResolvedAtmosphereMode;
  autoRotate: boolean;
  resetSignal: number;
  onSelectProject?: (project: GisProject) => void;
}

const VS_SOURCE = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDayTex;
uniform sampler2D uNightTex;
uniform float uRotY;
uniform float uRotX;
uniform float uRadius;
uniform vec2 uCenter;
uniform float uMode;

void main() {
  vec2 p = vUv - uCenter;
  float dist = length(p);
  if (dist > uRadius) {
    discard;
  }

  float edgeAlpha = smoothstep(uRadius, uRadius - 0.008, dist);
  float dx = clamp(p.x / uRadius, -1.0, 1.0);
  float dy = clamp(p.y / uRadius, -1.0, 1.0);
  float dz = sqrt(max(0.0, 1.0 - dx * dx - dy * dy));

  float cosX = cos(uRotX);
  float sinX = sin(uRotX);
  float dy2 = dy * cosX + dz * sinX;
  float dz2 = -dy * sinX + dz * cosX;

  float phi = asin(clamp(dy2, -1.0, 1.0));
  float theta = atan(dx, dz2);
  float lon = theta + uRotY;

  float u = fract(0.5 + lon / 6.28318530718);
  float v = 0.5 + phi / 3.14159265359;

  vec3 daySample = texture2D(uDayTex, vec2(u, v)).rgb;
  vec3 nightSample = texture2D(uNightTex, vec2(u, v)).rgb;

  vec3 normal = vec3(dx, dy, dz);
  vec3 sunDir = normalize(vec3(-0.52, 0.38, 0.76));
  float ndotl = dot(normal, sunDir);

  // Specular ocean glint
  float isWater = clamp((daySample.b - daySample.r * 0.72) * 2.6, 0.0, 1.0);
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(sunDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfDir)), 28.0);
  vec3 oceanSpec = vec3(0.92, 0.97, 1.0) * spec * isWater * 0.34;

  // Fresnel atmospheric rim
  float fresnel = pow(1.0 - dz, 2.5);
  vec3 dayAtm = vec3(0.32, 0.76, 0.96) * fresnel * 0.48;
  vec3 nightAtm = vec3(0.10, 0.42, 0.72) * fresnel * 0.52;

  // Daylight enhancement
  vec3 litDay = daySample * (0.52 + 0.56 * max(0.0, ndotl)) + oceanSpec + dayAtm;

  // Night side with warm city lights
  vec3 deepNightBase = daySample * vec3(0.07, 0.11, 0.18) + vec3(0.02, 0.04, 0.08);
  float cityMask = smoothstep(0.08, 0.65, nightSample.r);
  vec3 cityLights = vec3(1.0, 0.80, 0.44) * cityMask * 1.45;
  vec3 litNight = deepNightBase + cityLights + nightAtm;

  // Four distinct atmospheric lighting modes: 0=dawn, 1=noon, 2=sunset, 3=night
  vec3 finalColor;
  if (uMode < 0.5) {
    // 晨光 (Dawn): Eastern sunrise + soft golden-mint morning rim + fading western city lights
    vec3 dawnSun = normalize(vec3(0.68, 0.26, 0.68));
    float dawnNdotl = dot(normal, dawnSun);
    float dawnMix = smoothstep(-0.22, 0.30, dawnNdotl);
    float dawnBand = exp(-pow((dawnNdotl - 0.02) * 4.6, 2.0));
    vec3 dawnDay = daySample * (0.58 + 0.50 * max(0.0, dawnNdotl)) + oceanSpec * 0.65 + vec3(0.30, 0.80, 0.92) * fresnel * 0.50;
    vec3 dawnTint = vec3(1.0, 0.82, 0.48) * dawnBand * 0.16;
    finalColor = mix(litNight * 0.9, dawnDay, dawnMix) + dawnTint;
  } else if (uMode < 1.5) {
    // 中午 (Noon): High bright zenith sun + vivid azure oceans
    vec3 noonSun = normalize(vec3(-0.22, 0.58, 0.78));
    float noonNdotl = dot(normal, noonSun);
    vec3 noonHalf = normalize(noonSun + viewDir);
    float noonSpec = pow(max(0.0, dot(normal, noonHalf)), 24.0);
    vec3 noonOcean = vec3(0.94, 0.98, 1.0) * noonSpec * isWater * 0.36;
    finalColor = daySample * (0.74 + 0.36 * max(0.0, noonNdotl)) + noonOcean + dayAtm * 0.95;
  } else if (uMode < 2.5) {
    // 晚霞 (Sunset): Low western sun + warm coral-amber dusk terminator + emerging city lights
    vec3 sunsetSun = normalize(vec3(-0.76, 0.16, 0.62));
    float sunsetNdotl = dot(normal, sunsetSun);
    float sunsetMix = smoothstep(-0.20, 0.28, sunsetNdotl);
    float sunsetBand = exp(-pow((sunsetNdotl - 0.02) * 4.4, 2.0));
    vec3 sunsetDay = daySample * (0.50 + 0.52 * max(0.0, sunsetNdotl)) * vec3(1.05, 0.92, 0.86) + oceanSpec * 0.75 + vec3(0.86, 0.48, 0.62) * fresnel * 0.42;
    vec3 sunsetTint = vec3(1.0, 0.48, 0.28) * sunsetBand * 0.24;
    finalColor = mix(litNight, sunsetDay, sunsetMix) + sunsetTint;
  } else {
    // 夜光 (Night): Deep midnight shadow + radiant city lights
    finalColor = litNight + daySample * 0.05 * max(0.0, ndotl);
  }

  gl_FragColor = vec4(finalColor, edgeAlpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function InteractiveGlobe({
  projects,
  activeProject,
  lightingMode,
  autoRotate,
  resetSignal,
  onSelectProject,
}: InteractiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [webglReady, setWebglReady] = useState(true);
  const [texturesLoaded, setTexturesLoaded] = useState(false);

  // Mutable animation state refs for 60fps loop without React re-renders
  // Start with a subtle orbital offset so the globe smoothly glides into the active survey region on initial load
  const rotRef = useRef({
    y: ((activeProject.lon - 26) * Math.PI) / 180,
    x: Math.max(-0.85, Math.min(0.85, ((activeProject.lat - 7) * Math.PI) / 180)),
    targetY: (activeProject.lon * Math.PI) / 180 as number | null,
    targetX: Math.max(-0.85, Math.min(0.85, (activeProject.lat * Math.PI) / 180)) as number | null,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    autoSpinActive: autoRotate,
    idleTimer: 0 as ReturnType<typeof setTimeout> | number,
    pulsePhase: 1.0,
  });

  const propsRef = useRef({
    projects,
    activeProject,
    lightingMode,
    autoRotate,
  });
  propsRef.current = { projects, activeProject, lightingMode, autoRotate };

  useEffect(() => {
    rotRef.current.autoSpinActive = autoRotate;
  }, [autoRotate]);

  // Smooth fly-to when active project or resetSignal changes
  useEffect(() => {
    rotRef.current.targetY = (activeProject.lon * Math.PI) / 180;
    rotRef.current.targetX = Math.max(-0.85, Math.min(0.85, (activeProject.lat * Math.PI) / 180));
    rotRef.current.pulsePhase = 1.0;
  }, [activeProject.id, activeProject.lat, activeProject.lon, resetSignal]);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!glCanvas || !overlayCanvas) return;

    const gl = glCanvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    const octx = overlayCanvas.getContext('2d');

    if (!gl || !octx) {
      setWebglReady(false);
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) {
      setWebglReady(false);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglReady(false);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglReady(false);
      return;
    }
    gl.useProgram(program);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRotY = gl.getUniformLocation(program, 'uRotY');
    const uRotX = gl.getUniformLocation(program, 'uRotX');
    const uRadius = gl.getUniformLocation(program, 'uRadius');
    const uCenter = gl.getUniformLocation(program, 'uCenter');
    const uMode = gl.getUniformLocation(program, 'uMode');
    const uDayTex = gl.getUniformLocation(program, 'uDayTex');
    const uNightTex = gl.getUniformLocation(program, 'uNightTex');

    const RADIUS_UV = 0.435;
    const CENTER_X = 0.5;
    const CENTER_Y = 0.5;

    gl.uniform1f(uRadius, RADIUS_UV);
    gl.uniform2f(uCenter, CENTER_X, CENTER_Y);

    const createTex = (unit: number) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // 1x1 temporary pixel until image loads
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([22, 114, 72, 255])
      );
      return tex;
    };

    const dayTex = createTex(0);
    const nightTex = createTex(1);
    gl.uniform1i(uDayTex, 0);
    gl.uniform1i(uNightTex, 1);

    let dayReady = false;
    let nightReady = false;
    let disposed = false;

    const dayImg = new Image();
    dayImg.crossOrigin = 'anonymous';
    dayImg.onload = () => {
      if (disposed) return;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dayTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dayImg);
      dayReady = true;
      if (nightReady) setTexturesLoaded(true);
    };
    dayImg.onerror = () => {
      if (dayImg.src.includes('earth_atmos_2048')) {
        dayImg.src = '/assets/aistudio/earth_texture_1024_7c241c0d.jpg';
      }
    };
    dayImg.src = '/assets/aistudio/earth_atmos_2048_2faa400d.jpg';

    const nightImg = new Image();
    nightImg.crossOrigin = 'anonymous';
    nightImg.onload = () => {
      if (disposed) return;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, nightTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImg);
      nightReady = true;
      if (dayReady) setTexturesLoaded(true);
    };
    nightImg.src = '/assets/aistudio/night_lights_90f29409.jpg';

    let width = 220;
    let height = 220;

    const syncSize = () => {
      const rect = glCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      glCanvas.width = Math.round(width * dpr);
      glCanvas.height = Math.round(height * dpr);
      overlayCanvas.width = Math.round(width * dpr);
      overlayCanvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(glCanvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
    };
    const handleContextRestored = () => {
      setWebglReady(true);
    };
    glCanvas.addEventListener('webglcontextlost', handleContextLost);
    glCanvas.addEventListener('webglcontextrestored', handleContextRestored);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tick = 0;
    let rafId = 0;

    const renderFrame = () => {
      if (disposed) return;
      const rot = rotRef.current;
      const { projects: list, activeProject: active, lightingMode: mode, autoRotate: shouldAutoSpin } = propsRef.current;

      if (rot.targetY !== null && rot.targetX !== null) {
        let dy = rot.targetY - rot.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        rot.y += dy * 0.08;
        rot.x += (rot.targetX - rot.x) * 0.08;
        if (Math.abs(dy) < 0.004 && Math.abs(rot.targetX - rot.x) < 0.004) {
          rot.targetY = null;
          rot.targetX = null;
        }
      } else if (!rot.isDragging && shouldAutoSpin && rot.autoSpinActive && !prefersReducedMotion) {
        rot.y += 0.0012;
      }

      tick += prefersReducedMotion ? 0 : 0.016;

      if (dayReady) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const modeVal =
          mode === 'dawn' ? 0.0 : mode === 'noon' ? 1.0 : mode === 'sunset' ? 2.0 : 3.0;
        gl.uniform1f(uRotY, rot.y);
        gl.uniform1f(uRotX, rot.x);
        gl.uniform1f(uMode, modeVal);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // 2D Overlay: precision azimuth ticks, BDS-3 orbit, real-time projected pins
      octx.clearRect(0, 0, width, height);
      const cx = width * CENTER_X;
      const cy = height * CENTER_Y;
      const R = Math.min(width, height) * RADIUS_UV;

      // Luminous atmospheric halo ring against deep space
      octx.save();
      octx.beginPath();
      octx.arc(cx, cy, R + 0.6, 0, Math.PI * 2);
      octx.strokeStyle = mode === 'night' ? 'rgba(56, 189, 248, 0.34)' : 'rgba(186, 230, 253, 0.32)';
      octx.lineWidth = 1.1;
      octx.stroke();

      // Silky continuous BDS-3 orbital trajectory (zero synthetic dashed CAD segments)
      const tilt = -0.32;
      const orbitRX = R * 1.12;
      const orbitRY = R * 0.33;
      octx.beginPath();
      octx.ellipse(cx, cy, orbitRX, orbitRY, tilt, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(125, 211, 252, 0.16)';
      octx.lineWidth = 0.85;
      octx.stroke();

      // Trailing luminous orbital arc + BDS-3 satellite pinpoint
      const satAng = tick * 0.35;
      const trailStart = satAng - 0.55;
      octx.beginPath();
      octx.ellipse(cx, cy, orbitRX, orbitRY, tilt, trailStart, satAng);
      octx.strokeStyle = 'rgba(125, 211, 252, 0.58)';
      octx.lineWidth = 1.3;
      octx.stroke();

      const satX =
        cx +
        Math.cos(satAng) * orbitRX * Math.cos(tilt) -
        Math.sin(satAng) * orbitRY * Math.sin(tilt);
      const satY =
        cy +
        Math.cos(satAng) * orbitRX * Math.sin(tilt) +
        Math.sin(satAng) * orbitRY * Math.cos(tilt);

      octx.beginPath();
      octx.arc(satX, satY, 2.2, 0, Math.PI * 2);
      octx.fillStyle = '#e0f2fe';
      octx.fill();
      octx.beginPath();
      octx.arc(satX, satY, 4.8, 0, Math.PI * 2);
      octx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      octx.fill();

      // Project survey pins onto visible hemisphere
      const cosX = Math.cos(rot.x);
      const sinX = Math.sin(rot.x);
      list.forEach((proj) => {
        const phi = (proj.lat * Math.PI) / 180;
        const lon = (proj.lon * Math.PI) / 180;
        const dLon = lon - rot.y;

        const xe = Math.sin(dLon) * Math.cos(phi);
        const ye = Math.sin(phi);
        const ze = Math.cos(dLon) * Math.cos(phi);

        const dx = xe;
        const dy = ye * cosX - ze * sinX;
        const dz = ye * sinX + ze * cosX;

        if (dz > 0.08) {
          const px = cx + dx * R;
          const py = cy - dy * R;
          const isCurrent = proj.id === active.id;

          if (isCurrent) {
            const haloOpacity = 0.25 + ((Math.sin(tick * 2.4) + 1) * 0.5) * 0.45;
            octx.beginPath();
            octx.arc(px, py, 7.5, 0, Math.PI * 2);
            octx.strokeStyle = `rgba(52, 211, 153, ${haloOpacity})`;
            octx.lineWidth = 1.25;
            octx.stroke();

            octx.beginPath();
            octx.arc(px, py, 3.6, 0, Math.PI * 2);
            octx.fillStyle = '#167248';
            octx.fill();
            octx.strokeStyle = '#ffffff';
            octx.lineWidth = 1.5;
            octx.stroke();
          } else {
            octx.beginPath();
            octx.arc(px, py, 2.5, 0, Math.PI * 2);
            octx.fillStyle = proj.storageType === 'cloud' ? '#0284c7' : '#f59e0b';
            octx.fill();
            octx.strokeStyle = 'rgba(255,255,255,0.85)';
            octx.lineWidth = 1;
            octx.stroke();
          }
        }
      });

      // Scan wave when focusing a project
      if (rot.pulsePhase > 0.02) {
        const scanR = R * (1.02 - rot.pulsePhase * 0.35);
        octx.beginPath();
        octx.arc(cx, cy, scanR, 0, Math.PI * 2);
        octx.strokeStyle = `rgba(22, 114, 72, ${rot.pulsePhase * 0.5})`;
        octx.lineWidth = 1.5;
        octx.stroke();
        rot.pulsePhase *= 0.94;
      }

      octx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      glCanvas.removeEventListener('webglcontextlost', handleContextLost);
      glCanvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  // Pointer & touch dragging handlers
  const beginDrag = (clientX: number, clientY: number) => {
    const rot = rotRef.current;
    rot.isDragging = true;
    rot.autoSpinActive = false;
    rot.targetY = null;
    rot.targetX = null;
    rot.lastX = clientX;
    rot.lastY = clientY;
    clearTimeout(rot.idleTimer);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const rot = rotRef.current;
    if (!rot.isDragging) return;
    const dx = (clientX - rot.lastX) * 0.008;
    const dy = (clientY - rot.lastY) * 0.008;
    rot.y -= dx;
    rot.x = Math.max(-0.85, Math.min(0.85, rot.x + dy));
    rot.lastX = clientX;
    rot.lastY = clientY;
  };

  const endDrag = () => {
    const rot = rotRef.current;
    if (!rot.isDragging) return;
    rot.isDragging = false;
    clearTimeout(rot.idleTimer);
    rot.idleTimer = setTimeout(() => {
      if (propsRef.current.autoRotate) {
        rot.autoSpinActive = true;
      }
    }, 3500);
  };

  // Click detection on globe pins
  const handleGlobeClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !onSelectProject) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.5;
    const R = Math.min(rect.width, rect.height) * 0.435;
    const rot = rotRef.current;
    const cosX = Math.cos(rot.x);
    const sinX = Math.sin(rot.x);

    let closest: GisProject | null = null;
    let bestDist = 18;

    projects.forEach((proj) => {
      const phi = (proj.lat * Math.PI) / 180;
      const lon = (proj.lon * Math.PI) / 180;
      const dLon = lon - rot.y;
      const xe = Math.sin(dLon) * Math.cos(phi);
      const ye = Math.sin(phi);
      const ze = Math.cos(dLon) * Math.cos(phi);
      const dx = xe;
      const dy = ye * cosX - ze * sinX;
      const dz = ye * sinX + ze * cosX;
      if (dz > 0.08) {
        const px = cx + dx * R;
        const py = cy - dy * R;
        const d = Math.hypot(clickX - px, clickY - py);
        if (d < bestDist) {
          bestDist = d;
          closest = proj;
        }
      }
    });

    if (closest) {
      onSelectProject(closest);
    }
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Unobstructed Orbital 3D Globe Viewport with Smooth Entrance Fade & Scale */}
      <div className="globe-entrance relative h-[208px] w-[208px] @[560px]:h-[244px] @[560px]:w-[244px] @[720px]:h-[264px] @[720px]:w-[264px]">
        {/* Deep-space atmospheric halo */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-700 ease-out motion-reduce:transition-none ${
            texturesLoaded ? 'scale-100 opacity-100' : 'scale-90 opacity-45'
          }`}
          style={{
            background:
              lightingMode === 'night'
                ? 'radial-gradient(circle, rgba(56,189,248,0.26) 0%, rgba(14,116,144,0.12) 52%, transparent 72%)'
                : 'radial-gradient(circle, rgba(56,189,248,0.30) 0%, rgba(16,185,129,0.14) 52%, transparent 72%)',
          }}
        />

        {webglReady ? (
          <>
            <canvas
              ref={glCanvasRef}
              className={`pointer-events-none absolute inset-0 h-full w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                texturesLoaded ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-35'
              }`}
            />
            <canvas
              ref={overlayCanvasRef}
              onClick={handleGlobeClick}
              onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
              onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  beginDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 1) {
                  moveDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={endDrag}
              title="拖拽旋转地球，点击光点切换定位"
              className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border border-sky-400/30 bg-gradient-to-br from-[#0e2d48] to-[#0a4b38]">
            <span className="font-mono text-xs font-medium text-sky-200">
              {activeProject.coordinateLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
