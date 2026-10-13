import * as THREE from "three";

/* ---------- procedural textures (drawn on <canvas>, no image files needed) ---------- */

function solarCellTexture() {
  const W = 512, H = 640;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  // deep blue-black silicon
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1a2a52");
  grad.addColorStop(1, "#0f1a38");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // cell grid
  const cols = 8, rows = 10;
  const cw = W / cols, ch = H / rows;
  g.strokeStyle = "rgba(150,175,225,0.55)";
  g.lineWidth = 3;
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, H); g.stroke(); }
  for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(W, j * ch); g.stroke(); }
  // thin busbars inside every cell
  g.strokeStyle = "rgba(150,175,230,0.16)";
  g.lineWidth = 1;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw, y = j * ch;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (cw * k) / 4, y); g.lineTo(x + (cw * k) / 4, y + ch); g.stroke(); }
  }
  // bright four-point glints at the corners, like the reference
  g.fillStyle = "rgba(235,242,255,0.95)";
  for (let i = 1; i < cols; i += 2) for (let j = 1; j < rows; j += 2) {
    const x = i * cw, y = j * ch, r = 10;
    g.beginPath();
    g.moveTo(x, y - r); g.lineTo(x + 1.6, y - 1.6); g.lineTo(x + r, y); g.lineTo(x + 1.6, y + 1.6);
    g.lineTo(x, y + r); g.lineTo(x - 1.6, y + 1.6); g.lineTo(x - r, y); g.lineTo(x - 1.6, y - 1.6);
    g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function foilTextures() {
  const S = 512;
  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  color.width = color.height = bump.width = bump.height = S;
  const cg = color.getContext("2d"), bg = bump.getContext("2d");
  cg.fillStyle = "#6f6430"; cg.fillRect(0, 0, S, S);
  bg.fillStyle = "#808080"; bg.fillRect(0, 0, S, S);
  // crinkled multi-layer insulation: many random polygons, lit differently
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < 900; n++) {
    const x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 34;
    const pts = 3 + Math.floor(rnd() * 3);
    const lum = rnd();
    cg.fillStyle = `hsl(${48 + rnd() * 12}, ${24 + rnd() * 16}%, ${20 + lum * 30}%)`;
    bg.fillStyle = `hsl(0,0%,${25 + lum * 55}%)`;
    for (const ctx of [cg, bg]) {
      ctx.beginPath();
      for (let p = 0; p < pts; p++) {
        const a = (p / pts) * Math.PI * 2 + rnd();
        const rr = r * (0.5 + rnd() * 0.7);
        ctx[p ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 8; }
  return { map, bumpMap };
}

/* ---------- helpers ---------- */

function rodBetween(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

/* ---------- the satellite ----------
   Axes: bus runs along Z (dish faces +Z), solar wings extend along ±X, panel normals point +Y. */

export function buildSatellite() {
  const sat = new THREE.Group();

  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.85, roughness: 0.28 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1c1f27, metalness: 0.6, roughness: 0.5 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8e939e, metalness: 0.65, roughness: 0.42 });
  const brown = new THREE.MeshStandardMaterial({ color: 0x6b3f22, metalness: 0.2, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f3f5, metalness: 0.05, roughness: 0.55, side: THREE.DoubleSide });
  const foil = foilTextures();
  const gold = new THREE.MeshStandardMaterial({
    map: foil.map, bumpMap: foil.bumpMap, bumpScale: 1.6, metalness: 0.6, roughness: 0.42,
  });

  const cyl = (rt, rb, h, mat, seg = 48) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  const alongZ = (m) => { m.rotation.x = Math.PI / 2; return m; };

  // rear grey module with panel seams and brown strap
  const rear = alongZ(cyl(0.64, 0.64, 0.9, grey)); rear.position.z = -0.85; sat.add(rear);
  const rearCap = alongZ(cyl(0.5, 0.64, 0.14, grey)); rearCap.position.z = -1.37; sat.add(rearCap);
  const nose = alongZ(cyl(0.2, 0.34, 0.26, gold)); nose.position.z = -1.55; sat.add(nose);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.655, 0.045, 12, 64), brown);
  strap.position.z = -0.62; sat.add(strap);
  for (let i = 0; i < 8; i++) {              // raised seams on the grey module
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.9), darkMetal);
    const a = (i / 8) * Math.PI * 2;
    seam.position.set(Math.cos(a) * 0.645, Math.sin(a) * 0.645, -0.85);
    seam.rotation.z = a;
    sat.add(seam);
  }
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.3), darkMetal);
  hatch.position.set(0, 0.645, -0.95); sat.add(hatch);

  // gold-foil mid section
  const mid = alongZ(cyl(0.52, 0.52, 1.05, gold)); mid.position.z = 0.1; sat.add(mid);
  const straps = [-0.3, 0.45];
  for (const z of straps) {                    // thin copper-coloured tie bands
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.526, 0.014, 8, 64), brown);
    band.position.z = z; sat.add(band);
  }

  // silver collars and dark gasket toward the dish
  const collar = alongZ(cyl(0.58, 0.58, 0.16, silver)); collar.position.z = 0.7; sat.add(collar);
  const gasket = alongZ(cyl(0.5, 0.5, 0.1, darkMetal)); gasket.position.z = 0.82; sat.add(gasket);
  const collar2 = alongZ(cyl(0.6, 0.5, 0.2, silver)); collar2.position.z = 0.95; sat.add(collar2);

  // parabolic dish (y = k r^2), opening toward +Z
  const k = 0.3, R = 1.0, pts = [];
  for (let i = 0; i <= 28; i++) { const r = (i / 28) * R; pts.push(new THREE.Vector2(r, k * r * r)); }
  const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), white);
  dish.rotation.x = Math.PI / 2;               // Lathe axis +Y -> +Z
  dish.position.z = 1.08;
  sat.add(dish);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 80), silver);
  rim.position.z = 1.08 + k * R * R; sat.add(rim);
  const focusZ = 1.08 + 1 / (4 * k);
  const feed = new THREE.Vector3(0, 0, focusZ);
  for (let i = 0; i < 3; i++) {                // tripod feed struts
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const root = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 1.08 + k * R * R);
    sat.add(rodBetween(root, feed, 0.02, silver));
  }
  const horn = alongZ(cyl(0.035, 0.07, 0.14, silver, 16)); horn.position.z = focusZ - 0.04; sat.add(horn);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), silver);
  hub.position.z = 1.1; sat.add(hub);

  // solar array boom with two silver nodes
  const boom = cyl(0.028, 0.028, 9.4, silver, 12); boom.rotation.z = Math.PI / 2; boom.position.set(0, -0.05, -0.85); sat.add(boom);
  for (const s of [-1, 1]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), silver);
    node.position.set(s * 0.78, 0, -0.85); sat.add(node);
  }

  // two wings, three panels each
  const cells = solarCellTexture();
  const cellMat = new THREE.MeshStandardMaterial({ map: cells, metalness: 0.55, roughness: 0.32 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.4, roughness: 0.6 });
  const PW = 1.22, PD = 1.56, GAP = 0.07, X0 = 1.0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const cx = s * (X0 + PW / 2 + i * (PW + GAP));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.07, 0.03, PD + 0.07), silver);
      frame.position.set(cx, 0, -0.85);
      const face = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.034, PD), [darkMetal, darkMetal, cellMat, backMat, darkMetal, darkMetal]);
      face.position.set(cx, 0.001, -0.85);
      sat.add(frame, face);
      if (i < 2) {                               // hinge bar between panels
        const hinge = new THREE.Mesh(new THREE.BoxGeometry(GAP + 0.06, 0.03, 0.3), silver);
        hinge.position.set(cx + s * (PW / 2 + GAP / 2), 0, -0.85);
        sat.add(hinge);
      }
    }
  }
  return sat;
}
