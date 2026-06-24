/**
 * Sync mean pricing / consumable default prices with Excel.
 *
 * Export current values to a workbook:
 *   node scripts/pricing-excel.mjs export [output.xlsx]
 *
 * Apply edits from Excel back into src/utils/*.ts:
 *   node scripts/pricing-excel.mjs import path/to/file.xlsx
 *
 * Workbook: one sheet per category (sheet names are case-insensitive).
 * Columns: Key | Price (PHP). First row can be a header (Key / Price / etc.).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PRICING_FILES = [
  { sheet: "CCTV", file: "src/utils/cctvMeanPricing.ts", constName: "CCTV_MEAN", kind: "ident" },
  {
    sheet: "FireProtection",
    file: "src/utils/fireProtectionMeanPricing.ts",
    constName: "FIRE_PROTECTION_MEAN",
    kind: "ident",
  },
  { sheet: "FireAlarm", file: "src/utils/fireAlarmMeanPricing.ts", constName: "FIRE_ALARM_MEAN", kind: "ident" },
  {
    sheet: "BurglarAlarm",
    file: "src/utils/burglarAlarmMeanPricing.ts",
    constName: "BURGLAR_ALARM_MEAN",
    kind: "ident",
  },
  {
    sheet: "AccessControl",
    file: "src/utils/accessControlMeanPricing.ts",
    constName: "ACCESS_CONTROL_MEAN",
    kind: "ident",
  },
  {
    sheet: "Consumables",
    file: "src/utils/consumableDefaultPrices.ts",
    constName: "CONSUMABLE_DEFAULT_PRICES",
    kind: "string",
  },
];

function normalizeSheetName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @param {string} content */
function findObjectBlock(content, constName) {
  const re = new RegExp(`export\\s+const\\s+${escapeRegExp(constName)}\\b[^=]*=\\s*\\{`);
  const m = content.match(re);
  if (!m || m.index === undefined) {
    throw new Error(`export const ${constName} = { … } not found`);
  }
  const openBrace = content.indexOf("{", m.index);
  if (openBrace === -1) throw new Error(`Opening brace for ${constName} not found`);

  let depth = 0;
  for (let i = openBrace; i < content.length; i++) {
    const c = content[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return content.slice(openBrace + 1, i);
      }
    }
  }
  throw new Error(`Unclosed object for ${constName}`);
}

/** @param {string} block */
function extractIdentPairs(block) {
  const pairs = [];
  const lines = block.split(/\r?\n/);
  const re = /^[ \t]*([A-Z][A-Z0-9_]*)\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,?\s*(?:\/\/.*)?$/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) pairs.push([m[1], Number(m[2])]);
  }
  return pairs;
}

/** @param {string} block */
function extractStringPairs(block) {
  const pairs = [];
  const lines = block.split(/\r?\n/);
  const re = /^[ \t]*'([^']*)'\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,?\s*$/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) pairs.push([m[1], Number(m[2])]);
  }
  return pairs;
}

/** @param {string} content @param {string} key @param {number} numericValue */
function replaceIdentPrice(content, key, numericValue) {
  if (!Number.isFinite(numericValue)) return content;
  const probe = new RegExp(
    `^[ \\t]*${escapeRegExp(key)}\\s*:\\s*-?[0-9]+(?:\\.[0-9]+)?(?:\\s*,.*)?$`,
    "m",
  );
  if (!probe.test(content)) {
    console.warn(`  [skip] identifier key not found: ${key}`);
    return content;
  }
  const re = new RegExp(
    `^([ \\t]*)(${escapeRegExp(key)}\\s*:\\s*)(-?[0-9]+(?:\\.[0-9]+)?)((?:\\s*,.*)?)$`,
    "gm",
  );
  return content.replace(re, (_, indent, lhs, _old, tail) => `${indent}${lhs}${numericValue}${tail}`);
}

/** @param {string} content @param {string} key @param {number} numericValue */
function replaceStringKeyPrice(content, key, numericValue) {
  if (!Number.isFinite(numericValue)) return content;
  const escapedKey = escapeRegExp(key);
  const probe = new RegExp(
    `^[ \\t]*'${escapedKey}'\\s*:\\s*-?[0-9]+(?:\\.[0-9]+)?(?:\\s*,.*)?$`,
    "m",
  );
  if (!probe.test(content)) {
    console.warn(`  [skip] consumable key not found: ${key}`);
    return content;
  }
  const re = new RegExp(
    `^([ \\t]*)('${escapedKey}')(\\s*:\\s*)(-?[0-9]+(?:\\.[0-9]+)?)((?:\\s*,.*)?)$`,
    "gm",
  );
  return content.replace(
    re,
    (_, indent, q, colonPart, _oldNum, tail) => `${indent}${q}${colonPart}${numericValue}${tail}`,
  );
}

function isHeaderKeyCell(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "key" || s === "product" || s === "name" || s === "item" || s === "id";
}

function isHeaderPriceCell(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "price" || s === "price (php)" || s === "php" || s === "amount" || s === "value";
}

/** @param {XLSX.WorkSheet} ws @returns {Map<string, number>} */
function readSheetKeyPrices(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const map = new Map();
  let startRow = 0;
  if (rows.length > 0) {
    const r0 = rows[0];
    const a = r0[0];
    const b = r0[1];
    if (isHeaderKeyCell(a) || isHeaderPriceCell(b)) startRow = 1;
  }
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i];
    const key = String(r[0] ?? "").trim();
    if (!key) continue;
    const raw = r[1];
    const num = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
    if (!Number.isFinite(num)) {
      console.warn(`  [skip] non-numeric price for "${key}": ${raw}`);
      continue;
    }
    map.set(key, num);
  }
  return map;
}

function sheetToConfig(sheetName) {
  const n = normalizeSheetName(sheetName);
  return PRICING_FILES.find((p) => normalizeSheetName(p.sheet) === n);
}

function readUtf8Normalized(abs) {
  return fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
}

/** Read file as LF for regex matching; remember EOL so we can write without noisy line-ending diffs on Windows. */
function readTextWithEol(abs) {
  const raw = fs.readFileSync(abs, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = raw.replace(/\r\n/g, "\n");
  return { normalized, eol };
}

function writeTextWithEol(abs, normalized, eol) {
  const out = eol === "\r\n" ? normalized.replace(/\n/g, "\r\n") : normalized;
  fs.writeFileSync(abs, out, "utf8");
}

function exportWorkbook(outPath) {
  const wb = XLSX.utils.book_new();
  for (const cfg of PRICING_FILES) {
    const abs = path.join(ROOT, cfg.file);
    const text = readUtf8Normalized(abs);
    const block = findObjectBlock(text, cfg.constName);
    const pairs = cfg.kind === "ident" ? extractIdentPairs(block) : extractStringPairs(block);
    const aoa = [["Key", "Price (PHP)"], ...pairs];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, cfg.sheet);
    console.log(`Export ${cfg.sheet}: ${pairs.length} rows`);
  }
  XLSX.writeFile(wb, outPath);
  console.log(`Wrote ${outPath}`);
}

function importWorkbook(xlsxPath) {
  const buf = fs.readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  for (const sheetName of wb.SheetNames) {
    const cfg = sheetToConfig(sheetName);
    if (!cfg) {
      console.log(`Skip sheet (unknown name): ${sheetName}`);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const updates = readSheetKeyPrices(ws);
    if (updates.size === 0) {
      console.log(`No rows in sheet: ${sheetName}`);
      continue;
    }
    const abs = path.join(ROOT, cfg.file);
    const { normalized, eol } = readTextWithEol(abs);
    let content = normalized;
    console.log(`Import ${sheetName} -> ${cfg.file} (${updates.size} keys)`);
    for (const [key, price] of updates) {
      content =
        cfg.kind === "ident" ? replaceIdentPrice(content, key, price) : replaceStringKeyPrice(content, key, price);
    }
    writeTextWithEol(abs, content, eol);
  }
  console.log("Import finished.");
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "export") {
  const out = arg ? path.resolve(process.cwd(), arg) : path.join(ROOT, "pricing-master.xlsx");
  exportWorkbook(out);
} else if (cmd === "import") {
  if (!arg) {
    console.error("Usage: node scripts/pricing-excel.mjs import <file.xlsx>");
    process.exit(1);
  }
  const xlsxPath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    process.exit(1);
  }
  importWorkbook(xlsxPath);
} else {
  console.error(`Usage:
  node scripts/pricing-excel.mjs export [output.xlsx]
  node scripts/pricing-excel.mjs import <file.xlsx>`);
  process.exit(1);
}
