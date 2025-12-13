
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
varying vec2 vUv; 

varying vec3 vColor;
varying float vDepth;
varying float vEdgeIntensity; 

${curlNoise}

float luminance(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vUv = uv;
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  
  float edgeNoise = snoise(vec3(uv * 3.5, uTime * 0.15)) * 0.15;
  float maskRadius = 0.38 + edgeNoise;
  
  float alphaMask = 1.0 - smoothstep(maskRadius, maskRadius + 0.08, dist);
  
  if (alphaMask < 0.01) {
    gl_Position = vec4(10.0, 10.0, 10.0, 1.0); 
    return;
  }

  float edgeGlow = smoothstep(maskRadius, maskRadius + 0.08, dist);
  vEdgeIntensity = edgeGlow; 

  vec3 finalColor = mix(color, vec3(1.0, 1.0, 1.0), edgeGlow * 0.7);
  vColor = finalColor;

  vec3 pos = initialPosition;
  float lum = luminance(finalColor);

  pos.z += lum * uDepthStrength;
  pos.z += sin(pos.x * 0.5 + uTime * 0.5) * uDepthWave;
  pos.z += uAudioHigh * lum * 3.0;
  
  float staticNoise = snoise(pos * 5.0 + uTime * 0.1);
  vec3 scatterDir = vec3(staticNoise, snoise(pos * 5.5), snoise(pos * 6.0));
  pos += scatterDir * uDispersion;

  float edgeInstability = 1.0 + edgeGlow * 2.5; 
  
  float flowTime = uTime * uFlowSpeed;
  vec3 noisePos = pos * 0.5 + vec3(0.0, 0.0, flowTime);
  vec3 curlVel = curl(noisePos.x, noisePos.y, noisePos.z);
  pos += curlVel * (uFlowAmplitude * edgeInstability + uAudioHigh * 0.5);

  float mouseDist = distance(pos.xy, uMouse.xy);
  if(mouseDist < uHoverRadius) {
    vec3 dir = normalize(pos - vec3(uMouse.xy, pos.z));
    float force = (uHoverRadius - mouseDist) / uHoverRadius;
    force = smoothstep(0.0, 1.0, force); 
    force = pow(force, 2.0); 
    pos += dir * force * uMouseStrength;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;
  
  float sizeFade = smoothstep(maskRadius + 0.08, maskRadius, dist); 
  
  float finalSize = uSize * sizeFade;
  finalSize *= (1.0 + uAudioHigh * 0.5);

  gl_PointSize = finalSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

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
varying float vEdgeIntensity; 

${colorShift}

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float ll = length(xy);
  if(ll > 0.5) discard;
  
  float alpha = smoothstep(0.5, 0.3, ll);
  alpha *= (1.0 - vEdgeIntensity * 0.3); 

  vec3 finalColor = pow(vColor, vec3(uContrast));
  if (uColorShiftSpeed > 0.0) {
      finalColor = hueShift(finalColor, uTime * uColorShiftSpeed);
  }
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ============================================
// FOREST BACKGROUND SHADER
// ============================================

export const forestVertexShader = `
uniform float uTime;
uniform sampler2D uTexture;
attribute vec3 initialPosition; // Grid position
attribute vec2 aUv;
varying vec3 vWorldPos;
varying vec3 vColor;

void main() {
  vec3 pos = initialPosition;
  
  // Sample image for color and height
  vec4 tex = texture2D(uTexture, aUv);
  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  
  // Displace Z based on luminance (Relief mapping)
  pos.z += lum * 3.0; 
  
  // Slight wind movement
  pos.x += sin(pos.y * 0.5 + uTime * 0.2) * 0.1;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vColor = tex.rgb;

  vec4 mvPosition = viewMatrix * worldPos;
  gl_PointSize = 3.0 * (30.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const forestFragmentShader = `
uniform vec3 uFireflies[10]; // Array of firefly positions
uniform vec3 uMouse;
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vColor;

void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  if(length(xy) > 0.5) discard;

  // Base ambient darkness
  float light = 0.05;

  // Add light from Fireflies
  for(int i = 0; i < 10; i++) {
    float dist = distance(vWorldPos, uFireflies[i]);
    // Inverse square falloff with a cap
    float intensity = 1.0 / (0.5 + dist * dist * 1.5);
    light += intensity * 0.6; // Firefly strength
  }
  
  // Add light from Mouse
  // Assume mouse is projected to z=0 or similar depth for this simple 2D/3D interactions
  // Or just use a simple radius check
  float mouseDist = distance(vWorldPos.xy, uMouse.xy * 8.0); // Rough scaling
  light += (1.0 - smoothstep(0.0, 4.0, mouseDist)) * 0.5;

  vec3 finalColor = vColor * light;
  
  // Make particles fade in distance (fog-like)
  float depth = gl_FragCoord.z / gl_FragCoord.w;
  finalColor = mix(finalColor, vec3(0.01, 0.01, 0.02), smoothstep(5.0, 25.0, depth));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ============================================
// MEMORY SPHERE NODE SHADER
// ============================================

export const sphereVertexShader = `
uniform float uTime;
uniform float uPulseSpeed;
attribute vec3 color;
varying vec3 vColor;

void main() {
  vColor = color;
  vec3 pos = position;
  
  // Breathing animation
  float pulse = 1.0 + sin(uTime * uPulseSpeed) * 0.05;
  pos *= pulse;

  // Rotate slowly
  float c = cos(uTime * 0.1);
  float s = sin(uTime * 0.1);
  mat2 rot = mat2(c, -s, s, c);
  pos.xz = rot * pos.xz;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 2.5 * (10.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const sphereFragmentShader = `
varying vec3 vColor;
void main() {
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float d = length(xy);
  if(d > 0.5) discard;

  // Glowy center
  float glow = 1.0 - smoothstep(0.0, 0.5, d);
  glow = pow(glow, 2.0);

  gl_FragColor = vec4(vColor * 1.5, glow); // Emissive boost
}
`;
