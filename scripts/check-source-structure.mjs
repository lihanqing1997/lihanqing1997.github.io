import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const ignoredDirectories = new Set([
  ".git",
  ".jekyll-cache",
  "_site",
  "node_modules",
  "vendor",
]);
const sourceExtensions = new Set([".html", ".md", ".markdown"]);

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) files.push(file);
  }
  return files;
}

function stripNonStructuralText(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`\n]*`/g, "");
}

function countBackslashDelimiter(source, delimiter) {
  let count = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== delimiter) continue;
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
      backslashes += 1;
    }
    if (backslashes % 2 === 1) count += 1;
  }
  return count;
}

function countUnescapedDollars(source) {
  let display = 0;
  let inline = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "$") continue;
    let backslashes = 0;
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
      backslashes += 1;
    }
    if (backslashes % 2 === 1) continue;
    if (source[index + 1] === "$") {
      display += 1;
      index += 1;
    } else {
      inline += 1;
    }
  }
  return { display, inline };
}

function countRawLessThanInMath(source) {
  let count = 0;
  for (const pattern of [/\\\(([\s\S]*?)\\\)/g, /\\\[([\s\S]*?)\\\]/g]) {
    for (const match of source.matchAll(pattern)) {
      count += (match[1].match(/</g) ?? []).length;
    }
  }
  return count;
}

function tagBalance(source, tag) {
  const pattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  let balance = 0;
  let minimum = 0;
  for (const match of source.matchAll(pattern)) {
    const token = match[0];
    if (/^<\//.test(token)) balance -= 1;
    else if (!/\/>$/.test(token)) balance += 1;
    minimum = Math.min(minimum, balance);
  }
  return { balance, minimum };
}

const errors = [];
const files = walk(root);

for (const file of files) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const source = stripNonStructuralText(fs.readFileSync(file, "utf8"));

  const inlineOpen = countBackslashDelimiter(source, "(");
  const inlineClose = countBackslashDelimiter(source, ")");
  const displayOpen = countBackslashDelimiter(source, "[");
  const displayClose = countBackslashDelimiter(source, "]");
  const dollars = countUnescapedDollars(source);
  const rawLessThan = countRawLessThanInMath(source);

  if (inlineOpen !== inlineClose) {
    errors.push({ file: relative, issue: "unbalanced \\( ... \\)", open: inlineOpen, close: inlineClose });
  }
  if (displayOpen !== displayClose) {
    errors.push({ file: relative, issue: "unbalanced \\[ ... \\]", open: displayOpen, close: displayClose });
  }
  if (dollars.display % 2 !== 0) {
    errors.push({ file: relative, issue: "unbalanced $$ ... $$", delimiters: dollars.display });
  }
  if (dollars.inline % 2 !== 0) {
    errors.push({ file: relative, issue: "unbalanced $ ... $", delimiters: dollars.inline });
  }
  if (rawLessThan > 0) {
    errors.push({
      file: relative,
      issue: "raw < inside MathJax delimiters; use &lt;",
      occurrences: rawLessThan,
    });
  }

  for (const tag of ["div", "figure", "table"]) {
    const result = tagBalance(source, tag);
    if (result.balance !== 0 || result.minimum < 0) {
      errors.push({ file: relative, issue: `unbalanced <${tag}>`, ...result });
    }
  }
}

console.log(JSON.stringify({ sourceFiles: files.length, errors }, null, 2));
if (errors.length > 0) process.exit(1);
