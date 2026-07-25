import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets", "img", "note-themes");

const C = {
  ink: "#25343d",
  blue: "#54778c",
  red: "#9b625c",
  gold: "#b08d55",
  green: "#718677",
  violet: "#756b82",
  mist: "#9ba9ad",
  paleBlue: "#dce7ea",
  paleRed: "#eadbd6",
  paleGold: "#eee3c9",
  paper: "#fbfaf6",
};

const n = (value) => Number(value.toFixed(2));
const pointList = (points) => points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
const linePath = (points, close = false) =>
  `M ${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(" L ")}${close ? " Z" : ""}`;
const smoothPath = (points) => {
  if (points.length < 2) return "";
  let d = `M ${n(points[0][0])} ${n(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q ${n(points[i][0])} ${n(points[i][1])} ${n(mx)} ${n(my)}`;
  }
  const last = points.at(-1);
  d += ` T ${n(last[0])} ${n(last[1])}`;
  return d;
};
const sample = (fn, count, a = 0, b = 1) =>
  Array.from({ length: count }, (_, i) => {
    const t = a + ((b - a) * i) / (count - 1);
    return fn(t);
  });
const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sharedDefs = `
  <marker id="open-arrow" viewBox="0 0 14 14" refX="12" refY="7"
    markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">
    <path d="M 2 2 L 12 7 L 2 12" fill="none" stroke="context-stroke"
      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
  <style>
    .ink { fill: none; stroke: ${C.ink}; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
    .blue { fill: none; stroke: ${C.blue}; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
    .red { fill: none; stroke: ${C.red}; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
    .gold { fill: none; stroke: ${C.gold}; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
    .green { fill: none; stroke: ${C.green}; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
    .violet { fill: none; stroke: ${C.violet}; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
    .soft { fill: none; stroke: ${C.mist}; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  </style>`;

function svg(title, body, defs = "") {
  const titleId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-labelledby="${titleId}">
  <title id="${titleId}">${title}</title>
  <defs>${sharedDefs}${defs}</defs>
  ${body}
</svg>
`;
}

function project([x, y, z], cx, cy, scale = 1) {
  return [
    cx + scale * (0.88 * x - 0.78 * y),
    cy + scale * (0.43 * x + 0.48 * y - 0.92 * z),
  ];
}

function coordinateCircle(axis, transform, cx, cy, scale, count = 181) {
  return sample((t) => {
    const a = 2 * Math.PI * t;
    const p =
      axis === "xy"
        ? [Math.cos(a), Math.sin(a), 0]
        : axis === "xz"
          ? [Math.cos(a), 0, Math.sin(a)]
          : [0, Math.cos(a), Math.sin(a)];
    const q = transform(p);
    return project(q, cx, cy, scale);
  }, count);
}

function linearAlgebra() {
  const identity = (p) => p;
  const A = ([x, y, z]) => [
    1.35 * x + 0.22 * y + 0.08 * z,
    0.18 * x + 0.9 * y + 0.3 * z,
    0.05 * x + 0.2 * y + 0.62 * z,
  ];
  const source = ["xy", "xz", "yz"]
    .map(
      (axis, i) =>
        `<path d="${linePath(coordinateCircle(axis, identity, 270, 250, 126))}" fill="none"
          stroke="${[C.blue, C.gold, C.green][i]}" stroke-width="3.15" opacity="0.9"/>`,
    )
    .join("\n");
  const target = ["xy", "xz", "yz"]
    .map(
      (axis, i) =>
        `<path d="${linePath(coordinateCircle(axis, A, 505, 745, 134))}" fill="none"
          stroke="${[C.blue, C.gold, C.green][i]}" stroke-width="3.15" opacity="0.9"/>`,
    )
    .join("\n");
  return svg(
    "A full-rank linear map sends a sphere to an ellipsoid",
    `${source}
    <path d="M 322 392 C 340 492, 426 527, 468 594" class="ink"
      stroke-width="3" marker-end="url(#open-arrow)" opacity="0.78"/>
    ${target}`,
  );
}

function probabilityTheory() {
  const top = 92;
  const bottom = 914;
  const center = 400;
  const steps = 95;
  const envelope = (t) => 24 + 235 * Math.sqrt(t);
  const upper = sample((t) => [center + envelope(t), top + (bottom - top) * t], 100);
  const lower = sample((t) => [center - envelope(t), top + (bottom - top) * t], 100);
  const band = [...upper, ...lower.reverse()];

  const paths = [];
  for (let j = 0; j < 13; j += 1) {
    const random = mulberry32(317 + j * 97);
    let walk = 0;
    const raw = [];
    for (let i = 0; i < steps; i += 1) {
      if (i > 0) walk += (random() + random() + random() - 1.5) * 0.72;
      raw.push(walk);
    }
    const maxRatio = Math.max(
      ...raw.slice(1).map((value, i) => Math.abs(value) / envelope((i + 1) / (steps - 1))),
    );
    const rescale = maxRatio > 0 ? 0.79 / maxRatio : 1;
    const points = raw.map((value, i) => {
      const t = i / (steps - 1);
      const drift = (j - 6) * 0.018 * envelope(t);
      return [center + value * rescale + drift, top + (bottom - top) * t];
    });
    const color = j === 4 ? C.red : j === 8 ? C.gold : j === 6 ? C.ink : C.blue;
    const opacity = j === 6 ? 0.9 : j === 4 || j === 8 ? 0.62 : 0.31;
    const width = j === 6 ? 3.4 : j === 4 || j === 8 ? 2.7 : 1.8;
    paths.push(
      `<path d="${linePath(points)}" fill="none" stroke="${color}" stroke-width="${width}"
        stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`,
    );
  }

  return svg(
    "Brownian paths spreading inside a Gaussian scale envelope",
    `<path d="${linePath(band, true)}" fill="${C.paleGold}" opacity="0.18"/>
    <path d="${linePath(upper)}" fill="none" stroke="${C.gold}" stroke-width="2.2" opacity="0.42"/>
    <path d="${linePath(lower.reverse())}" fill="none" stroke="${C.gold}" stroke-width="2.2" opacity="0.42"/>
    ${paths.join("\n")}
    <circle cx="${center}" cy="${top}" r="4.6" fill="${C.ink}" opacity="0.82"/>`,
  );
}

function saddlePoint(x, y) {
  const z = 0.72 * (x * x - y * y);
  return [400 + 145 * x + 48 * y, 505 + 55 * y - 83 * z];
}

function optimization() {
  const mesh = [];
  for (let i = -5; i <= 5; i += 1) {
    const fixed = i * 0.29;
    const a = sample((t) => saddlePoint(fixed, -1.55 + 3.1 * t), 70);
    const b = sample((t) => saddlePoint(-1.55 + 3.1 * t, fixed), 70);
    mesh.push(`<path d="${linePath(a)}" class="soft" opacity="${i === 0 ? 0.5 : 0.28}"/>`);
    mesh.push(`<path d="${linePath(b)}" class="soft" opacity="${i === 0 ? 0.5 : 0.28}"/>`);
  }
  const minCurve = sample((t) => saddlePoint(-1.48 + 2.96 * t, 0), 100);
  const maxCurve = sample((t) => saddlePoint(0, -1.48 + 2.96 * t), 100);
  return svg(
    "Minimax directions meeting at a saddle point",
    `${mesh.join("\n")}
    <path d="${linePath(maxCurve)}" class="red" marker-end="url(#open-arrow)"/>
    <path d="${linePath(minCurve)}" class="blue" marker-end="url(#open-arrow)"/>
    <circle cx="400" cy="505" r="7" fill="${C.ink}"/>`,
  );
}

function functionalAnalysis() {
  const sphere = [
    `<ellipse cx="400" cy="246" rx="168" ry="71" class="blue" opacity="0.74"/>`,
    `<ellipse cx="400" cy="246" rx="168" ry="71" class="gold" opacity="0.68" transform="rotate(58 400 246)"/>`,
    `<ellipse cx="400" cy="246" rx="168" ry="71" class="green" opacity="0.68" transform="rotate(-58 400 246)"/>`,
    `<circle cx="400" cy="246" r="7" fill="${C.ink}" opacity="0.72"/>`,
  ];
  const spectralDots = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const x = 285 + 305 * t;
    const y = 846 + 38 * Math.sin(t * Math.PI);
    const r = 8.5 * Math.exp(-2.6 * t) + 1.8;
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${C.violet}" opacity="${n(0.76 - 0.35 * t)}"/>`;
  });
  return svg(
    "A compact operator turns a diffuse ball into a thin spectral image",
    `${sphere.join("\n")}
    <path d="M 400 424 C 400 494, 400 524, 400 576" class="ink"
      marker-end="url(#open-arrow)" opacity="0.72"/>
    <ellipse cx="400" cy="700" rx="258" ry="91" fill="${C.paleBlue}" opacity="0.22"
      stroke="${C.blue}" stroke-width="3.3"/>
    <ellipse cx="400" cy="700" rx="258" ry="42" class="blue" opacity="0.72"/>
    <ellipse cx="400" cy="700" rx="92" ry="91" class="gold" opacity="0.54"/>
    <path d="M 218 846 C 326 875, 477 887, 604 860" class="soft" opacity="0.48"/>
    ${spectralDots.join("\n")}`,
  );
}

function realAnalysis() {
  const left = 96;
  const right = 718;
  const base = 846;
  const f = (t) =>
    0.15 +
    0.6 * t +
    0.12 * Math.sin(2.35 * Math.PI * t + 0.2) +
    0.055 * Math.sin(6.5 * Math.PI * t);
  const y = (value) => base - 580 * value;
  const smooth = sample((t) => [left + (right - left) * t, y(f(t))], 180);
  const steps = [5, 8, 13, 22].map((count, layer) => {
    const points = [];
    for (let i = 0; i < count; i += 1) {
      const a = i / count;
      const b = (i + 1) / count;
      const samples = Array.from({ length: 12 }, (_, j) => f(a + ((b - a) * j) / 11));
      const value = Math.min(...samples) - 0.012 * (3 - layer);
      const xa = left + (right - left) * a;
      const xb = left + (right - left) * b;
      if (i === 0) points.push([xa, y(value)]);
      points.push([xb, y(value)]);
      if (i < count - 1) {
        const nextA = b;
        const nextB = (i + 2) / count;
        const nextSamples = Array.from({ length: 12 }, (_, j) =>
          f(nextA + ((nextB - nextA) * j) / 11),
        );
        points.push([xb, y(Math.min(...nextSamples) - 0.012 * (3 - layer))]);
      }
    }
    const colors = [C.gold, C.green, C.violet, C.blue];
    return `<path d="${linePath(points)}" fill="none" stroke="${colors[layer]}"
      stroke-width="${1.8 + layer * 0.28}" opacity="${0.23 + layer * 0.13}"
      stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const under = [[left, base], ...smooth, [right, base]];
  return svg(
    "Simple functions resolving into a measurable limit",
    `<path d="${linePath(under, true)}" fill="${C.paleGold}" opacity="0.12"/>
    <path d="M ${left} ${base} H ${right}" class="soft" opacity="0.42"/>
    ${steps.join("\n")}
    <path d="${linePath(smooth)}" class="ink" stroke-width="3.8"/>
    ${Array.from({ length: 14 }, (_, i) => {
      const x = left + ((right - left) * i) / 13;
      return `<path d="M ${n(x)} ${base - 7} V ${base + 7}" stroke="${C.mist}" stroke-width="1.4" opacity="0.38"/>`;
    }).join("\n")}`,
  );
}

function complexAnalysis() {
  const sourceCenter = [400, 260];
  const sourceScale = 164;
  const targetCenter = [400, 746];
  const targetScale = 165;
  const mapZ = ([x, y]) => [x + 0.3 * (x * x - y * y), y + 0.6 * x * y];
  const source = [];
  const target = [];
  for (const r of [0.25, 0.5, 0.75, 1]) {
    const circle = sample((t) => {
      const a = 2 * Math.PI * t;
      return [sourceCenter[0] + sourceScale * r * Math.cos(a), sourceCenter[1] + sourceScale * r * Math.sin(a)];
    }, 120);
    const image = sample((t) => {
      const a = 2 * Math.PI * t;
      const [x, y] = mapZ([r * Math.cos(a), r * Math.sin(a)]);
      return [targetCenter[0] + targetScale * x, targetCenter[1] + targetScale * y];
    }, 120);
    source.push(`<path d="${linePath(circle, true)}" class="blue" opacity="${r === 1 ? 0.8 : 0.32}"/>`);
    target.push(`<path d="${linePath(image, true)}" class="blue" opacity="${r === 1 ? 0.8 : 0.32}"/>`);
  }
  for (let k = 0; k < 12; k += 1) {
    const a = (2 * Math.PI * k) / 12;
    const ray = sample((t) => [
      sourceCenter[0] + sourceScale * t * Math.cos(a),
      sourceCenter[1] + sourceScale * t * Math.sin(a),
    ], 70);
    const image = sample((t) => {
      const [x, y] = mapZ([t * Math.cos(a), t * Math.sin(a)]);
      return [targetCenter[0] + targetScale * x, targetCenter[1] + targetScale * y];
    }, 70);
    source.push(`<path d="${linePath(ray)}" class="gold" opacity="0.27"/>`);
    target.push(`<path d="${linePath(image)}" class="gold" opacity="0.27"/>`);
  }
  return svg(
    "An orthogonal complex grid carried through a conformal map",
    `${source.join("\n")}
    <path d="M 400 444 C 400 491, 400 515, 400 556" class="ink"
      marker-end="url(#open-arrow)" opacity="0.68"/>
    ${target.join("\n")}`,
  );
}

function torusPoint(u, v) {
  const R = 1.45;
  const r = 0.56;
  const x = (R + r * Math.cos(v)) * Math.cos(u);
  const y = (R + r * Math.cos(v)) * Math.sin(u);
  const z = r * Math.sin(v);
  return project([x, y, z], 420, 730, 116);
}

function generalTopology() {
  const sheetTop = sample((t) => [144 + 510 * t, 112 + 26 * Math.sin(Math.PI * t)], 70);
  const sheetBottom = sample((t) => [126 + 520 * t, 394 + 18 * Math.sin(Math.PI * t + 0.35)], 70);
  const left = sample((t) => {
    const a = sheetTop[0];
    const b = sheetBottom[0];
    return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
  }, 40);
  const right = sample((t) => {
    const a = sheetTop.at(-1);
    const b = sheetBottom.at(-1);
    return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t];
  }, 40);
  const mesh = [];
  for (let i = 1; i < 5; i += 1) {
    const t = i / 5;
    const row = sheetTop.map((p, j) => {
      const q = sheetBottom[j];
      return [p[0] * (1 - t) + q[0] * t, p[1] * (1 - t) + q[1] * t];
    });
    mesh.push(`<path d="${linePath(row)}" class="soft" opacity="0.14"/>`);
  }
  for (let i = 1; i < 7; i += 1) {
    const k = Math.floor((sheetTop.length - 1) * i / 7);
    mesh.push(`<path d="M ${n(sheetTop[k][0])} ${n(sheetTop[k][1])} L ${n(sheetBottom[k][0])} ${n(sheetBottom[k][1])}" class="soft" opacity="0.14"/>`);
  }
  const torusMesh = [];
  for (let i = 0; i < 9; i += 1) {
    const u = (2 * Math.PI * i) / 9;
    torusMesh.push(`<path d="${linePath(sample((t) => torusPoint(u, 2 * Math.PI * t), 100), true)}" class="soft" opacity="0.19"/>`);
  }
  for (let i = 0; i < 10; i += 1) {
    const v = (2 * Math.PI * i) / 10;
    torusMesh.push(`<path d="${linePath(sample((t) => torusPoint(2 * Math.PI * t, v), 120), true)}" class="soft" opacity="0.16"/>`);
  }
  const redCycle = sample((t) => torusPoint(0.36 * Math.PI, 2 * Math.PI * t), 130);
  const blueCycle = sample((t) => torusPoint(2 * Math.PI * t, 0), 150);
  return svg(
    "Opposite edges of a sheet identified to form a torus",
    `<path d="${linePath([...sheetTop, ...sheetBottom.toReversed()], true)}" fill="${C.paleGold}" opacity="0.12"/>
    ${mesh.join("\n")}
    <path d="${linePath(left)}" class="red"/>
    <path d="${linePath(right)}" class="red"/>
    <path d="${linePath(sheetTop)}" class="blue"/>
    <path d="${linePath(sheetBottom)}" class="blue"/>
    <path d="M 400 445 C 400 493, 400 516, 400 553" class="ink"
      marker-end="url(#open-arrow)" opacity="0.66"/>
    ${torusMesh.join("\n")}
    <path d="${linePath(redCycle, true)}" class="red" opacity="0.88"/>
    <path d="${linePath(blueCycle, true)}" class="blue" opacity="0.94"/>`,
  );
}

function surfacePoint(x, y) {
  const z = 0.38 * Math.sin(1.25 * x) + 0.24 * Math.cos(1.1 * y) + 0.13 * x * y;
  return project([x, y, z], 400, 468, 158);
}

function differentialGeometry() {
  const mesh = [];
  for (let i = -5; i <= 5; i += 1) {
    const fixed = i * 0.32;
    mesh.push(`<path d="${linePath(sample((t) => surfacePoint(fixed, -1.7 + 3.4 * t), 80))}" class="soft" opacity="0.24"/>`);
    mesh.push(`<path d="${linePath(sample((t) => surfacePoint(-1.7 + 3.4 * t, fixed), 80))}" class="soft" opacity="0.24"/>`);
  }
  const geodesic = sample((t) => {
    const x = -1.55 + 3.1 * t;
    const y = 0.38 * Math.sin(Math.PI * (t - 0.15));
    return surfacePoint(x, y);
  }, 130);
  const p = surfacePoint(0.18, 0.22);
  const plane = [
    [p[0] - 125, p[1] + 19],
    [p[0] + 72, p[1] - 68],
    [p[0] + 148, p[1] - 16],
    [p[0] - 48, p[1] + 72],
  ];
  return svg(
    "A geodesic and tangent plane on a curved surface",
    `<path d="${linePath(plane, true)}" fill="${C.paleGold}" opacity="0.22"
      stroke="${C.gold}" stroke-width="2.2"/>
    ${mesh.join("\n")}
    <path d="${linePath(geodesic)}" class="blue" stroke-width="4.2"/>
    <circle cx="${n(p[0])}" cy="${n(p[1])}" r="7" fill="${C.ink}"/>
    <path d="M ${n(p[0])} ${n(p[1])} L ${n(p[0] + 98)} ${n(p[1] - 43)}"
      class="red" marker-end="url(#open-arrow)"/>
    <path d="M ${n(p[0])} ${n(p[1])} L ${n(p[0] - 69)} ${n(p[1] - 78)}"
      class="gold" marker-end="url(#open-arrow)"/>`,
  );
}

function numberTheory() {
  const baseY = 846;
  const xs = Array.from({ length: 13 }, (_, i) => 82 + i * 53);
  const arcs = [];
  for (let gap = 1; gap <= 6; gap += 1) {
    for (let i = 0; i + gap < xs.length; i += gap) {
      const x1 = xs[i];
      const x2 = xs[i + gap];
      const r = (x2 - x1) / 2;
      const cx = (x1 + x2) / 2;
      const pts = sample((t) => {
        const a = Math.PI * (1 - t);
        return [cx + r * Math.cos(a), baseY - r * Math.sin(a)];
      }, 70);
      const opacity = 0.18 + 0.48 / gap;
      arcs.push(`<path d="${linePath(pts)}" fill="none" stroke="${gap % 2 ? C.blue : C.gold}"
        stroke-width="${gap === 1 ? 2.4 : 1.8}" opacity="${n(opacity)}"/>`);
    }
  }
  const lattice = [];
  const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      const value = row * 11 + col + 1;
      const x = 134 + col * 53 + (row % 2) * 8;
      const y = 132 + row * 58;
      const prime = primes.has(value);
      lattice.push(`<circle cx="${x}" cy="${y}" r="${prime ? 6.2 : 2.2}"
        fill="${prime ? (value % 4 === 1 ? C.red : C.blue) : C.mist}"
        opacity="${prime ? 0.78 : 0.23}"/>`);
    }
  }
  return svg(
    "Arithmetic lattice points opening into modular arcs",
    `${lattice.join("\n")}
    <path d="M 400 586 C 400 625, 400 655, 400 690" class="ink"
      marker-end="url(#open-arrow)" opacity="0.58"/>
    <path d="M 70 ${baseY} H 730" class="ink" opacity="0.5"/>
    ${arcs.join("\n")}
    ${xs.map((x, i) => `<circle cx="${x}" cy="${baseY}" r="${i % 2 ? 3.4 : 4.6}" fill="${i % 2 ? C.gold : C.blue}" opacity="0.8"/>`).join("\n")}`,
  );
}

function optimalTransport() {
  const sourceContours = [
    [290, 210, 165, 93],
    [290, 210, 122, 66],
    [290, 210, 76, 39],
  ];
  const targetContours = [
    [505, 778, 176, 88],
    [505, 778, 128, 61],
    [505, 778, 78, 34],
  ];
  const trajectories = [];
  for (let i = 0; i < 11; i += 1) {
    const t = (i - 5) / 5;
    const sx = 290 + 120 * t;
    const sy = 210 + 42 * Math.sin(t * Math.PI);
    const tx = 505 + 135 * t;
    const ty = 778 - 38 * Math.sin(t * Math.PI * 0.85);
    const bend = 54 * Math.sin((i + 1) * 1.1);
    trajectories.push(`<path d="M ${n(sx)} ${n(sy)} C ${n(sx + bend)} 420, ${n(tx - bend)} 568, ${n(tx)} ${n(ty)}"
      fill="none" stroke="${i === 5 ? C.ink : i % 2 ? C.blue : C.gold}"
      stroke-width="${i === 5 ? 3.6 : 2.1}" opacity="${i === 5 ? 0.8 : 0.38}"
      marker-end="url(#open-arrow)"/>`);
  }
  return svg(
    "A transport map carrying one distribution into another",
    `${sourceContours.map(([cx, cy, rx, ry], i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="${i === 2 ? C.paleBlue : "none"}" fill-opacity="0.2" stroke="${C.blue}"
      stroke-width="${3 - i * 0.35}" opacity="${0.42 + i * 0.15}"/>`).join("\n")}
    ${trajectories.join("\n")}
    ${targetContours.map(([cx, cy, rx, ry], i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
      fill="${i === 2 ? C.paleGold : "none"}" fill-opacity="0.2" stroke="${C.gold}"
      stroke-width="${3 - i * 0.35}" opacity="${0.42 + i * 0.15}"/>`).join("\n")}`,
  );
}

function numericalSurfacePoint(x, y, cx, cy, scale) {
  const z = 0.55 * Math.exp(-0.75 * (x * x + y * y)) + 0.16 * Math.sin(1.9 * x) * Math.cos(1.5 * y);
  return project([x, y, z], cx, cy, scale);
}

function surfaceGrid(divisions, cx, cy, scale, opacity, color) {
  const paths = [];
  for (let i = 0; i <= divisions; i += 1) {
    const fixed = -1.55 + (3.1 * i) / divisions;
    paths.push(`<path d="${linePath(sample((t) => numericalSurfacePoint(fixed, -1.55 + 3.1 * t, cx, cy, scale), 60))}"
      fill="none" stroke="${color}" stroke-width="${divisions < 7 ? 2.5 : 1.45}" opacity="${opacity}"/>`);
    paths.push(`<path d="${linePath(sample((t) => numericalSurfacePoint(-1.55 + 3.1 * t, fixed, cx, cy, scale), 60))}"
      fill="none" stroke="${color}" stroke-width="${divisions < 7 ? 2.5 : 1.45}" opacity="${opacity}"/>`);
  }
  return paths.join("\n");
}

function numericalAnalysis() {
  const coarseNodes = [];
  for (let i = 0; i <= 4; i += 1) {
    for (let j = 0; j <= 4; j += 1) {
      const p = numericalSurfacePoint(-1.55 + i * 0.775, -1.55 + j * 0.775, 400, 254, 92);
      coarseNodes.push(`<circle cx="${n(p[0])}" cy="${n(p[1])}" r="3.8" fill="${C.red}" opacity="0.72"/>`);
    }
  }
  return svg(
    "A coarse numerical mesh refined into a stable approximation",
    `${surfaceGrid(4, 400, 254, 92, 0.58, C.red)}
    ${coarseNodes.join("\n")}
    <path d="M 400 428 C 400 478, 400 507, 400 552" class="ink"
      marker-end="url(#open-arrow)" opacity="0.62"/>
    ${surfaceGrid(13, 400, 745, 100, 0.33, C.blue)}
    <path d="${linePath(sample((t) => numericalSurfacePoint(-1.55 + 3.1 * t, 0, 400, 745, 100), 100))}"
      class="blue" stroke-width="3.8"/>`,
  );
}

function differentialEquations() {
  const vectors = [];
  for (let row = 0; row < 11; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const x = -2.1 + col * 0.525;
      const y = -2.7 + row * 0.54;
      const vx = -0.34 * x - y;
      const vy = x - 0.34 * y;
      const len = Math.hypot(vx, vy) || 1;
      const sx = 400 + x * 120;
      const sy = 500 - y * 120;
      const dx = (vx / len) * 15;
      const dy = (-vy / len) * 15;
      vectors.push(`<path d="M ${n(sx - dx)} ${n(sy - dy)} L ${n(sx + dx)} ${n(sy + dy)}"
        stroke="${C.mist}" stroke-width="1.5" opacity="0.25" marker-end="url(#open-arrow)"/>`);
    }
  }
  const trajectories = [];
  for (let k = 0; k < 7; k += 1) {
    let x = 1.2 + 0.22 * k;
    let y = -1.6 + 0.42 * k;
    const points = [];
    for (let i = 0; i < 120; i += 1) {
      points.push([400 + x * 120, 500 - y * 120]);
      const vx = -0.34 * x - y;
      const vy = x - 0.34 * y;
      x += 0.035 * vx;
      y += 0.035 * vy;
    }
    trajectories.push(`<path d="${linePath(points)}" fill="none"
      stroke="${k === 3 ? C.ink : k % 2 ? C.blue : C.gold}"
      stroke-width="${k === 3 ? 3.7 : 2.3}" opacity="${k === 3 ? 0.84 : 0.55}"
      marker-end="url(#open-arrow)" stroke-linecap="round"/>`);
  }
  return svg(
    "Integral curves moving through a differential vector field",
    `${vectors.join("\n")}
    ${trajectories.join("\n")}
    <circle cx="400" cy="500" r="6" fill="${C.ink}" opacity="0.75"/>`,
  );
}

function statisticalInference() {
  const random = mulberry32(8128);
  const samples = [];
  const means = [];
  for (let row = 0; row < 6; row += 1) {
    const y = 126 + row * 55;
    const values = Array.from({ length: 11 }, () => 400 + (random() + random() + random() - 1.5) * 235);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    means.push(mean);
    samples.push(`<path d="M 158 ${y} H 642" class="soft" opacity="0.18"/>`);
    for (const x of values) {
      samples.push(`<circle cx="${n(x)}" cy="${y}" r="4.2" fill="${row % 2 ? C.blue : C.gold}" opacity="0.5"/>`);
    }
    samples.push(`<circle cx="${n(mean)}" cy="${y}" r="6.2" fill="${C.ink}" opacity="0.72"/>`);
  }
  const likelihoods = means.map((mean, i) => {
    const pts = sample((t) => {
      const x = 112 + 576 * t;
      const sigma = 54 + i * 4;
      const height = 83 * Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma));
      return [x, 820 - height - i * 6];
    }, 120);
    return `<path d="${linePath(pts)}" fill="none" stroke="${i === 2 ? C.ink : i % 2 ? C.blue : C.gold}"
      stroke-width="${i === 2 ? 3.6 : 2.1}" opacity="${i === 2 ? 0.8 : 0.42}"/>`;
  });
  const estimate = means.reduce((a, b) => a + b, 0) / means.length;
  return svg(
    "Repeated samples inducing likelihoods and an inferential interval",
    `${samples.join("\n")}
    <path d="M 400 475 C 400 518, 400 555, 400 600" class="ink"
      marker-end="url(#open-arrow)" opacity="0.6"/>
    ${likelihoods.join("\n")}
    <path d="M ${n(estimate - 88)} 886 H ${n(estimate + 88)}" class="red" stroke-width="4"/>
    <path d="M ${n(estimate - 88)} 873 V 899 M ${n(estimate + 88)} 873 V 899" class="red"/>
    <circle cx="${n(estimate)}" cy="886" r="7" fill="${C.ink}"/>`,
  );
}

function survivalAnalysis() {
  const random = mulberry32(4242);
  const lifelines = [];
  const eventTimes = [];
  for (let i = 0; i < 12; i += 1) {
    const y = 116 + i * 42;
    const end = 250 + random() * 400;
    const censored = i % 4 === 1 || i % 5 === 2;
    lifelines.push(`<path d="M 115 ${y} H ${n(end)}" stroke="${i % 2 ? C.blue : C.gold}"
      stroke-width="2.3" opacity="0.56" stroke-linecap="round"/>`);
    if (censored) {
      lifelines.push(`<path d="M ${n(end - 7)} ${y - 7} L ${n(end + 7)} ${y + 7}
        M ${n(end - 7)} ${y + 7} L ${n(end + 7)} ${y - 7}" stroke="${C.red}"
        stroke-width="2.2" opacity="0.75"/>`);
    } else {
      eventTimes.push(end);
      lifelines.push(`<circle cx="${n(end)}" cy="${y}" r="5.3" fill="${C.ink}" opacity="0.75"/>`);
    }
  }
  eventTimes.sort((a, b) => a - b);
  const left = 115;
  const right = 685;
  const top = 704;
  const bottom = 904;
  const step = [[left, top]];
  eventTimes.forEach((time, i) => {
    const x = left + ((time - 250) / 400) * (right - left);
    const yPrev = top + (i / eventTimes.length) * (bottom - top);
    const yNext = top + ((i + 1) / eventTimes.length) * (bottom - top);
    step.push([x, yPrev], [x, yNext]);
  });
  step.push([right, step.at(-1)[1]]);
  return svg(
    "Censored lifelines resolving into a survival curve",
    `${lifelines.join("\n")}
    <path d="M 400 645 C 400 662, 400 672, 400 684" class="ink"
      marker-end="url(#open-arrow)" opacity="0.55"/>
    <path d="${linePath(step)}" class="blue" stroke-width="4"/>
    <path d="M ${left} ${bottom + 16} H ${right}" class="soft" opacity="0.35"/>`,
  );
}

function bell(center, sigma, base, height, count = 150) {
  return sample((t) => {
    const x = 90 + 620 * t;
    const value = Math.exp(-((x - center) ** 2) / (2 * sigma * sigma));
    return [x, base - height * value];
  }, count);
}

function bayesianStatistics() {
  const prior = bell(375, 150, 286, 128);
  const posterior = bell(456, 61, 843, 245);
  const priorFill = [[90, 286], ...prior, [710, 286]];
  const posteriorFill = [[90, 843], ...posterior, [710, 843]];
  const observations = [410, 442, 468, 482, 512];
  return svg(
    "A diffuse prior reshaped by observations into a concentrated posterior",
    `<path d="${linePath(priorFill, true)}" fill="${C.paleBlue}" opacity="0.26"/>
    <path d="${linePath(prior)}" class="blue" stroke-width="3.7"/>
    ${observations.map((x, i) => `<circle cx="${x}" cy="${446 + (i % 2) * 32}" r="${i === 2 ? 6.5 : 4.8}"
      fill="${i === 2 ? C.ink : C.gold}" opacity="0.78"/>`).join("\n")}
    <path d="M 400 348 C 416 396, 430 438, 445 510 C 454 556, 455 579, 456 610"
      class="ink" marker-end="url(#open-arrow)" opacity="0.62"/>
    <path d="${linePath(posteriorFill, true)}" fill="${C.paleRed}" opacity="0.24"/>
    <path d="${linePath(posterior)}" class="red" stroke-width="4"/>
    <path d="M 90 286 H 710 M 90 843 H 710" class="soft" opacity="0.25"/>`,
  );
}

function empiricalProcesses() {
  const left = 96;
  const right = 704;
  const bottom = 874;
  const top = 120;
  const cdf = (t) => 1 / (1 + Math.exp(-7.5 * (t - 0.48)));
  const smooth = sample((t) => [left + (right - left) * t, bottom - (bottom - top) * cdf(t)], 170);
  const random = mulberry32(953);
  const steps = [];
  for (let k = 0; k < 7; k += 1) {
    const values = Array.from({ length: 28 }, () => {
      const u = Math.min(0.999, Math.max(0.001, (random() + random()) / 2));
      return Math.log(u / (1 - u)) / 7.5 + 0.48;
    }).map((v) => Math.min(1, Math.max(0, v))).sort((a, b) => a - b);
    const pts = [[left, bottom]];
    values.forEach((value, i) => {
      const x = left + (right - left) * value;
      const yPrev = bottom - (bottom - top) * (i / values.length);
      const yNext = bottom - (bottom - top) * ((i + 1) / values.length);
      pts.push([x, yPrev], [x, yNext]);
    });
    pts.push([right, top]);
    steps.push(`<path d="${linePath(pts)}" fill="none" stroke="${k === 3 ? C.ink : k % 2 ? C.blue : C.gold}"
      stroke-width="${k === 3 ? 3 : 1.7}" opacity="${k === 3 ? 0.62 : 0.28}"/>`);
  }
  return svg(
    "Empirical distribution functions fluctuating around their limit",
    `<path d="M ${left} ${bottom} H ${right} M ${left} ${bottom} V ${top}" class="soft" opacity="0.36"/>
    ${steps.join("\n")}
    <path d="${linePath(smooth)}" class="red" stroke-width="4"/>
    <circle cx="${left}" cy="${bottom}" r="4" fill="${C.ink}" opacity="0.5"/>
    <circle cx="${right}" cy="${top}" r="4" fill="${C.ink}" opacity="0.5"/>`,
  );
}

function decisionTheory() {
  const left = 92;
  const right = 708;
  const top = 128;
  const bottom = 884;
  const centers = [190, 282, 374, 466, 558, 650];
  const risks = centers.map((center, i) => {
    const pts = sample((t) => {
      const x = left + (right - left) * t;
      const y = top + 172 + 0.0021 * (x - center) ** 2 + i * 57;
      return [x, Math.min(bottom - 30, y)];
    }, 120);
    return { center, pts };
  });
  const envelope = sample((t) => {
    const x = left + (right - left) * t;
    const y = Math.min(...risks.map(({ center }, i) => top + 172 + 0.0021 * (x - center) ** 2 + i * 57));
    return [x, y];
  }, 180);
  const maxPoint = envelope.reduce((best, p) => (p[1] > best[1] ? p : best), envelope[0]);
  return svg(
    "Risk functions meeting their lower decision envelope",
    `${risks.map(({ pts }, i) => `<path d="${linePath(pts)}" fill="none"
      stroke="${i % 2 ? C.blue : C.gold}" stroke-width="2.1" opacity="0.35"/>`).join("\n")}
    <path d="${linePath(envelope)}" class="red" stroke-width="4.2"/>
    <path d="M ${left} ${n(maxPoint[1])} H ${n(maxPoint[0])}" class="ink"
      stroke-dasharray="7 9" opacity="0.45"/>
    <circle cx="${n(maxPoint[0])}" cy="${n(maxPoint[1])}" r="7" fill="${C.ink}"/>
    <path d="M ${left} ${bottom} H ${right}" class="soft" opacity="0.3"/>`,
  );
}

function informationTheory() {
  const random = mulberry32(1948);
  const source = Array.from({ length: 34 }, (_, i) => {
    const a = 2 * Math.PI * random();
    const r = 38 + 145 * Math.sqrt(random());
    return [400 + r * Math.cos(a), 195 + 0.55 * r * Math.sin(a), i];
  });
  const target = Array.from({ length: 28 }, (_, i) => {
    const a = 2 * Math.PI * i / 28 + 0.08 * Math.sin(i);
    const r = 124 + 18 * Math.sin(i * 1.7);
    return [400 + r * Math.cos(a), 796 + 0.58 * r * Math.sin(a)];
  });
  const streams = source.filter((_, i) => i % 3 === 0).map(([x, y], i) => {
    const [tx, ty] = target[(i * 2) % target.length];
    return `<path d="M ${n(x)} ${n(y)} C ${n(400 + (x - 400) * 0.25)} 392,
      ${n(400 + (tx - 400) * 0.22)} 592, ${n(tx)} ${n(ty)}"
      fill="none" stroke="${i % 2 ? C.blue : C.gold}" stroke-width="2.2"
      opacity="0.34" marker-end="url(#open-arrow)"/>`;
  });
  return svg(
    "Probability mass passing through a channel into a typical region",
    `<ellipse cx="400" cy="195" rx="190" ry="112" fill="${C.paleBlue}" opacity="0.16"
      stroke="${C.blue}" stroke-width="2.4" stroke-dasharray="4 10"/>
    ${source.map(([x, y, i]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${i % 5 === 0 ? 5.2 : 3.1}"
      fill="${i % 2 ? C.blue : C.gold}" opacity="${i % 5 === 0 ? 0.72 : 0.38}"/>`).join("\n")}
    ${streams.join("\n")}
    <path d="M 355 468 C 372 492, 372 515, 355 540 M 445 468 C 428 492, 428 515, 445 540"
      class="ink" opacity="0.7"/>
    <ellipse cx="400" cy="796" rx="188" ry="112" fill="${C.paleGold}" opacity="0.13"
      stroke="${C.gold}" stroke-width="2.8"/>
    <ellipse cx="400" cy="796" rx="145" ry="82" fill="none" stroke="${C.red}"
      stroke-width="2.2" opacity="0.38"/>
    ${target.map(([x, y], i) => `<circle cx="${n(x)}" cy="${n(y)}" r="${i % 4 === 0 ? 5.4 : 3.2}"
      fill="${i % 4 === 0 ? C.red : C.gold}" opacity="${i % 4 === 0 ? 0.72 : 0.42}"/>`).join("\n")}`,
  );
}

function barycentricPoint(a, b, c) {
  const x = a * 145 + b * 655 + c * 400;
  const y0 = a * 794 + b * 794 + c * 150;
  const bulge = 86 * a * b + 28 * c * (a - b);
  return [x, y0 - bulge];
}

function informationGeometry() {
  const grid = [];
  for (let k = 1; k < 7; k += 1) {
    const q = k / 7;
    const families = [
      sample((t) => barycentricPoint(q, (1 - q) * t, (1 - q) * (1 - t)), 80),
      sample((t) => barycentricPoint((1 - q) * t, q, (1 - q) * (1 - t)), 80),
      sample((t) => barycentricPoint((1 - q) * t, (1 - q) * (1 - t), q), 80),
    ];
    families.forEach((pts, i) => grid.push(`<path d="${linePath(pts)}" fill="none"
      stroke="${[C.blue, C.gold, C.green][i]}" stroke-width="1.55" opacity="0.22"/>`));
  }
  const eGeodesic = sample((t) => {
    const a = 0.72 * (1 - t) + 0.08 * t;
    const b = 0.12 * (1 - t) + 0.74 * t;
    const c = 1 - a - b;
    return barycentricPoint(a, b, c);
  }, 100);
  const mGeodesic = sample((t) => {
    const a = 0.12 + 0.34 * Math.sin(Math.PI * t);
    const b = 0.12 + 0.42 * t;
    const c = 1 - a - b;
    return barycentricPoint(a, b, c);
  }, 100);
  const p = barycentricPoint(0.43, 0.31, 0.26);
  return svg(
    "Dual geodesics crossing on a statistical manifold",
    `<path d="${linePath([barycentricPoint(1, 0, 0), barycentricPoint(0, 1, 0), barycentricPoint(0, 0, 1)], true)}"
      fill="${C.paleBlue}" opacity="0.13" stroke="${C.ink}" stroke-width="2.4"/>
    ${grid.join("\n")}
    <path d="${linePath(eGeodesic)}" class="blue" stroke-width="4"/>
    <path d="${linePath(mGeodesic)}" class="red" stroke-width="4"/>
    <circle cx="${n(p[0])}" cy="${n(p[1])}" r="7" fill="${C.ink}"/>
    <path d="M ${n(p[0] - 34)} ${n(p[1] + 25)} L ${n(p[0] + 27)} ${n(p[1] - 32)}
      M ${n(p[0] - 31)} ${n(p[1] - 28)} L ${n(p[0] + 33)} ${n(p[1] + 30)}"
      stroke="${C.ink}" stroke-width="1.7" opacity="0.45"/>`,
  );
}

function causalGraph(nodes, edges, yOffset, intervention = false) {
  const nodeMap = Object.fromEntries(nodes.map(([id, x, y, color]) => [id, { x, y: y + yOffset, color }]));
  const edgeSvg = edges.map(([from, to, cut]) => {
    const a = nodeMap[from];
    const b = nodeMap[to];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const x1 = a.x + (dx / len) * 24;
    const y1 = a.y + (dy / len) * 24;
    const x2 = b.x - (dx / len) * 31;
    const y2 = b.y - (dy / len) * 31;
    return `<path d="M ${n(x1)} ${n(y1)} L ${n(x2)} ${n(y2)}" fill="none"
      stroke="${cut ? C.red : C.ink}" stroke-width="${cut ? 2.8 : 2.2}"
      opacity="${cut ? 0.28 : 0.58}" ${cut ? 'stroke-dasharray="7 8"' : 'marker-end="url(#open-arrow)"'}/>`;
  });
  const nodeSvg = nodes.map(([id, x, y, color]) => {
    const yy = y + yOffset;
    const isDo = intervention && id === "t";
    return `<circle cx="${x}" cy="${yy}" r="${isDo ? 30 : 25}" fill="${C.paper}"
      stroke="${isDo ? C.red : color}" stroke-width="${isDo ? 4.4 : 3.1}"/>
      ${isDo ? `<path d="M ${x - 14} ${yy + 14} L ${x + 14} ${yy - 14}" stroke="${C.red}" stroke-width="3.1"/>` : ""}`;
  });
  return edgeSvg.join("\n") + nodeSvg.join("\n");
}

function causalInference() {
  const nodes = [
    ["z", 190, 88, C.violet],
    ["t", 400, 204, C.blue],
    ["y", 610, 88, C.green],
    ["u", 400, 50, C.gold],
  ];
  const observational = [["z", "t"], ["t", "y"], ["z", "y"], ["u", "t"], ["u", "y"]];
  const intervened = [["z", "t", true], ["t", "y"], ["z", "y"], ["u", "t", true], ["u", "y"]];
  return svg(
    "A causal graph before and after intervention",
    `${causalGraph(nodes, observational, 70, false)}
    <path d="M 400 438 C 400 490, 400 517, 400 562" class="ink"
      marker-end="url(#open-arrow)" opacity="0.62"/>
    ${causalGraph(nodes, intervened, 570, true)}`,
  );
}

function statisticalLearning() {
  const random = mulberry32(2718);
  const points = [];
  for (let i = 0; i < 68; i += 1) {
    const t = random();
    const x = 118 + 564 * t;
    const boundary = 505 + 125 * Math.sin(1.7 * Math.PI * t - 0.7);
    const upper = i % 2 === 0;
    const y = boundary + (upper ? -1 : 1) * (55 + 150 * random());
    const color = upper ? C.blue : C.red;
    points.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${i % 7 === 0 ? 6.3 : 4.1}"
      fill="${color}" opacity="${i % 7 === 0 ? 0.8 : 0.48}"/>`);
  }
  const boundary = sample((t) => [118 + 564 * t, 505 + 125 * Math.sin(1.7 * Math.PI * t - 0.7)], 150);
  const marginA = boundary.map(([x, y]) => [x, y - 42]);
  const marginB = boundary.map(([x, y]) => [x, y + 42]);
  return svg(
    "Two data classes separated by a nonlinear decision margin",
    `<path d="${linePath(marginA)}" fill="none" stroke="${C.mist}" stroke-width="2"
      stroke-dasharray="7 9" opacity="0.42"/>
    <path d="${linePath(marginB)}" fill="none" stroke="${C.mist}" stroke-width="2"
      stroke-dasharray="7 9" opacity="0.42"/>
    ${points.join("\n")}
    <path d="${linePath(boundary)}" class="ink" stroke-width="4"/>`,
  );
}

function valuePoint(x, y) {
  const z =
    0.9 * Math.exp(-1.5 * ((x - 0.65) ** 2 + (y - 0.2) ** 2)) +
    0.42 * Math.exp(-1.9 * ((x + 0.85) ** 2 + (y + 0.65) ** 2)) -
    0.13 * (x * x + y * y);
  return project([x, y, z], 400, 560, 132);
}

function reinforcementLearning() {
  const contours = [];
  for (let i = -6; i <= 6; i += 1) {
    const fixed = i * 0.25;
    contours.push(`<path d="${linePath(sample((t) => valuePoint(fixed, -1.6 + 3.2 * t), 80))}"
      class="soft" opacity="0.18"/>`);
    contours.push(`<path d="${linePath(sample((t) => valuePoint(-1.6 + 3.2 * t, fixed), 80))}"
      class="soft" opacity="0.18"/>`);
  }
  const states = [
    [-1.35, 1.25],
    [-1.08, 0.88],
    [-0.78, 0.5],
    [-0.36, 0.25],
    [0.02, 0.07],
    [0.33, 0.08],
    [0.58, 0.18],
    [0.67, 0.22],
  ].map(([x, y]) => valuePoint(x, y));
  const policySegments = states.slice(0, -1).map((p, i) => {
    const q = states[i + 1];
    return `<path d="M ${n(p[0])} ${n(p[1])} Q ${n((p[0] + q[0]) / 2)} ${n(Math.min(p[1], q[1]) - 12)}
      ${n(q[0])} ${n(q[1])}" fill="none" stroke="${i < 4 ? C.blue : C.gold}"
      stroke-width="3.2" marker-end="url(#open-arrow)" opacity="0.82"/>`;
  });
  return svg(
    "A policy trajectory climbing a value landscape",
    `${contours.join("\n")}
    ${policySegments.join("\n")}
    ${states.map(([x, y], i) => `<circle cx="${n(x)}" cy="${n(y)}" r="${i === states.length - 1 ? 7 : 4.5}"
      fill="${i === states.length - 1 ? C.red : C.ink}" opacity="0.84"/>`).join("\n")}`,
  );
}

const artworks = {
  "linear-algebra-map-only.svg": linearAlgebra,
  "probability-brownian-theme.svg": probabilityTheory,
  "optimization-saddle-minimax.svg": optimization,
  "functional-analysis-compact-operator.svg": functionalAnalysis,
  "real-analysis-continuum-cut.svg": realAnalysis,
  "complex-analysis-conformal-disk.svg": complexAnalysis,
  "general-topology-quotient-torus.svg": generalTopology,
  "differential-geometry-geodesic-tangent.svg": differentialGeometry,
  "number-theory-modular-farey.svg": numberTheory,
  "optimal-transport-displacement-flow.svg": optimalTransport,
  "numerical-analysis-refinement.svg": numericalAnalysis,
  "differential-equations-flow.svg": differentialEquations,
  "statistical-inference-sampling-confidence.svg": statisticalInference,
  "survival-analysis-lifelines.svg": survivalAnalysis,
  "bayesian-conditioning-posterior-band.svg": bayesianStatistics,
  "empirical-processes-cdf-bridge.svg": empiricalProcesses,
  "statistical-decision-risk-envelope.svg": decisionTheory,
  "information-theory-typical-channel.svg": informationTheory,
  "information-geometry-dual-geodesics.svg": informationGeometry,
  "causal-inference-intervention.svg": causalInference,
  "statistical-learning-margin.svg": statisticalLearning,
  "reinforcement-learning-value-flow.svg": reinforcementLearning,
};

fs.mkdirSync(outDir, { recursive: true });
for (const [filename, render] of Object.entries(artworks)) {
  fs.writeFileSync(path.join(outDir, filename), render(), "utf8");
}

console.log(`Generated ${Object.keys(artworks).length} note-cover SVGs in ${outDir}.`);
