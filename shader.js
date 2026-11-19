function initWebGLShader(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Retina/4K: render at devicePixelRatio, capped to ~8.3 MP (3840x2160) for GPU budget.
  const MAX_PIXELS = 3840 * 2160;
  // Adaptieve kwaliteit: start lager op kleine/zwakke apparaten en schaal terug als frames traag zijn.
  let scale = (window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4) ? 0.6 : 1;
  function syncSize() {
    const cw = canvas.clientWidth || window.innerWidth;
    const ch = canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
    if (cw * ch * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (cw * ch));
    const w = Math.max(1, Math.round(cw * dpr));
    const h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vs = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      v_texCoord = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fs = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_rich;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float grid(vec2 st, float res) {
      vec2 gridPos = fract(st * res);
      vec2 lines = smoothstep(0.02, 0.0, abs(gridPos - 0.5) - 0.48);
      return max(lines.x, lines.y);
    }

    void main() {
      vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      vec2 normCoord = gl_FragCoord.xy / u_resolution.xy;
      
      vec2 p = st;
      p.y += 0.35;
      float z = 1.0 / (abs(p.y) + 0.15);
      vec2 plane = vec2(p.x * z * 0.75, z + u_time * 0.4);
      
      float g = grid(plane, 3.0) * smoothstep(12.0, 0.5, z);
      float pulse = sin(plane.y * 2.0 - u_time * 3.0) * 0.5 + 0.5;
      pulse *= step(0.7, hash(floor(plane * 3.0)));
      
      float glow = 0.0;
      vec2 ip = floor(plane * 3.0);
      if (hash(ip) > 0.82) {
        vec2 fp = fract(plane * 3.0) - 0.5;
        float d = length(fp);
        glow = smoothstep(0.35, 0.02, d) * (sin(u_time * 2.5 + hash(ip) * 6.28) * 0.5 + 0.5);
      }

      float vig = 1.0 - smoothstep(0.1, 0.95, length(st * 1.1));
      
      vec3 baseColor = vec3(0.04, 0.06, 0.09);
      vec3 gridColor = vec3(0.0, 0.4, 1.0) * (g * 0.45);
      vec3 pulseColor = vec3(0.2, 0.8, 1.0) * (pulse * g * 1.8);
      vec3 sparkColor = vec3(0.1, 0.95, 0.65) * (glow * 2.2);

      vec3 col = baseColor + gridColor + pulseColor + sparkColor;
      if (u_rich > 0.5) {
        // Stroomlijnen: drie zachte 'geleiders' met lopende energiepakketten (alleen home)
        float t = u_time;
        vec3 cur = vec3(0.0);
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float y0 = 0.18 + fi * 0.16;
          float y = y0 + 0.035 * sin(st.x * (2.2 + fi * 0.7) + t * (0.35 + fi * 0.12)) + 0.012 * sin(st.x * 9.0 - t * 1.3 + fi);
          float d = abs(st.y - y);
          float line = 0.0016 / (d + 0.0016);
          float packet = pow(0.5 + 0.5 * sin(st.x * 2.4 - t * (1.1 + fi * 0.25) + fi * 2.1), 18.0);
          vec3 c = fi < 0.5 ? vec3(0.23, 0.55, 1.0) : (fi < 1.5 ? vec3(0.22, 0.74, 0.97) : vec3(0.35, 0.67, 0.84));
          cur += c * line * (0.22 + 1.6 * packet);
        }
        float fade = smoothstep(0.95, 0.15, abs(st.x)) ;
        col += cur * fade * 0.55;
        // Zwevende deeltjes
        vec2 q = st * 14.0 + vec2(0.0, -t * 0.25);
        vec2 qi = floor(q); vec2 qf = fract(q) - 0.5;
        float h = hash(qi);
        if (h > 0.9) {
          vec2 o = vec2(hash(qi + 3.1), hash(qi + 7.7)) - 0.5;
          float pd = length(qf - o * 0.6);
          float tw = 0.5 + 0.5 * sin(t * 2.0 + h * 40.0);
          col += vec3(0.4, 0.75, 1.0) * smoothstep(0.08, 0.0, pd) * tw * 0.9;
        }
        // Zachte glow rond de muis
        vec2 m = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        col += vec3(0.1, 0.35, 0.9) * 0.18 * smoothstep(0.5, 0.0, length(st - m));
      }
      col *= vig;
      col *= smoothstep(0.0, 0.3, normCoord.y);

      gl_FragColor = vec4(col, 0.85);
    }
  `;

  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uRich = gl.getUniformLocation(prog, 'u_rich');
  // Rijke modus alleen met echte GPU en voldoende ruimte; software-GL (SwiftShader/llvmpipe) en kleine schermen krijgen de lichte variant.
  let soft = false;
  try { const dbg = gl.getExtension('WEBGL_debug_renderer_info'); const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''; soft = /swiftshader|llvmpipe|software|basic render/i.test(r); } catch (e) {}
  if (/[?&]fx=full\b/.test(location.search)) soft = false; // preview/screenshot: forceer volle kwaliteit
  if (soft) scale = Math.min(scale, 0.5);
  const rich = (canvas.hasAttribute('data-rich') && !soft && window.innerWidth >= 768 && (navigator.hardwareConcurrency || 8) > 4) ? 1 : 0;

  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1.0 - (e.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  });

  // Zonder GPU (software-GL) of bij reduced-motion: één stilstaand frame, geen CPU-zware animatielus.
  const reduce = soft || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let running = true;
  document.addEventListener('visibilitychange', () => {
    const was = running; running = !document.hidden;
    if (running && !was && !reduce) requestAnimationFrame(render);
  });
  let last = 0, acc = 0, n = 0;
  const FRAME = 1000 / 40; // max ~40 fps: rustige achtergrond, minder CPU/GPU
  function render(t) {
    if (!running) return;
    if (!reduce && t - last < FRAME) { requestAnimationFrame(render); return; }
    if (last) { acc += t - last; n++; if (n === 20) { if (acc / n > 45 && scale > 0.3) { scale *= 0.6; } acc = 0; n = 0; } }
    last = t;
    syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    if (uRich) gl.uniform1f(uRich, rich);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduce) requestAnimationFrame(render);
  }
  const start = () => requestAnimationFrame(render);
  // Start pas na load + idle, zodat de eerste weergave en interactie niet worden geblokkeerd.
  const later = () => ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}
