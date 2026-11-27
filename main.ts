// news-image-20261127 — "The World Today": a newspaper front page summing up
// Friday 27 November 2026, drawn entirely in code (hand-built PNG encoder +
// hand-built 5x7 bitmap font). No network, no assets, fully deterministic.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Writes entry.png (1024x1024, <= 1 MiB) to $MAKEFUN_OUTPUT_DIR (default /output).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [248, 243, 230];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [19, 33, 61];
const NAVY2: RGB = [28, 48, 88];
const RED: RGB = [185, 28, 28];
const GOLD: RGB = [201, 162, 39];
const PANEL: RGB = [255, 253, 247];
const GREY: RGB = [90, 84, 72];
const LINE: RGB = [200, 190, 168];
const WHITE: RGB = [255, 255, 255];

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}
function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  rect(x, y, t, h, c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits, top to bottom.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "10110", "11001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01101", "10011", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10001"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "10110", "11001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "10110", "11001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01101", "10011", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  ";": ["00000", "01100", "00000", "01100", "00100", "01000", "00000"],
  ":": ["00000", "01100", "00000", "01100", "00000", "01100", "01100"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  "•": ["00000", "01110", "11111", "11111", "01110", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
};

function glyph(ch: string): string[] {
  return FONT[ch] ?? FONT["?"];
}

function textWidth(s: string, scale: number): number {
  let w = 0;
  for (const ch of s) w += 6 * scale;
  return w === 0 ? 0 : w - scale; // no trailing gap
}

function drawChar(x: number, y: number, scale: number, c: RGB, ch: string): void {
  const g = glyph(ch);
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(x: number, y: number, scale: number, c: RGB, s: string): number {
  let cx = x;
  for (const ch of s) {
    drawChar(cx, y, scale, c, ch);
    cx += 6 * scale;
  }
  return cx;
}

function drawTextCentered(cx: number, y: number, scale: number, c: RGB, s: string): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, scale, c, s);
}

// Greedy word wrap into lines no wider than maxW (in px).
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxW || cur === "") {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(
  x: number,
  y: number,
  scale: number,
  c: RGB,
  s: string,
  maxW: number,
  lineH: number,
): number {
  const lines = wrap(s, scale, maxW);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, scale, c, ln);
    yy += lineH;
  }
  return yy;
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- content
// Six real stories reported on Friday 27 November 2026.
interface Story {
  tag: string;
  tagColor: RGB;
  headline: string;
  deck: string;
}

const LEAD: Story = {
  tag: "LEAD  ·  MIDDLE EAST",
  tagColor: RED,
  headline: "DRONE STRIKE KILLS TWO ITALIANS IN KUWAIT",
  deck: "Kuwait says an Iranian drone killed two Italian workers; Tehran denies responsibility. The strike jolts the Gulf as regional tensions rise again.",
};

const STORIES: Story[] = [
  {
    tag: "GAZA",
    tagColor: RED,
    headline: "HAMAS WEIGHS REPLY AS ISRAEL KILLS 10 IN GAZA",
    deck: "Fresh Israeli strikes kill 10 people in Gaza. Hamas weighs its response as the ceasefire frays.",
  },
  {
    tag: "UNITED STATES",
    tagColor: NAVY2,
    headline: "STORMS WRECK THANKSGIVING TRAVEL",
    deck: "New York postpones its 100th Macy's parade for the first time. More than 800,000 homes lose power and over 1,000 flights are cancelled.",
  },
  {
    tag: "BRITAIN",
    tagColor: NAVY2,
    headline: "UK NET MIGRATION FALLS TO LOWEST SINCE 1997",
    deck: "Net migration drops to its lowest level since 1997, outside the pandemic years, new official figures show.",
  },
  {
    tag: "SPORT  ·  CHESS",
    tagColor: [31, 122, 60],
    headline: "GUKESH AND SINDAROV DRAW MARATHON GAME 3",
    deck: "The World Chess Championship stays level after a marathon third game. Nothing separates the two after three games.",
  },
  {
    tag: "FRANCE  ·  COURTS",
    tagColor: NAVY2,
    headline: "DEPARDIEU TO STAND TRIAL OVER ALLEGED RAPE",
    deck: "A French court rules Gerard Depardieu must stand trial over an alleged rape in 2018.",
  },
];

const TICKER =
  "IN BRIEF  ·  LILLE HAND BAYERN FIRST DEFEAT  ·  EBOLA IN CONGO PASSES 12,000 CASES";

// ---------------------------------------------------------------- layout
function drawMasthead(): void {
  rect(0, 0, W, 148, NAVY);
  rect(0, 148, W, 4, GOLD);
  drawTextCentered(W / 2, 18, 7, WHITE, "THE WORLD TODAY");
  drawTextCentered(W / 2, 82, 4, GOLD, "FRIDAY  ·  27 NOVEMBER 2026");
  drawTextCentered(
    W / 2,
    122,
    2,
    [200, 205, 220],
    "SIX STORIES THAT DEFINED THE DAY  ·  FROM KUWAIT TO KENTUCKY",
  );
}

function drawLead(): void {
  const x = 16;
  const y = 164;
  const w = W - 32;
  const h = 216;
  rect(x, y, w, h, PANEL);
  rect(x, y, w, 3, RED);
  vline(x, y, h, INK, 2);
  vline(x + w - 2, y, h, INK, 2);
  hline(x, y + h - 2, w, INK, 2);
  // kicker
  drawText(x + 20, y + 18, 2, RED, LEAD.tag);
  // red TOP STORY badge, top right, clear of the headline
  const bx = x + w - 148;
  const by = y + 10;
  rect(bx, by, 128, 28, RED);
  drawTextCentered(bx + 64, by + 8, 2, WHITE, "TOP STORY");
  // headline, scale 5
  const hx = x + 20;
  const hy = y + 44;
  drawPara(hx, hy, 5, INK, LEAD.headline, w - 40, 42);
  // deck
  const dy = hy + 92;
  drawPara(hx, dy, 2, GREY, LEAD.deck, w - 40, 20);
}

function drawPanel(x: number, y: number, w: number, h: number, s: Story): void {
  rect(x, y, w, h, PANEL);
  rect(x, y, w, 3, s.tagColor);
  vline(x, y, h, INK, 2);
  vline(x + w - 2, y, h, INK, 2);
  hline(x, y + h - 2, w, INK, 2);
  const ix = x + 14;
  drawText(ix, y + 16, 2, s.tagColor, s.tag);
  const hy = y + 42;
  const endY = drawPara(ix, hy, 3, INK, s.headline, w - 28, 26);
  drawPara(ix, endY + 8, 2, GREY, s.deck, w - 28, 19);
}

function drawTickerAndFooter(): void {
  const ty = 916;
  rect(0, ty, W, 44, INK);
  drawText(16, ty + 13, 2, WHITE, TICKER);
  drawTextCentered(
    W / 2,
    972,
    2,
    GREY,
    "SOURCES: BBC  ·  REUTERS  ·  NYT  ·  THE GUARDIAN  ·  NPR  ·  INDIA TODAY",
  );
  drawTextCentered(W / 2, 996, 2, GREY, "ALL EVENTS REPORTED ON 27 NOVEMBER 2026");
}

// ---------------------------------------------------------------- main
function main(): void {
  fill(PAPER);
  // thin double border around the whole page
  rect(0, 0, W, 4, INK);
  rect(0, H - 4, W, 4, INK);
  rect(0, 0, 4, H, INK);
  rect(W - 4, 0, 4, H, INK);

  drawMasthead();
  drawLead();

  const gx = 16;
  const gy = 396;
  const gw = 320;
  const gh = 248;
  const gap = 12;
  // row 1: stories 0,1,2
  for (let i = 0; i < 3; i++) {
    drawPanel(gx + i * (gw + gap), gy, gw, gh, STORIES[i]);
  }
  // row 2: stories 3,4 + IN BRIEF panel
  for (let i = 3; i < 5; i++) {
    drawPanel(gx + (i - 3) * (gw + gap), gy + gh + gap, gw, gh, STORIES[i]);
  }
  // IN BRIEF panel (6th cell)
  const bx = gx + 2 * (gw + gap);
  const by = gy + gh + gap;
  rect(bx, by, gw, gh, NAVY);
  rect(bx, by, gw, 3, GOLD);
  vline(bx, by, gh, INK, 2);
  vline(bx + gw - 2, by, gh, INK, 2);
  hline(bx, by + gh - 2, gw, INK, 2);
  drawText(bx + 14, by + 16, 2, GOLD, "ALSO TODAY");
  let ay = by + 46;
  ay = drawPara(
    bx + 14,
    ay,
    2,
    WHITE,
    "•  LILLE BEAT BAYERN, FIRST DEFEAT OF THE SEASON",
    gw - 28,
    20,
  );
  ay = drawPara(
    bx + 14,
    ay + 10,
    2,
    WHITE,
    "•  EBOLA IN CONGO PASSES 12,000 CASES",
    gw - 28,
    20,
  );
  ay = drawPara(
    bx + 14,
    ay + 10,
    2,
    WHITE,
    "•  DIESEL TANKER CAPSIZES OFF IBIZA, ONE DEAD",
    gw - 28,
    20,
  );

  drawTickerAndFooter();

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePNG());
}

main();
