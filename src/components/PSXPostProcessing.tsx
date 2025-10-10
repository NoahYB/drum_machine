import { useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// PSX Post-processing shader
const PSXPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    
    // CRT scanline effect
    float scanline(vec2 uv) {
      return sin(uv.y * resolution.y * 2.0) * 0.04;
    }
    
    // Vignette
    float vignette(vec2 uv) {
      uv *= 1.0 - uv.yx;
      float vig = uv.x * uv.y * 15.0;
      return pow(vig, 0.5);
    }
    
    // Chromatic aberration
    vec3 chromaticAberration(sampler2D tex, vec2 uv) {
      vec2 offset = vec2(0.002, 0.0);
      float r = texture2D(tex, uv - offset).r;
      float g = texture2D(tex, uv).g;
      float b = texture2D(tex, uv + offset).b;
      return vec3(r, g, b);
    }
    
    // Pixelation
    vec2 pixelate(vec2 uv, vec2 pixelSize) {
      return floor(uv * pixelSize) / pixelSize;
    }
    
    // CRT screen curvature
    vec2 curveScreen(vec2 uv) {
      uv = uv * 2.0 - 1.0;
      vec2 offset = abs(uv.yx) / vec2(6.0, 4.0);
      uv = uv + uv * offset * offset;
      uv = uv * 0.5 + 0.5;
      return uv;
    }
    
    void main() {
      // Apply subtle CRT curvature
      vec2 uv = curveScreen(vUv);
      
      // Pixelation for PSX feel (less aggressive)
      vec2 pixelSize = resolution / 1.2; // Higher resolution, just slightly pixelated
      uv = pixelate(uv, pixelSize);
      
      // Check if we're outside the curved screen
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      
      // Chromatic aberration
      vec3 color = chromaticAberration(tDiffuse, uv);
      
      // Subtle scanlines
      color -= scanline(uv) * 0.5;
      
      // Vignette
      color *= vignette(uv);
      
      // Add slight noise
      float noise = fract(sin(dot(uv + time * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
      color += noise * 0.015;
      
      // Subtle color banding (less aggressive)
      color = floor(color * 64.0) / 64.0;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export function PSXPostProcessing() {
  const { gl, scene, camera, size } = useThree();
  
  const composer = useMemo(() => {
    const renderTarget = new THREE.WebGLRenderTarget(
      size.width,
      size.height,
      {
        minFilter: THREE.NearestFilter, // No filtering for pixelated look
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }
    );
    
    const effectComposer = new EffectComposer(gl, renderTarget);
    effectComposer.setSize(size.width, size.height);
    
    const renderPass = new RenderPass(scene, camera);
    effectComposer.addPass(renderPass);
    
    const psxPass = new ShaderPass(PSXPostShader);
    psxPass.uniforms.resolution.value.set(size.width / 1.2, size.height / 1.2); // Higher res
    effectComposer.addPass(psxPass);
    
    return effectComposer;
  }, [gl, scene, camera, size]);
  
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);
  
  useFrame((_, delta) => {
    composer.render(delta);
  }, 1);
  
  return null;
}

