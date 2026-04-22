// =============================================================
//  script.js — Dijkstra's Algorithm Visualizer
// =============================================================
 
// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let nodes       = [];   // { id, x, y, label }
let edges       = [];   // { id, from, to, weight }
let nodeId      = 0;
let mode        = 'node';
let edgeSrc     = null;
let startNode   = null;
let endNode     = null;
let pendingEdge = null; // { from, to }
let running     = false;
let steps       = [];
let stepHistory = [];
let stepPos     = 0;
 
// DOM references
const svgEl   = document.getElementById('svg');
const edgesG  = document.getElementById('edges-g');
const nodesG  = document.getElementById('nodes-g');
const statusEl = document.getElementById('statusbar');
const area    = document.getElementById('canvas-area');
 
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const R = 22; // node radius
 
// =============================================================
//  MODE SWITCHING
// =============================================================
function setMode(m) {
  mode = m;
  edgeSrc = null;
 
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + m).classList.add('active');
 
  const hints = {
    node: '<b>Node mode:</b> click canvas to add a node. Click a node to set it as <b>Start</b> or <b>End</b>.',
    edge: '<b>Edge mode:</b> click a node, then click another to add a weighted edge between them.'
  };
  document.getElementById('mode-hint').innerHTML = hints[m];
  highlightEdgeSrc(null);
}
 
// =============================================================
//  CANVAS CLICK — Add Node
// =============================================================
area.addEventListener('click', e => {
  if (e.target !== svgEl && e.target.tagName !== 'svg') return;
  if (mode !== 'node') return;
 
  const rect = area.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  addNode(x, y);
});
 
function addNode(x, y) {
  const label = LABELS[nodeId % 26] + (nodeId >= 26 ? Math.floor(nodeId / 26) : '');
  const node = { id: nodeId++, x, y, label };
  nodes.push(node);
  renderNode(node);
  setStatus(`Node ${node.label} added. Total nodes: ${nodes.length}`);
}
 
// =============================================================
//  RENDER NODE (SVG)
// =============================================================
function renderNode(node) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-id', node.id);
  g.style.cursor = 'pointer';
 
  // Circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', node.x);
  circle.setAttribute('cy', node.y);
  circle.setAttribute('r', R);
  circle.setAttribute('class', 'node-circle');
  circle.setAttribute('id', 'nc-' + node.id);
 
  // Label (letter)
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', node.x);
  text.setAttribute('y', node.y - 2);
  text.setAttribute('class', 'node-label');
  text.setAttribute('id', 'nl-' + node.id);
  text.textContent = node.label;
 
  // Distance label (shown during algorithm)
  const dist = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dist.setAttribute('x', node.x);
  dist.setAttribute('y', node.y + 13);
  dist.setAttribute('class', 'node-dist');
  dist.setAttribute('id', 'nd-' + node.id);
  dist.textContent = '';
 
  g.appendChild(circle);
  g.appendChild(text);
  g.appendChild(dist);
 
  // Click handler
  g.addEventListener('click', e => {
    e.stopPropagation();
    onNodeClick(node.id);
  });
 
  nodesG.appendChild(g);
 
  // Drag to reposition
  let dragging = false, ox, oy;
  g.addEventListener('mousedown', e => {
    if (running || mode === 'edge') return;
    e.stopPropagation();
    dragging = true;
    ox = e.clientX - node.x;
    oy = e.clientY - node.y;
 
    const onMove = e2 => {
      if (!dragging) return;
      node.x = e2.clientX - ox;
      node.y = e2.clientY - oy;
      updateNodePos(node.id);
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
 
// Update node SVG position after drag
function updateNodePos(id) {
  const node = nodes.find(n => n.id === id);
  document.getElementById('nc-' + id).setAttribute('cx', node.x);
  document.getElementById('nc-' + id).setAttribute('cy', node.y);
  document.getElementById('nl-' + id).setAttribute('x', node.x);
  document.getElementById('nl-' + id).setAttribute('y', node.y - 2);
  document.getElementById('nd-' + id).setAttribute('x', node.x);
  document.getElementById('nd-' + id).setAttribute('y', node.y + 13);
  // Update connected edges
  edges.filter(e => e.from === id || e.to === id).forEach(e => updateEdgePos(e));
}
 
// =============================================================
//  NODE CLICK — Set Start / End, or Select for Edge
// =============================================================
function onNodeClick(id) {
  if (mode === 'node') {
    // Toggle start / end assignment
    if (startNode === id) {
      startNode = null;
      setNodeClass(id, '');
      setStatus('Start removed.');
    } else if (endNode === id) {
      endNode = null;
      setNodeClass(id, '');
      setStatus('End removed.');
    } else if (startNode === null) {
      startNode = id;
      setNodeClass(id, 'start');
      setStatus(`Node ${nodes.find(n => n.id === id).label} set as START. Now click another node to set END.`);
    } else if (endNode === null) {
      endNode = id;
      setNodeClass(id, 'end');
      setStatus(`Node ${nodes.find(n => n.id === id).label} set as END. Click "Find Shortest Path" to run!`, 'info');
    }
  } else if (mode === 'edge') {
    if (edgeSrc === null) {
      edgeSrc = id;
      highlightEdgeSrc(id);
      setStatus(`Source: ${nodes.find(n => n.id === id).label}. Now click the destination node.`);
    } else if (edgeSrc === id) {
      // Deselect
      edgeSrc = null;
      highlightEdgeSrc(null);
    } else {
      pendingEdge = { from: edgeSrc, to: id };
      showWeightPopup(id);
      edgeSrc = null;
      highlightEdgeSrc(null);
    }
  }
}
 
function highlightEdgeSrc(id) {
  document.querySelectorAll('.node-circle').forEach(c => {
    c.style.strokeDasharray = '';
  });
  if (id !== null) {
    const c = document.getElementById('nc-' + id);
    if (c) c.style.strokeDasharray = '4 2';
  }
}
 
function setNodeClass(id, cls) {
  const c = document.getElementById('nc-' + id);
  if (!c) return;
  c.setAttribute('class', 'node-circle' + (cls ? ' ' + cls : ''));
}
 
// =============================================================
//  EDGE: WEIGHT POPUP + ADD EDGE
// =============================================================
function showWeightPopup(toId) {
  const popup = document.getElementById('weight-popup');
  const toNode = nodes.find(n => n.id === toId);
 
  popup.style.left = (toNode.x + 30) + 'px';
  popup.style.top  = (toNode.y - 30) + 'px';
  popup.classList.add('show');
 
  const input = document.getElementById('weight-val');
  input.value = '1';
  input.focus();
  input.onkeydown = e => {
    if (e.key === 'Enter') confirmEdge();
    if (e.key === 'Escape') {
      popup.classList.remove('show');
      pendingEdge = null;
    }
  };
}
 
function confirmEdge() {
  const popup = document.getElementById('weight-popup');
  popup.classList.remove('show');
  if (!pendingEdge) return;
 
  let w = parseInt(document.getElementById('weight-val').value) || 1;
  w = Math.max(1, Math.min(99, w));
 
  // Prevent duplicate edge
  const exists = edges.find(e =>
    (e.from === pendingEdge.from && e.to === pendingEdge.to) ||
    (e.from === pendingEdge.to   && e.to === pendingEdge.from)
  );
  if (exists) {
    setStatus('Edge already exists between these nodes.', 'error');
    pendingEdge = null;
    return;
  }
 
  const edge = { from: pendingEdge.from, to: pendingEdge.to, weight: w, id: edges.length };
  edges.push(edge);
  renderEdge(edge);
 
  const fn = nodes.find(n => n.id === edge.from).label;
  const tn = nodes.find(n => n.id === edge.to).label;
  setStatus(`Edge ${fn} → ${tn} (weight ${w}) added.`);
  pendingEdge = null;
}
 
// =============================================================
//  RENDER EDGE (SVG)
// =============================================================
function renderEdge(edge) {
  const fn = nodes.find(n => n.id === edge.from);
  const tn = nodes.find(n => n.id === edge.to);
  const g  = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-eid', edge.id);
 
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('id', 'el-' + edge.id);
  line.setAttribute('class', 'edge-line');
  line.setAttribute('x1', fn.x); line.setAttribute('y1', fn.y);
  line.setAttribute('x2', tn.x); line.setAttribute('y2', tn.y);
 
  const mx = (fn.x + tn.x) / 2;
  const my = (fn.y + tn.y) / 2;
 
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('id', 'ewb-' + edge.id);
  bg.setAttribute('x', mx - 10); bg.setAttribute('y', my - 8);
  bg.setAttribute('width', 20);  bg.setAttribute('height', 14);
  bg.setAttribute('rx', 3);
  bg.setAttribute('class', 'edge-weight-bg');
 
  const wt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  wt.setAttribute('id', 'ew-' + edge.id);
  wt.setAttribute('x', mx); wt.setAttribute('y', my + 1);
  wt.setAttribute('text-anchor', 'middle');
  wt.setAttribute('dominant-baseline', 'central');
  wt.setAttribute('class', 'edge-weight');
  wt.textContent = edge.weight;
 
  g.appendChild(line);
  g.appendChild(bg);
  g.appendChild(wt);
  edgesG.appendChild(g);
}
 
function updateEdgePos(edge) {
  const fn   = nodes.find(n => n.id === edge.from);
  const tn   = nodes.find(n => n.id === edge.to);
  const line = document.getElementById('el-' + edge.id);
  const wt   = document.getElementById('ew-' + edge.id);
  const bg   = document.getElementById('ewb-' + edge.id);
  if (!line) return;
 
  line.setAttribute('x1', fn.x); line.setAttribute('y1', fn.y);
  line.setAttribute('x2', tn.x); line.setAttribute('y2', tn.y);
 
  const mx = (fn.x + tn.x) / 2;
  const my = (fn.y + tn.y) / 2;
  wt.setAttribute('x', mx); wt.setAttribute('y', my + 1);
  bg.setAttribute('x', mx - 10); bg.setAttribute('y', my - 8);
}
 
// =============================================================
//  DIJKSTRA — Build Step History
// =============================================================
function buildSteps() {
  const dist    = {};
  const prev    = {};
  const visited = new Set();
  const history = [];
 
  nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[startNode] = 0;
 
  const pq = nodes.map(n => n.id); // priority queue (sorted array)
 
  while (pq.length) {
    // Pick unvisited node with minimum distance
    pq.sort((a, b) => dist[a] - dist[b]);
    const u = pq.shift();
 
    if (dist[u] === Infinity) break; // remaining nodes are unreachable
    visited.add(u);
 
    history.push({ type: 'visit', node: u, dist: { ...dist }, prev: { ...prev } });
 
    if (u === endNode) break; // reached destination
 
    // Relax all neighbours
    const neighbors = edges
      .filter(e => e.from === u || e.to === u)
      .map(e => ({
        nb:  e.from === u ? e.to : e.from,
        w:   e.weight,
        eid: e.id
      }));
 
    for (const { nb, w, eid } of neighbors) {
      if (visited.has(nb)) continue;
      const newDist = dist[u] + w;
 
      history.push({
        type: 'relax',
        from: u, to: nb, edge: eid,
        oldDist: dist[nb], newDist,
        better: newDist < dist[nb],
        dist: { ...dist }, prev: { ...prev }
      });
 
      if (newDist < dist[nb]) {
        dist[nb] = newDist;
        prev[nb] = u;
        history.push({ type: 'update', node: nb, dist: { ...dist }, prev: { ...prev } });
      }
    }
  }
 
  // Final result
  if (dist[endNode] === Infinity) {
    history.push({ type: 'nope' });
  } else {
    const path = [];
    let cur = endNode;
    while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
    history.push({ type: 'path', path, dist: dist[endNode] });
  }
 
  return history;
}
 
// =============================================================
//  RUN (Animated)
// =============================================================
function getDelay() {
  return Math.max(80, 700 - +document.getElementById('spd').value * 60);
}
 
async function runDijkstra() {
  if (!validate()) return;
  resetVisuals();
  running = true;
  document.getElementById('btn-run').disabled  = true;
  document.getElementById('btn-step').disabled = true;
 
  steps = buildSteps();
  for (let i = 0; i < steps.length; i++) {
    if (!running) break;
    applyStep(steps[i]);
    await sleep(getDelay());
  }
 
  running = false;
  document.getElementById('btn-run').disabled  = false;
  document.getElementById('btn-step').disabled = false;
}
 
// =============================================================
//  STEP THROUGH (Manual)
// =============================================================
async function stepMode() {
  if (running) return;
 
  if (stepPos === 0) {
    if (!validate()) return;
    resetVisuals();
    stepHistory = buildSteps();
    stepPos = 0;
  }
 
  if (stepPos < stepHistory.length) {
    applyStep(stepHistory[stepPos++]);
    setStatus(`Step ${stepPos} / ${stepHistory.length}`, 'info');
  }
 
  if (stepPos >= stepHistory.length) stepPos = 0; // reset for next run
}
 
// =============================================================
//  APPLY ONE STEP
// =============================================================
function applyStep(step) {
 
  if (step.type === 'visit') {
    // Mark previous "current" node as visited
    nodes.forEach(n => {
      if (n.id !== startNode && n.id !== endNode && n.id !== step.node) {
        const c = document.getElementById('nc-' + n.id);
        if (c && c.getAttribute('class').includes('current')) {
          setNodeClass(n.id, 'visited');
        }
      }
    });
    // Highlight current node
    if (step.node !== startNode && step.node !== endNode) {
      setNodeClass(step.node, 'current');
    }
    updateDistTable(step.dist, step.prev);
    setStatus(`Visiting node ${nodes.find(n => n.id === step.node).label} — distance: ${step.dist[step.node]}`, 'info');
  }
 
  if (step.type === 'relax') {
    const fl = nodes.find(n => n.id === step.from).label;
    const tl = nodes.find(n => n.id === step.to).label;
    const el = document.getElementById('el-' + step.edge);
    if (el) el.setAttribute('class', 'edge-line visited');
    setStatus(
      `Checking ${fl}→${tl}: current dist=${step.oldDist === Infinity ? '∞' : step.oldDist}, ` +
      `new=${step.newDist} — ${step.better ? '✓ better!' : '✗ not better'}`
    );
  }
 
  if (step.type === 'update') {
    updateDistTable(step.dist, step.prev);
    const el = document.getElementById('nd-' + step.node);
    if (el) el.textContent = step.dist[step.node];
  }
 
  if (step.type === 'path') {
    // Highlight path edges
    for (let i = 0; i < step.path.length - 1; i++) {
      const a = step.path[i], b = step.path[i + 1];
      const e = edges.find(e =>
        (e.from === a && e.to === b) || (e.from === b && e.to === a)
      );
      if (e) {
        const el = document.getElementById('el-' + e.id);
        if (el) el.setAttribute('class', 'edge-line path');
      }
    }
    // Highlight path nodes
    step.path.forEach(id => {
      if (id !== startNode && id !== endNode) setNodeClass(id, 'path');
    });
 
    const sl = nodes.find(n => n.id === startNode).label;
    const el2 = nodes.find(n => n.id === endNode).label;
    setStatus(`Shortest path ${sl} → ${el2}: distance = ${step.dist} ✓`, 'success');
    updateDistTable(buildFinalDist(), buildFinalPrev());
  }
 
  if (step.type === 'nope') {
    const sl = nodes.find(n => n.id === startNode).label;
    const el = nodes.find(n => n.id === endNode).label;
    setStatus(`No path found from ${sl} to ${el}`, 'error');
  }
}
 
// =============================================================
//  HELPERS — Final dist/prev for table after path is found
// =============================================================
function buildFinalDist() {
  const dist = {}, prev = {};
  nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[startNode] = 0;
  const visited = new Set(), pq = nodes.map(n => n.id);
  while (pq.length) {
    pq.sort((a, b) => dist[a] - dist[b]);
    const u = pq.shift();
    if (dist[u] === Infinity) break;
    visited.add(u);
    edges.filter(e => e.from === u || e.to === u).forEach(e => {
      const nb = e.from === u ? e.to : e.from;
      if (!visited.has(nb) && dist[u] + e.weight < dist[nb]) {
        dist[nb] = dist[u] + e.weight;
        prev[nb] = u;
      }
    });
  }
  return dist;
}
 
function buildFinalPrev() {
  const dist = {}, prev = {};
  nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[startNode] = 0;
  const visited = new Set(), pq = nodes.map(n => n.id);
  while (pq.length) {
    pq.sort((a, b) => dist[a] - dist[b]);
    const u = pq.shift();
    if (dist[u] === Infinity) break;
    visited.add(u);
    edges.filter(e => e.from === u || e.to === u).forEach(e => {
      const nb = e.from === u ? e.to : e.from;
      if (!visited.has(nb) && dist[u] + e.weight < dist[nb]) {
        dist[nb] = dist[u] + e.weight;
        prev[nb] = u;
      }
    });
  }
  return prev;
}
 
// =============================================================
//  DISTANCE TABLE UPDATE
// =============================================================
function updateDistTable(dist, prev) {
  const tbody = document.getElementById('dist-body');
  tbody.innerHTML = nodes.map(n => {
    const d = dist[n.id];
    const p = prev[n.id];
    const pLabel = (p !== null && p !== undefined)
      ? (nodes.find(x => x.id === p)?.label ?? '—')
      : '—';
    const highlight = d !== undefined && d !== Infinity && n.id !== startNode;
    return `<tr class="${highlight ? 'highlight' : ''}">
      <td>${n.label}</td>
      <td>${d === Infinity ? '<span class="dist-inf">∞</span>' : d}</td>
      <td>${d === 0 ? 'start' : pLabel}</td>
    </tr>`;
  }).join('');
}
 
// =============================================================
//  VALIDATE before running
// =============================================================
function validate() {
  if (nodes.length < 2)  { setStatus('Add at least 2 nodes first.', 'error');   return false; }
  if (edges.length < 1)  { setStatus('Add at least 1 edge first.', 'error');    return false; }
  if (startNode === null) { setStatus('Click a node to set START.', 'error');    return false; }
  if (endNode === null)   { setStatus('Click a node to set END.', 'error');      return false; }
  return true;
}
 
// =============================================================
//  RESET VISUALS (before re-run)
// =============================================================
function resetVisuals() {
  stepHistory = []; stepPos = 0;
  nodes.forEach(n => {
    const c = document.getElementById('nc-' + n.id);
    if (!c) return;
    if      (n.id === startNode) c.setAttribute('class', 'node-circle start');
    else if (n.id === endNode)   c.setAttribute('class', 'node-circle end');
    else                          c.setAttribute('class', 'node-circle');
    const d = document.getElementById('nd-' + n.id);
    if (d) d.textContent = '';
  });
  edges.forEach(e => {
    const el = document.getElementById('el-' + e.id);
    if (el) el.setAttribute('class', 'edge-line');
  });
  document.getElementById('dist-body').innerHTML =
    '<tr><td colspan="3" style="color:var(--muted);padding:6px">Running...</td></tr>';
}
 
// =============================================================
//  CLEAR GRAPH
// =============================================================
function clearGraph() {
  nodes = []; edges = []; nodeId = 0;
  startNode = null; endNode = null;
  edgeSrc = null; running = false;
  stepHistory = []; stepPos = 0;
 
  edgesG.innerHTML = '';
  nodesG.innerHTML = '';
  document.getElementById('dist-body').innerHTML =
    '<tr><td colspan="3" style="color:var(--muted);padding:6px">Run to see distances</td></tr>';
  setStatus('Graph cleared. Click canvas to add nodes.');
}
 
// =============================================================
//  UTILITY
// =============================================================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
 
function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'statusbar' + (type ? ' ' + type : '');
}
 
// =============================================================
//  PRESET / EXAMPLE GRAPH
// =============================================================
function loadPreset() {
  clearGraph();
  const W = area.clientWidth;
  const H = area.clientHeight;
  const cx = W / 2, cy = H / 2;
 
  const pts = [
    { x: cx - 220, y: cy - 60  },
    { x: cx - 80,  y: cy - 130 },
    { x: cx + 80,  y: cy - 130 },
    { x: cx + 220, y: cy - 60  },
    { x: cx - 80,  y: cy + 80  },
    { x: cx + 80,  y: cy + 80  },
    { x: cx,       y: cy + 170 }
  ];
 
  pts.forEach(p => {
    const label = LABELS[nodeId % 26];
    nodes.push({ id: nodeId, x: p.x, y: p.y, label });
    renderNode(nodes[nodeId]);
    nodeId++;
  });
 
  const edgeData = [
    [0, 1, 4],  [0, 4, 7],  [1, 2, 9],  [1, 4, 11],
    [2, 3, 6],  [2, 5, 2],  [3, 5, 5],  [3, 6, 8],
    [4, 5, 15], [4, 6, 10], [5, 6, 3]
  ];
 
  edgeData.forEach(([f, t, w]) => {
    const e = { from: f, to: t, weight: w, id: edges.length };
    edges.push(e);
    renderEdge(e);
  });
 
  startNode = 0; setNodeClass(0, 'start');
  endNode   = 6; setNodeClass(6, 'end');
  setStatus('Example graph loaded! Hit "Find Shortest Path" to run Dijkstra\'s algorithm.', 'info');
}
 
// =============================================================
//  AUTO-LOAD ON PAGE READY
// =============================================================
window.onload = () => {
  setTimeout(loadPreset, 200);
};
 