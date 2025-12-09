
// Simplex 3D Noise function (standard implementation)
const simplexNoise = `
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0.0 + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  // Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

// Curl Noise approximation using Simplex noise
const curlNoise = `
${simplexNoise}

vec3 curl(float x, float y, float z) {
  float eps = 1.0, n1, n2, a, b;
  vec3 curl = vec3(0.0);
  vec3 v = vec3(x, y, z);

  n1 = snoise(vec3(v.x, v.y + eps, v.z));
  n2 = snoise(vec3(v.x, v.y - eps, v.z));
  a = (n1 - n2)/(2.0 * eps);
  n1 = snoise(vec3(v.x, v.y, v.z + eps));
  n2 = snoise(vec3(v.x, v.y, v.z - eps));
  b = (n1 - n2)/(2.0 * eps);
  curl.x = a - b;

  n1 = snoise(vec3(v.x + eps, v.y, v.z));
  n2 = snoise(vec3(v.x - eps, v.y, v.z));
  a = (n1 - n2)/(2.0 * eps);
  n1 = snoise(vec3(v.x, v.y + eps, v.z));
  n2 = snoise(vec3(v.x, v.y - eps, v.z));
  b = (n1 - n2)/(2.0 * eps);
  curl.y = a - b;

  n1 = snoise(vec3(v.x + eps, v.y, v.z));
  n2 = snoise(vec3(v.x - eps, v.y, v.z));
  a = (n1 - n2)/(2.0 * eps);
  n1 = snoise(vec3(v.x, v.y + eps, v.z));
  n2 = snoise(vec3(v.x, v.y - eps, v.z));
  b = (n1 - n2)/(2.0 * eps);
  curl.z = a - b;

  return curl;
}
`;

export const particleVertexShader = `
uniform float uTime;
uniform float uSize;
uniform vec3 uMouse;
uniform float uHoverRadius;
uniform float uMouseStrength;

// New Uniforms
uniform float uFlowSpeed;
uniform float uFlowAmplitude;
uniform float uDispersion;
uniform float uDepthStrength;
uniform float uDepthWave;
uniform float uAudioHigh; // Audio Reactivity

attribute vec3 color;
attribute vec3 initialPosition;

varying vec3 vColor;
varying vec2 vUv;
varying float vDepth;

${curlNoise}

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vUv = uv;
  vColor = color;
  
  vec3 pos = initialPosition;
  float lum = luminance(color);

  // 1. Z-Depth Relief ("Terrain" effect)
  pos.z += lum * uDepthStrength;

  // 2. Depth Wave
  pos.z += sin(pos.x * 0.5 + uTime * 0.5) * uDepthWave;

  // 3. Audio Reactivity (BOOM effect)
  // Higher audio level pushes bright particles further out
  pos.z += uAudioHigh * lum * 3.0;
  
  // 4. Dispersion (Transition & Scatter)
  float staticNoise = snoise(pos * 5.0 + uTime * 0.1);
  vec3 scatterDir = vec3(staticNoise, snoise(pos * 5.5), snoise(pos * 6.0));
  pos += scatterDir * uDispersion;

  // 5. Curl Noise Flow
  float flowTime = uTime * uFlowSpeed;
  vec3 noisePos = pos * 0.5 + vec3(0.0, 0.0, flowTime);
  vec3 curlVel = curl(noisePos.x, noisePos.y, noisePos.z);
  // Audio makes flow faster/more chaotic briefly?
  pos += curlVel * (uFlowAmplitude + uAudioHigh * 0.5);

  // 6. Mouse Repulsion
  float dist = distance(pos.xy, uMouse.xy);
  if(dist < uHoverRadius) {
    vec3 dir = normalize(pos - vec3(uMouse.xy, pos.z));
    float force = (uHoverRadius - dist) / uHoverRadius;
    force = smoothstep(0.0, 1.0, force); 
    force = pow(force, 2.0); 
    pos += dir * force * uMouseStrength;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  vDepth = -mvPosition.z;

  float finalSize = uSize;
  // Audio increases particle size slightly
  finalSize *= (1.0 + uAudioHigh * 0.5);

  gl_PointSize = finalSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Color shift helper
const colorShift = `
vec3 hueShift(vec3 color, float hue) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(hue);
    return vec3(color * cosAngle + cross(k, color) * sin(hue) + k * dot(k, color) * (1.0 - cosAngle));
}
`;

export const particleFragmentShader = `
uniform float uContrast;
uniform float uColorShiftSpeed;
uniform float uTime;

varying vec3 vColor;

${colorShift}

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float ll = length(xy);
  if(ll > 0.5) discard;
  float alpha = smoothstep(0.5, 0.3, ll);
  vec3 finalColor = pow(vColor, vec3(uContrast));
  if (uColorShiftSpeed > 0.0) {
      finalColor = hueShift(finalColor, uTime * uColorShiftSpeed);
  }
  gl_FragColor = vec4(finalColor, alpha);
}
`;
