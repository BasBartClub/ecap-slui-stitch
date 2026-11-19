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

  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduce) requestAnimationFrame(render);
  }
  const start = () => requestAnimationFrame(render);
  // Start pas na load + idle, zodat de eerste weergave en interactie niet worden geblokkeerd.
  const later = () => ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}
