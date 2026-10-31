// Source-level checks for the shared HTML authoring template. Mathematical
// correctness and browser rendering remain separate review requirements.
function value(source, key) {
    return source.match(new RegExp(`^${key}:\\s*(.*?)\\s*$`, "m"))?.[1]?.replace(/^["']|["']$/g, "");
}
const bodyOf = source => source.replace(/^---[\s\S]*?---\s*/, "");
const plain = source => source.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const attr = (source, key) => source.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];

export function auditNoteTemplate(source, chapter) {
    const errors = [];
    const require = (condition, message) => { if (!condition) errors.push(message); };
    const body = bodyOf(source);
    const kind = value(source, "note_kind");
    require(value(source, "layout") === "note-detail", "use the note-detail layout");
    require(value(source, "note_template") === "unified-v1", "missing unified-v1 marker");
    require(Number(value(source, "note_chapter")) === chapter, "chapter metadata does not match reading order");
    require(["chapter", "research"].includes(kind), "unknown or missing note_kind");
    require(!/TODO/.test(body), "unfilled template placeholder");
    require(!/class="(?:ot|rl)-(?:learning-goal|exercises|source|comparison|table-scroll)"/.test(body), "use shared component classes");
    require(!/<style\b/.test(body), "shared page styles belong in note-study-style.html");
    require((body.match(/class="note-learning-goal"/g) || []).length === 1, "expected one learning goal");
    require(/^<p class="note-learning-goal"><strong>Learning goal\.<\/strong>\s*\S/.test(body), "open with the labeled learning goal");

    const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    require(new Set(ids).size === ids.length, "duplicate HTML ID");
    for (const link of body.matchAll(/href="#([^"]+)"/g)) {
        require(ids.includes(link[1]), `missing local anchor ${link[1]}`);
    }
    for (const heading of body.matchAll(/<h[34]([^>]*)>(.*?)<\/h[34]>/gs)) {
        require(Boolean(attr(heading[1], "id")), "section heading needs a stable ID");
        require(!/^(?:Core facts|Proof guide|Definition|Proposition|Theorem|Proof|Remark)$/.test(plain(heading[2])), "use a mathematically named section heading");
    }
    const sources = body.match(/<section class="note-sources"[^>]*>([\s\S]*?)<\/section>\s*$/);
    require(Boolean(sources), "sources must be the final section");
    require((body.match(/class="note-sources"/g) || []).length === 1, "expected one sources section");
    require(Boolean(sources?.[1].includes('id="sources-and-further-reading">Sources and further reading</h3>')), "use the shared sources heading");

    let result = 0;
    for (const block of body.matchAll(/<div class="math-statement ([^"]+)"([^>]*)>(.*?)<\/div>/gs)) {
        const [, type, attributes, contents] = block;
        const title = contents.match(/<span class="statement-title">(.*?)<\/span>/s)?.[1];
        require(Boolean(title), "statement needs a title");
        require(Boolean(attr(attributes, "id")), "statement needs a stable ID");
        if (type === "proof") {
            require(["proof", "qualified-proof", "derivation"].includes(attr(attributes, "data-proof-status")), "proof needs its qualification status");
            require(attr(attributes, "data-proof-status") !== "proof" || plain(title || "") === "Proof.", "qualified proof title must retain qualified status");
            continue;
        }
        require(["definition", "theorem", "proposition", "lemma", "corollary", "example", "counterexample", "remark"].includes(type), `unknown statement type ${type}`);
        result += 1;
        const number = `${chapter}.${result}`;
        require(attr(attributes, "data-result-number") === number, `expected result number ${number}`);
        require(new RegExp(`^(?:Worked example|${type}) ${chapter}\\.${result}(?:[ .(]|$)`, "i").test(plain(title || "")), `title must show result number ${number}`);
        require(title?.includes(`href="#${attr(attributes, "id")}"`), "statement title must link to its own anchor");
    }

    if (kind === "chapter") {
        const heading = body.indexOf('id="exercises">Exercises</h3>');
        const list = body.match(/<ol class="note-exercises">([\s\S]*?)<\/ol>/);
        require(heading >= 0 && Boolean(list), "chapter needs Exercises and the shared exercise list");
        require(Boolean(list && list.index > heading && sources && sources.index > list.index), "put exercises before final sources");
        const items = [...(list?.[1] || "").matchAll(/<li([^>]*)>(.*?)<\/li>/gs)];
        require(items.length > 0, "exercise list is empty");
        items.forEach((item, i) => {
            const number = `${chapter}.${i + 1}`;
            require(Boolean(attr(item[1], "id")), `exercise ${number} needs a stable ID`);
            require(plain(item[2]).startsWith(`Exercise ${number}. `), `expected exercise label ${number}`);
            require(item[2].includes(`href="#${attr(item[1], "id")}"`), `exercise ${number} needs a permalink`);
            const details = [...item[2].matchAll(/<details([^>]*)>\s*<summary>(.*?)<\/summary>(.*?)<\/details>/gs)];
            require(details.length === 2 && details[0][2] === "Hint" && details[1][2] === "Solution", `exercise ${number} needs separate Hint and Solution controls`);
            require(details.every(d => !/\bopen\b/.test(d[1]) && plain(d[3]).length > 0), `exercise ${number} answers must be nonempty and initially collapsed`);
        });
    } else if (kind === "research") {
        const headings = ["Research map", "Research directions", "Self-study projects", "Sources and further reading"];
        const positions = headings.map(h => body.search(new RegExp(`<h3[^>]*>${h}</h3>`)));
        require(positions.every((p, i) => p >= 0 && (!i || p > positions[i - 1])), "research sections must follow the shared order");
        require(/class="note-table-scroll"/.test(body), "research map needs the responsive table wrapper");
        const projects = body.match(/<ol class="note-projects">(.*?)<\/ol>/s)?.[1] || "";
        const items = [...projects.matchAll(/<li[^>]*>(.*?)<\/li>/gs)];
        require(items.length > 0, "research outlook needs self-study projects");
        require(items.every(item => /<summary>Suggested checks<\/summary>/.test(item[1])), "projects need expandable suggested checks");
    }
    return errors;
}

export function auditNoteIndex(source, topic) {
    const errors = [];
    if (value(source, "layout") !== "note-index" || value(source, "note_template") !== "unified-v1") errors.push("index must use the shared layout and template marker");
    const body = bodyOf(source);
    if (/<style\b|TODO/.test(body)) errors.push("index contains private styles or template placeholders");
    if (/<p\b/.test(body)) errors.push("keep landing-page explanations in the first chapter");
    let expected;
    for (const lang of ["en", "fr", "zh"]) {
        const section = body.split(`data-lang="${lang}">`)[1]?.split('<div class="note-index-page"')[0];
        if (!section) { errors.push(`missing ${lang} contents`); continue; }
        const links = [...section.matchAll(new RegExp(`/notes/${topic}/([^/'"]+)/`, "g"))].map(m => m[1]);
        if (!links.length || new Set(links).size !== links.length) errors.push(`missing or repeated chapter in ${lang} contents`);
        if (expected && JSON.stringify(links) !== JSON.stringify(expected)) errors.push(`${lang} contents differ from the English reading order`);
        expected ??= links;
        let next = 1;
        for (const list of section.matchAll(/<ol class="note-links"(?: start="(\d+)")?>(.*?)<\/ol>/gs)) {
            if (Number(list[1] || 1) !== next) errors.push(`nonsequential ${lang} contents numbering`);
            next += (list[2].match(/<li>/g) || []).length;
        }
        if (next !== links.length + 1) errors.push(`${lang} contents must use sequential ordered lists`);
    }
    return errors;
}
