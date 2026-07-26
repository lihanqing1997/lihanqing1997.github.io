import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const notesRoot = path.join(root, "notes");
const registryPath = path.join(root, "_data", "note_registry.yml");
const registrySource = fs.readFileSync(registryPath, "utf8");
const registrySlugs = [...registrySource.matchAll(/^- slug:\s*([a-z0-9-]+)\s*$/gm)]
    .map((match) => match[1]);

const failures = [];
const warnings = [];
const records = [];

function read(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function frontMatterValue(source, key) {
    const line = source.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1];
    if (!line) {
        return null;
    }
    if (
        (line.startsWith('"') && line.endsWith('"'))
        || (line.startsWith("'") && line.endsWith("'"))
    ) {
        return line.slice(1, -1);
    }
    return line;
}

function stripMarkup(source) {
    return source
        .replace(/^---[\s\S]*?---/, "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function orderedDetailSlugs(note) {
    const indexPath = path.join(notesRoot, note, "index.html");
    if (!fs.existsSync(indexPath)) {
        failures.push(`${note}: missing topic index`);
        return [];
    }
    const source = read(indexPath);
    const english = source.match(
        /<div class="note-index-page" data-lang="en">([\s\S]*?)(?:<div class="note-index-page" data-lang="fr">|$)/
    )?.[1] ?? source;
    const pattern = new RegExp(`/notes/${note}/([^/'"]+)/`, "g");
    return [...new Set([...english.matchAll(pattern)].map((match) => match[1]))];
}

for (const note of registrySlugs) {
    const slugs = orderedDetailSlugs(note);
    const noteRecord = {
        note,
        pages: slugs.length,
        characters: 0,
        proofBlocks: 0,
        exampleBlocks: 0,
        pagesWithFigures: 0,
        boilerplatePages: 0
    };

    for (let index = 0; index < slugs.length; index += 1) {
        const slug = slugs[index];
        const filePath = path.join(notesRoot, note, slug, "index.html");
        const relativePath = path.relative(root, filePath);
        if (!fs.existsSync(filePath)) {
            failures.push(`${relativePath}: linked page is missing`);
            continue;
        }

        const source = read(filePath);
        const text = stripMarkup(source);
        const expectedPrevious = index === 0 ? null : `/notes/${note}/${slugs[index - 1]}/`;
        const expectedNext = index === slugs.length - 1 ? null : `/notes/${note}/${slugs[index + 1]}/`;
        const previous = frontMatterValue(source, "note_prev_url");
        const next = frontMatterValue(source, "note_next_url");
        const label = frontMatterValue(source, "breadcrumb_child_label_en");

        if (previous !== expectedPrevious) {
            failures.push(`${relativePath}: previous page is ${previous ?? "missing"}, expected ${expectedPrevious ?? "none"}`);
        }
        if (next !== expectedNext) {
            failures.push(`${relativePath}: next page is ${next ?? "missing"}, expected ${expectedNext ?? "none"}`);
        }
        if (!label?.startsWith(`${index + 1}. `)) {
            failures.push(`${relativePath}: breadcrumb numbering does not match position ${index + 1}`);
        }
        if (
            /records the objects, main results, proof mechanisms, and boundary cases needed for/.test(source)
            || /This page records the definitions, propositions, and proof mechanisms for/.test(source)
        ) {
            warnings.push(`${relativePath}: boilerplate introduction`);
            noteRecord.boilerplatePages += 1;
        }
        if (/<h3>(Definition|Proposition|Theorem|Proof|Remark)<\/h3>/.test(source)) {
            warnings.push(`${relativePath}: generic visible heading`);
        }

        noteRecord.characters += text.length;
        noteRecord.proofBlocks += (source.match(/class="math-statement proof"/g) || []).length;
        noteRecord.exampleBlocks += (source.match(/class="math-statement (?:example|counterexample)"/g) || []).length;
        if (/<(?:figure|svg|img)\b/.test(source)) {
            noteRecord.pagesWithFigures += 1;
        }
    }
    records.push(noteRecord);
}

const canonicalIndexes = fs.readdirSync(notesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(notesRoot, entry.name, "index.html")))
    .map((entry) => entry.name)
    .filter((name) => name !== "foundations-of-mathematics");
for (const note of canonicalIndexes) {
    if (!registrySlugs.includes(note)) {
        failures.push(`${note}: canonical note is absent from note_registry.yml`);
    }
}

const totals = records.reduce((total, record) => ({
    pages: total.pages + record.pages,
    characters: total.characters + record.characters,
    proofBlocks: total.proofBlocks + record.proofBlocks,
    exampleBlocks: total.exampleBlocks + record.exampleBlocks,
    pagesWithFigures: total.pagesWithFigures + record.pagesWithFigures,
    boilerplatePages: total.boilerplatePages + record.boilerplatePages
}), {
    pages: 0,
    characters: 0,
    proofBlocks: 0,
    exampleBlocks: 0,
    pagesWithFigures: 0,
    boilerplatePages: 0
});

console.log(JSON.stringify({
    registryNotes: registrySlugs.length,
    totals,
    records,
    failures,
    warningCount: warnings.length,
    warnings
}, null, 2));

if (failures.length > 0) {
    process.exitCode = 1;
}
