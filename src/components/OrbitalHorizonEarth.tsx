import { useEffect, useRef, useState } from 'react';
import { ResolvedAtmosphereMode } from '../types/gis';

interface OrbitalHorizonEarthProps {
  atmosphere: ResolvedAtmosphereMode;
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
uniform vec2 uResolution;
uniform float uRotY;
uniform float uRotX;
uniform float uMode;

void main() {
  vec2 fragPx = vUv * uResolution;
  float R = max(uResolution.x * 0.84, 480.0);
  float apexY = clamp(uResolution.y * 0.305, 195.0, 275.0);
  vec2 centerPx = vec2(uResolution.x * 0.5, apexY - R);

  vec2 p = (fragPx - centerPx) / R;
  float dist = length(p);

  // Outer exosphere atmospheric scatter halo above the curved horizon
  if (dist >= 1.0) {
    float outDist = dist - 1.0;
    if (outDist > 0.19) {
      discard;
    }
    float haloTight = exp(-outDist * 34.0) * 0.95;
    float haloWide = exp(-outDist * 10.5) * 0.38;
    float haloStrength = (haloTight + haloWide) * smoothstep(0.08, 0.68, p.y);

    vec3 haloColor;
    if (uMode < 0.5) {
      haloColor = mix(vec3(0.22, 0.86, 0.72), vec3(0.48, 0.92, 0.98), 0.5);
    } else if (uMode < 1.5) {
      haloColor = mix(vec3(0.28, 0.78, 1.0), vec3(0.62, 0.92, 1.0), 0.55);
    } else if (uMode < 2.5) {
      haloColor = mix(vec3(0.98, 0.58, 0.42), vec3(0.36, 0.80, 0.94), clamp(p.x * 0.5 + 0.5, 0.0, 1.0));
    } else {
      haloColor = mix(vec3(0.18, 0.78, 0.68), vec3(0.32, 0.78, 1.0), 0.55);
    }

    gl_FragColor = vec4(haloColor, clamp(haloStrength, 0.0, 1.0));
    return;
  }

  float edgeAlpha = smoothstep(1.0, 0.994, dist);
  float dx = clamp(p.x, -1.0, 1.0);
  float dy = clamp(p.y, -1.0, 1.0);
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

  vec3 normal = normalize(vec3(dx, dy, dz));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // Specular ocean glint
  float isWater = clamp((daySample.b - daySample.r * 0.72) * 2.6, 0.0, 1.0);

  // Crisp Rayleigh atmospheric limb scattering
  float fresnel = pow(1.0 - dz, 2.4);
  vec3 dayAtm = vec3(0.36, 0.82, 1.0) * fresnel * 0.78;
  vec3 nightAtm = vec3(0.24, 0.74, 0.94) * fresnel * 0.82;

  // City lights mask from NASA night lights map
  float cityMask = smoothstep(0.08, 0.60, nightSample.r);
  vec3 cityLights = vec3(1.0, 0.84, 0.50) * cityMask * 1.45;
  vec3 deepNightBase = daySample * vec3(0.26, 0.38, 0.54) + vec3(0.03, 0.07, 0.14);
  vec3 litNight = deepNightBase + cityLights + nightAtm;

  vec3 finalColor;
  if (uMode < 0.5) {
    // Dawn: golden-emerald eastern horizon sunrise
    vec3 sunDir = normalize(vec3(0.58, 0.44, 0.68));
    float ndotl = dot(normal, sunDir);
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 26.0);
    vec3 oceanSpec = vec3(0.95, 0.98, 1.0) * spec * isWater * 0.38;
    float dawnMix = smoothstep(-0.28, 0.30, ndotl);
    float dawnBand = exp(-pow((ndotl - 0.02) * 4.5, 2.0));
    vec3 dawnDay = daySample * (0.64 + 0.48 * max(0.0, ndotl)) + oceanSpec + vec3(0.28, 0.84, 0.90) * fresnel * 0.72;
    finalColor = mix(litNight * 0.96, dawnDay, dawnMix) + vec3(1.0, 0.82, 0.50) * dawnBand * 0.20;
  } else if (uMode < 1.5) {
    // Noon: crisp orbital Blue Marble daylight
    vec3 sunDir = normalize(vec3(-0.26, 0.64, 0.72));
    float ndotl = dot(normal, sunDir);
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 24.0);
    vec3 oceanSpec = vec3(0.94, 0.98, 1.0) * spec * isWater * 0.38;
    finalColor = daySample * (0.74 + 0.38 * max(0.0, ndotl)) + oceanSpec + dayAtm;
  } else if (uMode < 2.5) {
    // Sunset: coral-amber dusk terminator & emerging night lights
    vec3 sunDir = normalize(vec3(-0.66, 0.36, 0.65));
    float ndotl = dot(normal, sunDir);
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(0.0, dot(normal, halfDir)), 26.0);
    vec3 oceanSpec = vec3(1.0, 0.92, 0.86) * spec * isWater * 0.36;
    float sunsetMix = smoothstep(-0.26, 0.28, ndotl);
    float sunsetBand = exp(-pow((ndotl - 0.02) * 4.4, 2.0));
    vec3 sunsetDay = daySample * (0.58 + 0.52 * max(0.0, ndotl)) * vec3(1.04, 0.93, 0.88) + oceanSpec + vec3(0.90, 0.54, 0.66) * fresnel * 0.62;
    finalColor = mix(litNight, sunsetDay, sunsetMix) + vec3(1.0, 0.50, 0.30) * sunsetBand * 0.25;
  } else {
    // Night: luminous moonlit orbital Earth revealing continents, blue seas, and glowing city corridors
    vec3 moonDir = normalize(vec3(0.38, 0.58, 0.72));
    float moonNdotl = max(0.0, dot(normal, moonDir));
    vec3 moonHalf = normalize(moonDir + viewDir);
    float moonSpec = pow(max(0.0, dot(normal, moonHalf)), 22.0);
    vec3 moonOcean = vec3(0.68, 0.88, 1.0) * moonSpec * isWater * 0.24;
    finalColor = litNight + daySample * (0.24 + 0.30 * moonNdotl) + moonOcean;
  }

  // Gentle bottom readability gradient near lower bezel without blackening the Earth
  float bottomDarken = smoothstep(0.0, 95.0, fragPx.y);
  finalColor *= mix(0.84, 1.0, bottomDarken);

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

export function OrbitalHorizonEarth({ atmosphere }: OrbitalHorizonEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglReady, setWebglReady] = useState(true);
  const [texturesReady, setTexturesReady] = useState(false);

  const atmosphereRef = useRef(atmosphere);
  atmosphereRef.current = atmosphere;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
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

    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uRotY = gl.getUniformLocation(program, 'uRotY');
    const uRotX = gl.getUniformLocation(program, 'uRotX');
    const uMode = gl.getUniformLocation(program, 'uMode');
    const uDayTex = gl.getUniformLocation(program, 'uDayTex');
    const uNightTex = gl.getUniformLocation(program, 'uNightTex');

    const createTex = (unit: number, fallbackPixel: [number, number, number, number]) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array(fallbackPixel)
      );
      return tex;
    };

    const dayTex = createTex(0, [8, 28, 52, 255]);
    const nightTex = createTex(1, [4, 10, 20, 255]);
    gl.uniform1i(uDayTex, 0);
    gl.uniform1i(uNightTex, 1);

    let dayReady = false;
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
      setTexturesReady(true);
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
    };
    nightImg.src = '/assets/aistudio/night_lights_90f29409.jpg';

    let width = 412;
    let height = 820;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglReady(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Frame East Asia & Pacific across the curved horizon on launch
    let rotY = (108 * Math.PI) / 180;
    const rotX = -0.68;
    let rafId = 0;

    const renderFrame = () => {
      if (disposed) return;

      if (!prefersReducedMotion) {
        rotY += 0.00055;
      }

      if (dayReady) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const mode = atmosphereRef.current;
        const modeVal =
          mode === 'dawn' ? 0.0 : mode === 'noon' ? 1.0 : mode === 'sunset' ? 2.0 : 3.0;

        gl.uniform2f(uResolution, width, height);
        gl.uniform1f(uRotY, rotY);
        gl.uniform1f(uRotX, rotX);
        gl.uniform1f(uMode, modeVal);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      gl.deleteTexture(dayTex);
      gl.deleteTexture(nightTex);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  if (!webglReady) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[36%] overflow-hidden"
      >
        <div className="absolute bottom-[-360px] left-1/2 h-[540px] w-[165%] -translate-x-1/2 overflow-hidden rounded-[100%] border-t-[1.5px] border-sky-300/75 shadow-[0_-18px_52px_-10px_rgba(56,189,248,0.45)]">
          <img
            src="/assets/aistudio/earth_atmos_2048_2faa400d.jpg"
            alt=""
            className="h-full w-full object-cover object-[center_22%] brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040c18]/45 to-[#02060d]/85" />
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ease-out motion-reduce:transition-none ${
        texturesReady ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}
