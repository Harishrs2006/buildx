import * as THREE from 'three';

// Hand-written GLSL for the effects three.js materials do not give us: a sky that shifts from
// golden hour to dusk, city towers whose windows light up at night, a rippling bath surface
// and a falling stream of water.

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uNight: { value: 0 },
      uDayTop: { value: new THREE.Color('#7FA6CF') },
      uDayHorizon: { value: new THREE.Color('#F4D7A8') },
      uNightTop: { value: new THREE.Color('#0A0F24') },
      uNightHorizon: { value: new THREE.Color('#E0784A') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      uniform vec3 uDayTop, uDayHorizon, uNightTop, uNightHorizon;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 top = mix(uDayTop, uNightTop, uNight);
        vec3 hor = mix(uDayHorizon, uNightHorizon, uNight);
        // dusk keeps a thin warm band right on the horizon, then deep blue above
        float band = pow(1.0 - h, mix(3.0, 9.0, uNight));
        vec3 col = mix(top, hor, band);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// Instanced city towers: Lambert-ish shading by day, a grid of warm/cool windows by night
export function makeCityMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uNight: { value: 0 }, uBase: { value: new THREE.Color('#8C8676') }, uSun: { value: new THREE.Vector3(-0.5, 0.8, 0.35).normalize() } },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vSeed;
      void main() {
        vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uNight;
      uniform vec3 uBase;
      uniform vec3 uSun;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vSeed;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main() {
        float light = 0.45 + 0.55 * max(dot(normalize(vNormal), uSun), 0.0);
        vec3 col = uBase * mix(1.0, 0.18, uNight) * light * (0.85 + 0.3 * vSeed);
        // windows on the side faces only
        if (abs(vNormal.y) < 0.5) {
          vec2 uv = vec2(vWorld.x + vWorld.z, vWorld.y);
          vec2 cell = floor(uv * vec2(1.4, 1.1));
          vec2 f = fract(uv * vec2(1.4, 1.1));
          float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.8);
          float lit = step(0.42, hash(cell + vSeed * 31.0));
          vec3 warm = mix(vec3(1.0, 0.78, 0.45), vec3(0.75, 0.9, 1.0), step(0.8, hash(cell * 1.7)));
          col += win * lit * warm * uNight * 1.4;
          col += win * (1.0 - uNight) * vec3(0.06, 0.08, 0.1);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });
}

// Bath water: concentric ripples from where the stream lands, with a bright fresnel-like rim
export function makeWaterSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#1B6E9E') },
      uShallow: { value: new THREE.Color('#8FE3FF') },
      uImpact: { value: new THREE.Vector2(0.55, 0.5) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeep, uShallow;
      uniform vec2 uImpact;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        float edge = smoothstep(0.5, 0.36, length(c));
        float d = distance(vUv, uImpact);
        float rings = sin(d * 70.0 - uTime * 7.0) * exp(-d * 5.0);
        float caustic = sin((vUv.x + uTime * 0.05) * 40.0) * sin((vUv.y - uTime * 0.04) * 37.0);
        vec3 col = mix(uDeep, uShallow, 0.45 + 0.35 * rings + 0.12 * caustic);
        col += pow(max(rings, 0.0), 3.0) * 0.6;
        gl_FragColor = vec4(col, 0.88 * edge);
      }
    `,
  });
}

// Falling stream: streaks scroll down a thin cylinder
export function makeStreamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOn;
      varying vec2 vUv;
      void main() {
        float streak = 0.55 + 0.45 * sin(vUv.y * 60.0 + uTime * 26.0 + sin(vUv.x * 18.0) * 2.0);
        float side = 1.0 - abs(vUv.x - 0.5) * 1.6;
        vec3 col = mix(vec3(0.55, 0.85, 1.0), vec3(1.0), streak * 0.6);
        gl_FragColor = vec4(col, 0.75 * streak * uOn * side);
      }
    `,
  });
}
