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

function mathRegions(source) {
  const regions = [];
  const issues = [];
  let active = null;

  for (let index = 0; index < source.length; index += 1) {
    const delimiter = source[index];
    if (!["(", ")", "[", "]"].includes(delimiter) || !isEscaped(source, index)) {
      continue;
    }

    if (active === null) {
      if (delimiter === "(" || delimiter === "[") {
        active = {
          close: delimiter === "(" ? ")" : "]",
          contentStart: index + 1,
          display: delimiter === "[",
        };
      }
      continue;
    }

    if (delimiter === active.close) {
      regions.push({
        content: source.slice(active.contentStart, index - 1),
        display: active.display,
      });
      active = null;
    } else if (delimiter === "(" || delimiter === "[") {
      issues.push(`nested MathJax delimiter \\${delimiter}`);
    }
  }

  if (active !== null) {
    issues.push(`unclosed MathJax delimiter; expected \\${active.close}`);
  }

  return { regions, issues };
}

function isEscaped(source, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === "\\"; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function checkMathStructure(source) {
  const issues = [];
  const parsed = mathRegions(source);
  issues.push(...parsed.issues);

  for (const { content: region } of parsed.regions) {
    let braces = 0;
    for (let index = 0; index < region.length; index += 1) {
      if (isEscaped(region, index)) continue;
      if (region[index] === "{") braces += 1;
      if (region[index] === "}") braces -= 1;
      if (braces < 0) {
        issues.push("closing TeX brace before an opening brace");
        break;
      }
    }
    if (braces !== 0) {
      issues.push(`unbalanced TeX braces (${braces})`);
    }

    const environments = [];
    for (const token of region.matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
      if (token[1] === "begin") {
        environments.push(token[2]);
        continue;
      }
      const opened = environments.pop();
      if (opened !== token[2]) {
        issues.push(`mismatched TeX environment (${opened ?? "none"} / ${token[2]})`);
      }
    }
    if (environments.length > 0) {
      issues.push(`unclosed TeX environment (${environments.join(", ")})`);
    }
  }

  return [...new Set(issues)];
}

function countRawLessThanInMath(source) {
  return mathRegions(source).regions.reduce(
    (count, region) => count + (region.content.match(/</g) ?? []).length,
    0,
  );
}

function repeatedWords(source) {
  const repetitions = [];
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  for (const match of body.matchAll(/\b([A-Za-z]{2,})\s+\1\b/gi)) {
    if (match[1].toLowerCase() === "de") continue;
    repetitions.push(match[0].replace(/\s+/g, " "));
  }
  return [...new Set(repetitions)];
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
  const mathIssues = checkMathStructure(source);
  const repetitions = repeatedWords(source);

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
  for (const issue of mathIssues) {
    errors.push({ file: relative, issue });
  }
  for (const repetition of repetitions) {
    errors.push({ file: relative, issue: "repeated adjacent word", text: repetition });
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
