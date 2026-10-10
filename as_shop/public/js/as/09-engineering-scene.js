/* مسئولیت این فایل: ساخت صحنهٔ نمایشی سه‌بعدی AS. */
/**
 * SHN / as / engineering-scene
 * Extracted from the original inline script #9.
 * Load order is defined by pages/index.html. See docs/CODE_MAP.fa.md.
 */
/* Scroll-driven engineering assembly. On-demand rendering, no continuous background loop. */
window.ASScene = function (host, options = {}) {
  if (!window.THREE) return null;
  const T = THREE;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(7, 6, 10);
  camera.lookAt(0, 0, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const assembly = new T.Group();
  scene.add(assembly);
  const materials = [],
    geometries = [];
  const material = (color, metalness = 0.75, roughness = 0.3) => {
    const m = new T.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  };
  const metal = material("#b6c3bc"),
    dark = material("#343e38", 0.65, 0.34),
    lime = material("#d5ef57", 0.35, 0.24),
    brass = material("#b9944c", 0.8, 0.25);
  scene.add(new T.HemisphereLight(0xecfff1, 0x1c2922, 2.8));
  const a = new T.DirectionalLight(0xffffff, 4.5);
  a.position.set(4, 7, 5);
  scene.add(a);
  const b = new T.DirectionalLight(0xc7e1fa, 3);
  b.position.set(-5, 2, -2);
  scene.add(b);
  function add(g, m, pos = [0, 0, 0]) {
    geometries.push(g);
    const o = new T.Mesh(g, m);
    o.position.set(...pos);
    assembly.add(o);
    return o;
  }
  /** ring: engineering-scene feature. Keep related handlers in this module. */
  function ring(outer, inner, height, m) {
    const s = new T.Shape();
    s.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const g = new T.ExtrudeGeometry(s, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      curveSegments: 64,
    });
    g.rotateX(Math.PI / 2);
    g.translate(0, height / 2, 0);
    return add(g, m);
  }
  const layers = [
    ring(2.2, 0.84, 0.24, dark),
    ring(2.03, 0.85, 0.12, metal),
    ring(1.85, 0.88, 0.34, metal),
    ring(1.68, 0.88, 0.1, lime),
    ring(1.48, 0.75, 0.25, brass),
  ];
  const core = add(new T.CylinderGeometry(0.65, 0.65, 1.8, 48), dark),
    cap = add(new T.CylinderGeometry(0.74, 0.74, 0.18, 48), lime, [0, 1.03, 0]);
  const screws = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3,
      screw = new T.Group();
    const shaft = add(new T.CylinderGeometry(0.065, 0.065, 1, 12), metal);
    assembly.remove(shaft);
    screw.add(shaft);
    const head = add(new T.CylinderGeometry(0.15, 0.15, 0.12, 6), dark, [0, 0.51, 0]);
    assembly.remove(head);
    screw.add(head);
    screw.position.set(Math.cos(angle) * 1.77, 0, Math.sin(angle) * 1.77);
    assembly.add(screw);
    screws.push(screw);
  }
  const edge = new T.LineSegments(
    new T.EdgesGeometry(layers[2].geometry, 25),
    new T.LineBasicMaterial({ color: "#d5ef57", transparent: true, opacity: 0.4 }),
  );
  layers[2].add(edge);
  geometries.push(edge.geometry);
  materials.push(edge.material);
  let progress = 0,
    dragX = 0,
    dragY = 0,
    raf = 0,
    dead = false;
  /** draw: engineering-scene feature. Keep related handlers in this module. */
  function draw() {
    raf = 0;
    if (dead) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    assembly.rotation.set(0.13 + dragY, -0.45 + progress * 2.9 + dragX, progress * 0.14);
    const explode = Math.sin(progress * Math.PI);
    layers.forEach((o, i) => {
      o.position.y = (i - 2) * (0.31 + explode * 0.8);
      o.rotation.y = i % 2 ? progress * 0.8 : -progress * 0.4;
      o.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.04 * i);
    });
    screws.forEach((o) => (o.position.y = 0.45 + explode * 1.6));
    core.scale.y = 1 + explode * 0.3;
    cap.position.y = 1.05 + explode * 1.4;
    edge.material.opacity = 0.2 + 0.7 * Math.max(0, 1 - progress * 2);
    renderer.render(scene, camera);
  }
  const request = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const resize = new ResizeObserver(request);
  resize.observe(host);
  let drag = null;
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  function down(e) {
    if (!options.drag) return;
    drag = [e.clientX, e.clientY];
    host.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (drag) {
      dragX += (e.clientX - drag[0]) * 0.01;
      dragY += (e.clientY - drag[1]) * 0.008;
      drag = [e.clientX, e.clientY];
      request();
    }
  }
  function up() {
    drag = null;
  }
  request();
  return {
    setProgress(p) {
      progress = Math.max(0, Math.min(1, p));
      request();
    },
    setColor(color) {
      metal.color.set(color);
      request();
    },
    view(index) {
      dragX = (index * Math.PI) / 2;
      dragY = index === 2 ? -0.55 : 0;
      request();
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
};
