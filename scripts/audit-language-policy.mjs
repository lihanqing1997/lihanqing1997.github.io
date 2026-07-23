import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const notesRoot = path.join(root, "notes");
const errors = [];

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

function report(filePath, message) {
    errors.push(`${path.relative(root, filePath)}: ${message}`);
}

function frontMatterValue(source, key) {
    const match = source.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m"));
    return match ? match[1] : null;
}

function localPathForUrl(url) {
    return path.join(root, url.replace(/^\/+|\/+$/g, ""), "index.html");
}

const noteFiles = walk(notesRoot);
const detailFiles = noteFiles.filter((filePath) => (
    path.relative(root, filePath).split(path.sep).length === 4
    && /^layout:\s*note-detail\s*$/m.test(fs.readFileSync(filePath, "utf8"))
));
const topicIndexes = noteFiles.filter((filePath) => (
    path.relative(root, filePath).split(path.sep).length === 3
));

for (const filePath of detailFiles) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const language of ["en", "fr", "zh"]) {
        if (!source.includes(`breadcrumb_child_label_${language}:`)) {
            report(filePath, `missing ${language} breadcrumb label`);
        }
    }
    if (source.includes("data-lang=")) {
        report(filePath, "contains a localized fragment inside the canonical English body");
    }

    for (const key of ["note_back_url", "note_prev_url", "note_next_url"]) {
        const url = frontMatterValue(source, key);
        if (url && !fs.existsSync(localPathForUrl(url))) {
            report(filePath, `${key} does not resolve: ${url}`);
        }
    }
}

for (const filePath of topicIndexes) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const language of ["en", "fr", "zh"]) {
        if (!source.includes(`data-lang="${language}"`)) {
            report(filePath, `missing ${language} topic-index content`);
        }
    }
}

const papersPage = fs.readFileSync(path.join(root, "papers", "index.html"), "utf8");
const paperList = fs.readFileSync(path.join(root, "_includes", "paper-list.html"), "utf8");
for (const heading of [
    'preprints_heading="Preprints" journal_heading="Journal papers"',
    'preprints_heading="Prépublications" journal_heading="Articles de revue"',
    'preprints_heading="预印本" journal_heading="期刊论文"'
]) {
    if (!papersPage.includes(heading)) {
        errors.push(`papers/index.html: missing localized headings ${heading}`);
    }
}
if ((paperList.match(/<li>/g) || []).length !== 6) {
    errors.push("_includes/paper-list.html: expected exactly six shared English paper entries");
}

const summary = {
    detailedNotePages: detailFiles.length,
    localizedNoteIndexes: topicIndexes.length,
    sharedPaperEntries: (paperList.match(/<li>/g) || []).length,
    errors
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
    process.exitCode = 1;
}
