// KidNova robot. Rendered on the GPU (WebGL) with smooth shading; falls back to the
// original 2D-canvas painter when WebGL is unavailable.
(() => {
  const canvas = document.getElementById('robot3d');
  const stage = canvas.parentElement;
  stage.classList.add('has-3d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, dpr = 1, yaw = -.28, pitch = -.12, auto = !reduced, dragging = false, lastX, lastY, time = 0, visible = true;
  // `target` is the canvas currently drawn into: the hero canvas, or the travelling companion (see travel.js)
  let excited = false, exc = 0, reactAt = -1e9, spin = 0, jump = 0;     // hover / click reactions
  let target = canvas, yawFixed = null, asleep = false, pose = null;   // pose: {head:[yaw,pitch], arms:[leftRaise,leftSwing,rightRaise,rightSwing]}
  const yawNow = () => (yawFixed ?? yaw + (window.__kidnovaScrollYaw || 0)) + spin, pitchNow = () => yawFixed == null ? pitch : -.12;

  // ───────── Geometry: ellipsoid shells plus decals meshed on a host shell's surface ─────────
  const H = Math.PI / 2, HEAD = [0, -53, 0, 91, 78, 65], BODY = [0, 55, 0, 74, 65, 53];
  function buildQuads(fine) {
    const quads = [];
    const unit = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    function sphere(part, cx, cy, cz, rx, ry, rz, color, rows = 20, cols = 34, gloss = .28) {
      rows = Math.round(rows * (fine ? 1.5 : .7)); cols = Math.round(cols * (fine ? 1.5 : .7));
      const at = (a, b) => [cx + rx * Math.sin(a) * Math.cos(b), cy + ry * Math.cos(a), cz + rz * Math.sin(a) * Math.sin(b)];
      const nr = p => unit([(p[0] - cx) / (rx * rx), (p[1] - cy) / (ry * ry), (p[2] - cz) / (rz * rz)]);
      const da = Math.PI / rows, db = 2 * Math.PI / cols;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const a = i * da, b = j * db, pts = [at(a, b), at(a + da, b), at(a + da, b + db), at(a, b + db)];
        quads.push({ pts, nrm: pts.map(nr), uv: null, color, gloss, layer: 0, rad: 0, part });
      }
    }
    // A decal is an ellipse (centre a0,b0; radii ra,rb in surface angles) lifted slightly off its host shell.
    function decal(part, host, color, a0, b0, ra, rb, off, gloss, layer, cell) {
      const [cx, cy, cz, rx, ry, rz] = host;
      cell = fine ? Math.min(cell * 2, ra / 2, rb / 2) : cell * 1.5;
      const P = (a, b) => [cx + rx * off * Math.sin(a) * Math.cos(b), cy + ry * off * Math.cos(a), cz + rz * off * Math.sin(a) * Math.sin(b)];
      const nr = p => unit([(p[0] - cx) / (rx * rx), (p[1] - cy) / (ry * ry), (p[2] - cz) / (rz * rz)]);
      const na = Math.ceil(2 * ra / cell), nb = Math.ceil(2 * rb / cell), pad = fine ? 1 : 0;
      for (let i = -pad; i < na + pad; i++) for (let j = -pad; j < nb + pad; j++) {
        const a = a0 - ra + i * cell, b = b0 - rb + j * cell, ca = a + cell / 2 - a0, cb = b + cell / 2 - b0;
        if (fine) {                                     // keep every cell the ellipse touches; the shader trims the edge
          const ea = Math.max(0, Math.abs(ca) - cell / 2), eb = Math.max(0, Math.abs(cb) - cell / 2);
          if ((ea / ra) ** 2 + (eb / rb) ** 2 > 1) continue;
        } else if ((ca / ra) ** 2 + (cb / rb) ** 2 > 1) continue;
        const ab = [[a, b], [a + cell, b], [a + cell, b + cell], [a, b + cell]], pts = ab.map(q => P(q[0], q[1]));
        quads.push({ pts, nrm: pts.map(nr), uv: ab.map(q => [(q[0] - a0) / ra, (q[1] - b0) / rb]), color, gloss, layer, rad: Math.min(ra, rb) * (rx + ry + rz) / 3, part });
      }
    }
    sphere(0, 0, 55, 0, 74, 65, 53, [211, 231, 244]);
    sphere(1, 0, -53, 0, 91, 78, 65, [241, 248, 252]);
    sphere(2, -85, 40, 0, 19, 48, 23, [171, 207, 232]); sphere(3, 85, 40, 0, 19, 48, 23, [171, 207, 232]);
    sphere(0, -34, 119, 10, 29, 16, 37, [194, 220, 237]); sphere(0, 34, 119, 10, 29, 16, 37, [194, 220, 237]);
    sphere(1, 0, -137, 0, 5, 18, 5, [93, 178, 211], 12, 18); sphere(1, 0, -157, 0, 12, 12, 12, [55, 201, 219], 16, 24, .6);
    decal(1, HEAD, [12, 38, 62], H - .03, H, .58, .9, 1.012, .9, 1, .024);
    decal(1.5, HEAD, [70, 214, 230], H, H - .30, .22, .09, 1.026, .5, 2, .012); decal(1.5, HEAD, [70, 214, 230], H, H + .30, .22, .09, 1.026, .5, 2, .012);
    decal(1.5, HEAD, [255, 255, 255], H + .10, H - .27, .045, .034, 1.034, 0, 3, .01); decal(1.5, HEAD, [255, 255, 255], H + .10, H + .34, .045, .034, 1.034, 0, 3, .01);
    decal(0, BODY, [39, 117, 209], H + .06, H, .36, .33, 1.012, 0, 1, .028);
    decal(0, BODY, [115, 228, 239], H + .04, H + .09, .12, .095, 1.026, 0, 2, .012); decal(0, BODY, [115, 228, 239], H + .04, H - .09, .12, .095, 1.026, 0, 2, .012); decal(0, BODY, [115, 228, 239], H - .02, H, .12, .11, 1.026, 0, 2, .012);
    return quads;
  }

  // light and half-vector, in view space (y points down, as on screen)
  const Lv = [-.5, -.65, .6], Ll = Math.hypot(...Lv), Ld = Lv.map(x => x / Ll), Hv = [Ld[0], Ld[1], Ld[2] + 1], Hl = Math.hypot(...Hv), Hd = Hv.map(x => x / Hl);

  // ───────── WebGL renderer ─────────
  const VS = `attribute vec3 aP,aN,aC;attribute vec2 aG;attribute vec2 aUV;attribute float aR;
uniform vec4 uRot,uView,uHead,uArms;uniform float uPx;
varying vec3 vN,vC;varying float vG,vS;varying vec2 vUV;
vec3 rot(vec3 p){float xx=p.x*uRot.x+p.z*uRot.y,zz=-p.x*uRot.y+p.z*uRot.x;return vec3(xx,p.y*uRot.z-zz*uRot.w,p.y*uRot.w+zz*uRot.z);}
vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);}
vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,p.y*c-p.z*s,p.y*s+p.z*c);}
vec3 rz(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x*c-p.y*s,p.x*s+p.y*c,p.z);}
void main(){vec3 p=aP,n=aN;float part=floor(aG.y+.01);
if(part==1.){if(fract(aG.y)>.25)p.y=mix(p.y,-53.,uHead.z*.92);vec3 v=vec3(0.,8.,0.);p=ry(rx(p-v,uHead.y),uHead.x)+v;n=ry(rx(n,uHead.y),uHead.x);}
else if(part==2.){vec3 v=vec3(-82.,2.,0.);p=rx(rz(p-v,uArms.x),uArms.y)+v;n=rx(rz(n,uArms.x),uArms.y);}
else if(part==3.){vec3 v=vec3(82.,2.,0.);p=rx(rz(p-v,-uArms.z),uArms.w)+v;n=rx(rz(n,-uArms.z),uArms.w);}
p=rot(vec3(p.x,p.y+uView.w,p.z));float f=650./(650.-p.z);
gl_Position=vec4(p.x*f*uView.x,uView.z-p.y*f*uView.y,-p.z/500.,1.);
vN=rot(n);vC=aC;vG=aG.x;vUV=aUV;vS=aR>0.?clamp(1.6*uPx/aR,.02,.9):1.;}`;
  const FS = `precision mediump float;uniform vec3 uL,uH;
varying vec3 vN,vC;varying float vG,vS;varying vec2 vUV;
void main(){vec3 n=normalize(vN);float diff=max(0.,dot(n,uL)),spec=pow(max(0.,dot(n,uH)),28.)*vG,rim=pow(1.-max(0.,n.z),3.)*.16;
vec3 c=min(vec3(1.),vC*(.8+.28*diff-rim*.5)+spec+rim*.157);
float a=1.-smoothstep(1.-vS,1.,length(vUV));gl_FragColor=vec4(c*a,a);}`;
  // flat layer: 0 = solid (orbit lines), 1 = soft glow, 2 = dot with halo
  const VS2 = `attribute vec2 aPos,aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aPos,0.,1.);}`;
  const FS2 = `precision mediump float;uniform vec4 uColor;uniform float uKind;varying vec2 vUV;
void main(){float d=length(vUV),a=1.;
if(uKind>1.5)a=min(1.,(1.-smoothstep(.2,.3,d))+.55*exp(-d*d*7.)*(1.-smoothstep(.75,1.,d)));
else if(uKind>.5)a=1.-smoothstep(0.,1.,d);
a*=uColor.a;gl_FragColor=vec4(uColor.rgb*a,a);}`;

  let mesh = null;
  function getMesh() {
    if (mesh) return mesh;
    const quads = buildQuads(true), flat = list => {
      const out = new Float32Array(list.length * 6 * 14); let o = 0;
      for (const q of list) for (const k of [0, 1, 2, 0, 2, 3]) {
        const p = q.pts[k], n = q.nrm[k], uv = q.uv ? q.uv[k] : [0, 0];
        out[o++] = p[0]; out[o++] = p[1]; out[o++] = p[2]; out[o++] = n[0]; out[o++] = n[1]; out[o++] = n[2];
        out[o++] = q.color[0] / 255; out[o++] = q.color[1] / 255; out[o++] = q.color[2] / 255; out[o++] = q.gloss; out[o++] = q.part; out[o++] = uv[0]; out[o++] = uv[1]; out[o++] = q.rad;
      }
      return out;
    };
    return mesh = { opaque: flat(quads.filter(q => !q.layer)), decal: flat(quads.filter(q => q.layer).sort((a, b) => a.layer - b.layer)) };
  }
  function program(gl, vs, fs, attribs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function setup(S) {
    const gl = S.gl, m = getMesh(), U = (p, n) => gl.getUniformLocation(p, n);
    S.main = program(gl, VS, FS, ['aP', 'aN', 'aC', 'aG', 'aUV', 'aR']);
    S.flat = program(gl, VS2, FS2, ['aPos', 'aUV']);
    S.u = { rot: U(S.main, 'uRot'), view: U(S.main, 'uView'), px: U(S.main, 'uPx'), head: U(S.main, 'uHead'), arms: U(S.main, 'uArms'), L: U(S.main, 'uL'), H: U(S.main, 'uH'), color: U(S.flat, 'uColor'), kind: U(S.flat, 'uKind') };
    const buf = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
    S.vOpaque = buf(m.opaque); S.nOpaque = m.opaque.length / 14; S.vDecal = buf(m.decal); S.nDecal = m.decal.length / 14; S.vDyn = gl.createBuffer();
  }
  const states = new Map();                              // canvas -> GL state, or null when that canvas uses 2D
  function initGL(el) {
    if (states.has(el)) return states.get(el);
    let gl = null;
    try { gl = el.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true }); } catch (e) { }
    if (!gl) { states.set(el, null); return null; }
    const S = { gl };
    try { setup(S); } catch (e) { console.warn('KidNova robot: WebGL setup failed', e); states.set(el, null); return null; }
    el.addEventListener('webglcontextlost', e => e.preventDefault());
    el.addEventListener('webglcontextrestored', () => { try { setup(S); draw(); } catch (e) { } });
    states.set(el, S); return S;
  }
  const ringBuf = new Float32Array(101 * 4), quadBuf = new Float32Array(16);
  function drawGL(S) {
    const gl = S.gl; if (gl.isContextLost()) return;
    const yw = yawNow(), pt = pitchNow(), cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pt), sp = Math.sin(pt);
    const scale = Math.min(width / 390, height / 440), sx = scale * 2 / width, sv = scale * 2 / height, bob = reduced ? 0 : Math.sin(time * .0016) * 7 - Math.abs(Math.sin(time * .0095)) * 9 * exc - jump * 30, rel = scale / 1.27;
    const ndc = (x, y, z) => { const xx = x * cy + z * sy, zz = -x * sy + z * cy, f = 650 / (650 - (y * sp + zz * cp)); return [xx * f * sx, .06 - (y * cp - zz * sp) * f * sv]; };
    gl.viewport(0, 0, target.width, target.height); gl.clearColor(0, 0, 0, 0); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);

    const useFlat = () => {
      gl.useProgram(S.flat); gl.bindBuffer(gl.ARRAY_BUFFER, S.vDyn);
      for (let i = 2; i < 6; i++) gl.disableVertexAttribArray(i);
      gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    };
    const flat = (data, mode, kind, r, g, b, a) => { gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); gl.uniform4f(S.u.color, r, g, b, a); gl.uniform1f(S.u.kind, kind); gl.drawArrays(mode, 0, data.length / 4); };
    const quad = (x, y, hx, hy) => { quadBuf.set([x - hx, y - hy, -1, -1, x + hx, y - hy, 1, -1, x - hx, y + hy, -1, 1, x + hx, y + hy, 1, 1]); return quadBuf; };

    // floor glow and orbit lines sit behind the robot
    useFlat();
    flat(quad(0, -.68, .66, 34 * rel * 2 / height), gl.TRIANGLE_STRIP, 1, .216, .788, .859, .3);
    for (let ring = 0; ring < 3; ring++) {
      const r = 150 + ring * 16;
      for (let i = 0; i <= 100; i++) { const a = i * Math.PI / 50, q = ndc(Math.cos(a) * r, Math.sin(a) * 45 + 50, Math.sin(a) * r); ringBuf[i * 4] = q[0]; ringBuf[i * 4 + 1] = q[1]; ringBuf[i * 4 + 2] = 0; ringBuf[i * 4 + 3] = 0; }
      flat(ringBuf, gl.LINE_STRIP, 0, .153, .459, .82, ring ? .15 : .4);
    }

    // robot: opaque shells with depth, then decals blended on top (depth-tested, not written)
    gl.useProgram(S.main);
    gl.uniform4f(S.u.rot, cy, sy, cp, sp); gl.uniform4f(S.u.view, sx, sv, .06, bob); gl.uniform1f(S.u.px, 1 / (scale * dpr));
    // life: a blink every few seconds, a slight arm sway, plus whatever pose the companion asks for
    const bt = time % 4300, blink = reduced ? 0 : bt < 170 ? Math.sin(Math.PI * bt / 170) : 0, sway = reduced ? 0 : .05 + .05 * Math.sin(time * .0016);
    const hd = pose ? pose.head : [0, 0], ar = pose ? pose.arms : [0, 0, 0, 0];
    const up = exc * .95 + jump * 1.2;                  // arms go up when excited or jumping; eyes squeeze shut mid-jump
    gl.uniform4f(S.u.head, hd[0], hd[1], Math.max(blink, jump * .8), 0); gl.uniform4f(S.u.arms, Math.min(2.7, ar[0] + sway + up), ar[1], Math.min(2.7, ar[2] + sway + up), ar[3]);
    gl.uniform3f(S.u.L, Ld[0], Ld[1], Ld[2]); gl.uniform3f(S.u.H, Hd[0], Hd[1], Hd[2]);
    const bind = b => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      [[3, 0], [3, 12], [3, 24], [2, 36], [2, 44], [1, 52]].forEach(([n, off], i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 56, off); });
    };
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
    bind(S.vOpaque); gl.drawArrays(gl.TRIANGLES, 0, S.nOpaque);
    gl.enable(gl.BLEND); gl.depthMask(false);
    bind(S.vDecal); gl.drawArrays(gl.TRIANGLES, 0, S.nDecal);
    gl.depthMask(true); gl.disable(gl.DEPTH_TEST);

    // orbiting dot stays on top
    useFlat();
    const d = ndc(Math.cos(time * .0006) * 165, 50, Math.sin(time * .0006) * 165), hs = 18 * Math.max(.55, Math.min(1, rel));
    flat(quad(d[0], d[1], hs * 2 / width, hs * 2 / height), gl.TRIANGLE_STRIP, 2, .216, .788, .859, 1);
  }

  // ───────── 2D fallback (painter's algorithm, coarse mesh) ─────────
  let faces = null, ctx2d = null;
  function draw2d() {
    const ctx = ctx2d; if (!ctx) return;
    if (!faces) faces = buildQuads(false).map(q => { const n = [0, 1, 2].map(k => q.nrm.reduce((t, v) => t + v[k], 0)), l = Math.hypot(...n) || 1; return { points: q.pts, color: q.color, n: n.map(v => v / l), gloss: q.gloss, layer: q.layer }; });
    const yw = yawNow(), pt = pitchNow(), cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pt), sp = Math.sin(pt);
    const rot = (x, y, z) => { const xx = x * cy + z * sy, zz = -x * sy + z * cy; return [xx, y * cp - zz * sp, y * sp + zz * cp]; };
    const scale = Math.min(width / 390, height / 440), project = p => { const f = 650 / (650 - p[2]); return [width / 2 + p[0] * scale * f, height * .47 + p[1] * scale * f]; };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width / 2, height * .84, 0, width / 2, height * .84, width * .32); glow.addColorStop(0, '#37c9db42'); glow.addColorStop(1, '#37c9db00'); ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(width / 2, height * .84, width * .33, 30, 0, 0, Math.PI * 2); ctx.fill();
    for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); for (let i = 0; i <= 100; i++) { const a = i * Math.PI / 50, q = project(rot(Math.cos(a) * (150 + ring * 16), Math.sin(a) * 45 + 50, Math.sin(a) * (150 + ring * 16))); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.strokeStyle = ring === 0 ? '#2775d14f' : '#2775d119'; ctx.lineWidth = 1; ctx.stroke(); }
    const bob = reduced ? 0 : Math.sin(time * .0016) * 7 - Math.abs(Math.sin(time * .0095)) * 9 * exc - jump * 30, drawn = [];
    for (const f of faces) {
      const n = rot(f.n[0], f.n[1], f.n[2]);
      if (f.layer ? n[2] < .04 : n[2] < -.2) continue;
      const P = f.points, pts = [rot(P[0][0], P[0][1] + bob, P[0][2]), rot(P[1][0], P[1][1] + bob, P[1][2]), rot(P[2][0], P[2][1] + bob, P[2][2]), rot(P[3][0], P[3][1] + bob, P[3][2])];
      drawn.push({ f, n, pts, z: f.layer * 10000 + (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4 });
    }
    drawn.sort((a, b) => a.z - b.z);
    for (const { f, n, pts } of drawn) {
      const diff = Math.max(0, n[0] * Ld[0] + n[1] * Ld[1] + n[2] * Ld[2]), spec = Math.pow(Math.max(0, n[0] * Hd[0] + n[1] * Hd[1] + n[2] * Hd[2]), 28) * f.gloss, rim = Math.pow(1 - Math.max(0, n[2]), 3) * .16;
      const light = .8 + .28 * diff - rim * .5, k = spec * 255 + rim * 40, c = f.color;
      ctx.fillStyle = 'rgb(' + Math.min(255, Math.round(c[0] * light + k)) + ',' + Math.min(255, Math.round(c[1] * light + k)) + ',' + Math.min(255, Math.round(c[2] * light + k)) + ')';
      ctx.beginPath(); for (let m = 0; m < 4; m++) { const q = project(pts[m]); m ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6; ctx.stroke();
    }
    const q = project(rot(Math.cos(time * .0006) * 165, 50, Math.sin(time * .0006) * 165)); ctx.fillStyle = '#37c9db'; ctx.shadowBlur = 15; ctx.shadowColor = '#37c9db'; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }

  // ───────── Shared plumbing ─────────
  const heroGL = initGL(canvas);
  if (!heroGL) { ctx2d = canvas.getContext('2d'); if (!ctx2d) return; }
  function draw() {
    if (!(width > 0 && height > 0)) return;
    const S = states.get(target);
    if (S) drawGL(S); else draw2d();
  }
  function resize() {
    width = target.clientWidth; height = target.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, states.get(target) ? 2 : 1.5);
    target.width = Math.round(width * dpr); target.height = Math.round(height * dpr);
    draw();
  }
  function button() { const control = document.getElementById('rotate3d'); control.dataset.state = auto ? 'playing' : 'paused'; control.innerHTML = auto ? `Ⅱ <span>${window.kidnovaT('Pause', 'To‘xtatish', 'Пауза')}</span>` : `▷ <span>${window.kidnovaT('Auto rotate', 'Avto aylantirish', 'Автоповорот')}</span>`; }
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; yaw += (e.clientX - lastX) * .009; pitch = Math.max(-.65, Math.min(.65, pitch + (e.clientY - lastY) * .005)); lastX = e.clientX; lastY = e.clientY; draw(); });
  const release = () => dragging = false; canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); yaw += e.key === 'ArrowLeft' ? -.15 : e.key === 'ArrowRight' ? .15 : 0; pitch = Math.max(-.65, Math.min(.65, pitch + (e.key === 'ArrowUp' ? -.1 : e.key === 'ArrowDown' ? .1 : 0))); draw(); });
  document.getElementById('rotate3d').onclick = () => { auto = !auto; button(); };
  document.getElementById('reset3d').onclick = () => { yaw = -.28; pitch = -.12; draw(); };
  document.addEventListener('kidnova:language', button);
  new ResizeObserver(() => resize()).observe(stage); new IntersectionObserver(entries => visible = entries[0].isIntersecting).observe(stage); resize();

  // hooks for the travelling companion: switch canvas, pin the facing angle, pause drawing
  window.__kidnovaRobot = {
    hero: canvas,
    gpu: !!heroGL,
    use(el) { if (el === target) return true; if (!initGL(el)) return false; target = el; resize(); return true; },
    resize() { resize(); },
    get heroYaw() { return yaw + (window.__kidnovaScrollYaw || 0); },
    set yaw(v) { yawFixed = v; },
    set pose(v) { pose = v; },
    set excited(v) { excited = !!v; },
    react() { if (!reduced && time - reactAt > 850) reactAt = time; },
    set asleep(v) { asleep = v; }
  };

  let previous = 0;
  const minGap = heroGL ? 0 : 30;                        // the 2D fallback is expensive, so it runs at ~30 fps
  function frame(now) {
    if (now - previous < minGap) { requestAnimationFrame(frame); return; }
    const delta = Math.min(now - previous, 40); previous = now;
    if ((target === canvas ? visible : !asleep) && !document.hidden) {
      time += delta; if (auto && !dragging) yaw += delta * .00018;
      exc += ((excited ? 1 : 0) - exc) * .14;
      const q = Math.min(1, (time - reactAt) / 850);     // click reaction: one spin with a jump
      spin = q < 1 ? Math.PI * 2 * q * q * (3 - 2 * q) : 0; jump = q < 1 ? Math.sin(Math.PI * q) : 0;
      draw();
    }
    requestAnimationFrame(frame);
  }
  button(); requestAnimationFrame(frame);
})();
