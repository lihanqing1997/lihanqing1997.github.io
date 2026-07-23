import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const writeChanges = process.argv.includes("--write");
const noteRoot = path.join(root, "notes");

function walk(directory, files = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walk(entryPath, files);
        } else if (entry.name === "index.html") {
            files.push(entryPath);
        }
    }
    return files;
}

function findMatchingDiv(source, start) {
    const tokenPattern = /<div\b[^>]*>|<\/div\s*>/gi;
    tokenPattern.lastIndex = start;
    let depth = 0;
    let match;

    while ((match = tokenPattern.exec(source)) !== null) {
        if (/^<div\b/i.test(match[0])) {
            depth += 1;
        } else {
            depth -= 1;
            if (depth === 0) {
                return tokenPattern.lastIndex;
            }
        }
    }

    throw new Error("Unclosed note-page div");
}

function findLanguageBlock(source, language) {
    const startPattern = new RegExp(
        `<div\\b(?=[^>]*\\bclass=["'][^"']*\\bnote-page\\b[^"']*["'])(?=[^>]*\\bdata-lang=["']${language}["'])[^>]*>`,
        "i"
    );
    const match = startPattern.exec(source);
    if (!match) {
        return null;
    }

    const end = findMatchingDiv(source, match.index);
    const openEnd = match.index + match[0].length;
    const closeStart = source.lastIndexOf("</div", end);
    return {
        start: match.index,
        end,
        inner: source.slice(openEnd, closeStart)
    };
}

function parseQuotedArguments(includeTag) {
    const argumentsByName = {};
    const argumentPattern = /(\w+)=(["'])(.*?)\2/g;
    let match;
    while ((match = argumentPattern.exec(includeTag)) !== null) {
        argumentsByName[match[1]] = match[3];
    }
    return argumentsByName;
}

function yamlQuote(value) {
    return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function setFrontMatterValue(frontMatter, key, value) {
    const linePattern = new RegExp(`^${key}:.*$`, "m");
    const line = `${key}: ${yamlQuote(value)}`;
    if (linePattern.test(frontMatter)) {
        return frontMatter.replace(linePattern, line);
    }
    return `${frontMatter.trimEnd()}\n${line}\n`;
}

function removeEnglishShell(inner) {
    let body = inner;
    body = body.replace(/^\s*<h2\b[\s\S]*?<\/h2>\s*/i, "");
    body = body.replace(/\s*{%\s*include\s+(?:note-topic-nav|probability-note-nav)\.html\b[\s\S]*?%}\s*/gi, "\n\n");
    return body.trim();
}

function stripTrailingRule(source) {
    return source.replace(/^\s*<hr\s*\/?>\s*$/gim, "").trim();
}

const candidates = walk(noteRoot).filter((filePath) => {
    const relativeParts = path.relative(root, filePath).split(path.sep);
    return relativeParts.length === 4;
});

const report = {
    candidates: candidates.length,
    migrated: 0,
    redirects: 0,
    alreadyMigrated: 0,
    skipped: []
};

for (const filePath of candidates) {
    const source = fs.readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");
    const relativePath = path.relative(root, filePath);

    if (/^layout:\s*note-detail\s*$/m.test(source)) {
        report.alreadyMigrated += 1;
        continue;
    }
    if (/^layout:\s*null\s*$/m.test(source) || /http-equiv=["']refresh["']/i.test(source)) {
        report.redirects += 1;
        continue;
    }

    const frontMatterMatch = source.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!frontMatterMatch) {
        report.skipped.push(`${relativePath}: missing front matter`);
        continue;
    }

    const enBlock = findLanguageBlock(source, "en");
    const frBlock = findLanguageBlock(source, "fr");
    const zhBlock = findLanguageBlock(source, "zh");
    if (!enBlock || !frBlock || !zhBlock) {
        report.skipped.push(`${relativePath}: missing a localized note-page block`);
        continue;
    }

    const navTags = [...enBlock.inner.matchAll(/{%\s*include\s+(note-topic-nav|probability-note-nav)\.html\b[\s\S]*?%}/gi)];
    if (navTags.length === 0) {
        report.skipped.push(`${relativePath}: missing English note navigation`);
        continue;
    }
    const navigation = parseQuotedArguments(navTags[0][0]);
    if (!navigation.back_url && navTags[0][1] === "probability-note-nav") {
        navigation.back_url = "/notes/probability-theory/";
    }
    if (!navigation.back_url) {
        report.skipped.push(`${relativePath}: missing back_url`);
        continue;
    }

    let frontMatter = frontMatterMatch[1].replace(/^layout:\s*\S+\s*$/m, "layout: note-detail");
    frontMatter = setFrontMatterValue(frontMatter, "note_back_url", navigation.back_url);
    if (navigation.prev_url) {
        frontMatter = setFrontMatterValue(frontMatter, "note_prev_url", navigation.prev_url);
    }
    if (navigation.next_url) {
        frontMatter = setFrontMatterValue(frontMatter, "note_next_url", navigation.next_url);
    }

    const firstBlockStart = Math.min(enBlock.start, frBlock.start, zhBlock.start);
    const lastBlockEnd = Math.max(enBlock.end, frBlock.end, zhBlock.end);
    const beforeBlocks = source.slice(frontMatterMatch[0].length, firstBlockStart).trim();
    const afterBlocks = stripTrailingRule(source.slice(lastBlockEnd));
    const bodyParts = [
        beforeBlocks,
        removeEnglishShell(enBlock.inner),
        afterBlocks
    ].filter(Boolean);
    const migratedSource = `---\n${frontMatter.trim()}\n---\n\n${bodyParts.join("\n\n")}\n`;

    if (writeChanges) {
        fs.writeFileSync(filePath, migratedSource, "utf8");
    }
    report.migrated += 1;
}

console.log(JSON.stringify(report, null, 2));
if (report.skipped.length > 0) {
    process.exitCode = 1;
}
