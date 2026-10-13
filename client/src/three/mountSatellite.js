import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildSatellite } from "./buildSatellite.js";

/* Mounts the rotating satellite into `container`. Returns a function that cleans everything up. */
export function mountSatellite(container, { still = false, startAngle = 0.6 } = {}) {
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: still });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;               // dark, space-like reflections

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.3, 12.4);
  camera.lookAt(0, 0, 0);

  const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);   // warm sunlight
  sun.position.set(6, 5, 7);
  const rim = new THREE.DirectionalLight(0xc78bff, 1.4);   // violet-pink bounce light from behind
  rim.position.set(-7, 2, -6);
  scene.add(sun, rim, new THREE.AmbientLight(0x1a2236, 0.6));

  const sat = buildSatellite();
  const pivot = new THREE.Group();
  pivot.add(sat);
  pivot.rotation.x = 0.42;                         // tilt so the panels read like the reference
  pivot.rotation.z = -0.14;
  pivot.position.x = 0.4;                          // nudge right, away from the headline
  sat.rotation.y = startAngle;
  scene.add(pivot);

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the full 9.4-unit wingspan inside narrow containers
    camera.position.z = Math.max(12.4, 12.4 * (1.25 / camera.aspect));
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let raf = 0;
  const t0 = performance.now();
  function frame() {
    const t = (performance.now() - t0) / 1000;
    if (!reduced && !still) {
      sat.rotation.y = startAngle + t * 0.16;        // slow turn, about 40 s per revolution
      pivot.position.y = Math.sin(t * 0.5) * 0.12;   // faint drift
    }
    renderer.render(scene, camera);
    if (!still) raf = requestAnimationFrame(frame);
  }
  frame();

  return function dispose() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }
    });
    scene.environment && scene.environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}