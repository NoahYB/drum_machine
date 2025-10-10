// PSX-style vertex jitter and affine texture mapping shader
export const PSXVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  uniform float time;
  uniform float jitterAmount;
  
  // Snap vertices to grid (vertex jitter effect)
  vec3 snapToGrid(vec3 pos, float gridSize) {
    return floor(pos * gridSize + 0.5) / gridSize;
  }
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Transform position
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * worldPosition;
    
    // Apply VERY subtle vertex snapping only to XY to preserve depth
    // This gives PSX feel without breaking Z-buffer
    vec2 snappedXY = snapToGrid(viewPosition.xy, 200.0 / jitterAmount);
    viewPosition.xy = snappedXY;
    // Don't snap Z to avoid depth fighting!
    
    vPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const PSXFragmentShader = `
  uniform vec3 color;
  uniform float opacity;
  uniform sampler2D map;
  uniform bool hasTexture;
  uniform float time;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Dithering pattern (Bayer matrix 4x4)
  float dither4x4(vec2 position, float brightness) {
    int x = int(mod(position.x, 4.0));
    int y = int(mod(position.y, 4.0));
    int index = x + y * 4;
    float limit = 0.0;
    
    if (index == 0) limit = 0.0625;
    if (index == 1) limit = 0.5625;
    if (index == 2) limit = 0.1875;
    if (index == 3) limit = 0.6875;
    if (index == 4) limit = 0.8125;
    if (index == 5) limit = 0.3125;
    if (index == 6) limit = 0.9375;
    if (index == 7) limit = 0.4375;
    if (index == 8) limit = 0.25;
    if (index == 9) limit = 0.75;
    if (index == 10) limit = 0.125;
    if (index == 11) limit = 0.625;
    if (index == 12) limit = 1.0;
    if (index == 13) limit = 0.5;
    if (index == 14) limit = 0.875;
    if (index == 15) limit = 0.375;
    
    return brightness < limit ? 0.0 : 1.0;
  }
  
  // Reduce color depth (PS1 had limited color palette)
  vec3 reduceColorDepth(vec3 color, float levels) {
    return floor(color * levels) / levels;
  }
  
  void main() {
    vec3 baseColor = color;
    
    if (hasTexture) {
      // Affine texture mapping (no perspective correction)
      vec2 affineUv = vUv;
      vec4 texColor = texture2D(map, affineUv);
      baseColor = texColor.rgb * color;
    }
    
  // Brighter, simpler lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(vNormal, lightDir), 0.6);
  
  // Much brighter base lighting
  float lightAmount = diff * 0.6 + 0.7; // Base 0.7 brightness
  baseColor *= lightAmount;
    
    // Reduce color depth (less aggressive)
    baseColor = reduceColorDepth(baseColor, 16.0);
    
    // Subtle dithering
    float brightness = (baseColor.r + baseColor.g + baseColor.b) / 3.0;
    float dither = dither4x4(gl_FragCoord.xy, brightness);
    baseColor *= mix(0.95, 1.0, dither);
    
    gl_FragColor = vec4(baseColor, opacity);
  }
`;

