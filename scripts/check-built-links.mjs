import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const site = path.resolve(process.argv[2] ?? "_site");
if (!fs.existsSync(site)) {
  console.error(`Built site not found: ${site}`);
  process.exit(2);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else files.push(file);
  }
  return files;
}

const allFiles = walk(site);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const fileSet = new Set(allFiles.map((file) => path.normalize(file)));
const idsByFile = new Map();

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const ids = new Set();
  for (const match of html.matchAll(/\s(?:id|name)=["']([^"']+)["']/gi)) {
    ids.add(match[1]);
  }
  idsByFile.set(path.normalize(file), ids);
}

function candidateFile(rawPath, sourceFile) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }
  const withoutQuery = decoded.split("?")[0];
  const absolute = withoutQuery.startsWith("/")
    ? path.join(site, withoutQuery.replace(/^\/+/, ""))
    : path.resolve(path.dirname(sourceFile), withoutQuery || ".");
  const normalized = path.normalize(absolute);
  const candidates = [normalized];
  if (withoutQuery.endsWith("/") || fs.existsSync(normalized) && fs.statSync(normalized).isDirectory()) {
    candidates.push(path.join(normalized, "index.html"));
  } else if (!path.extname(normalized)) {
    candidates.push(`${normalized}.html`, path.join(normalized, "index.html"));
  }
  return candidates.find((item) => fileSet.has(path.normalize(item)));
}

const errors = [];
let references = 0;

for (const sourceFile of htmlFiles) {
  const html = fs.readFileSync(sourceFile, "utf8");
  for (const match of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = match[1].trim();
    if (
      !raw ||
      raw.startsWith("data:") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("//")
    ) {
      continue;
    }
    references += 1;
    const [pathname, fragment] = raw.split("#", 2);
    if (!pathname && !fragment) continue;
    const target = pathname
      ? candidateFile(pathname, sourceFile)
      : path.normalize(sourceFile);
    if (!target) {
      errors.push(
        `${path.relative(site, sourceFile)}: missing target ${raw}`,
      );
      continue;
    }
    if (fragment && target.endsWith(".html")) {
      let decodedFragment = fragment;
      try {
        decodedFragment = decodeURIComponent(fragment);
      } catch {
        // The literal fragment remains useful in the diagnostic.
      }
      if (!idsByFile.get(path.normalize(target))?.has(decodedFragment)) {
        errors.push(
          `${path.relative(site, sourceFile)}: missing fragment #${fragment} in ${path.relative(site, target)}`,
        );
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      htmlFiles: htmlFiles.length,
      internalReferences: references,
      errors,
    },
    null,
    2,
  ),
);

if (errors.length) process.exit(1);
