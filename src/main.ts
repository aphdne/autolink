import { Plugin } from 'obsidian';
import { registerExtension } from './register_extension.ts';
import { getPlainRegex } from './util.ts';

// TODO: work with file aliases
// TODO: headings feature
// BUG: user-inserted HTML elements cause out of range codemirror6 error

export default class Autolink extends Plugin {
	fmblacklist: string[] = [];

	async onload() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p")) // exclude links, headers, etc.
				return

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				const fm = this.app.metadataCache.getFileCache(this.app.workspace.activeEditor.file).frontmatter;

				if (fm && fm["parents"] && fm["parents"].includes("[[" + mdf.basename + "]]")) {
					return
				}

				if (this.app.workspace.activeEditor.file == mdf)
					return;
				// https://regex101.com/r/uNwlc1/1
				const name = mdf.basename.replaceAll("+", "\\+").replaceAll("#", "\\#");
				let re = `\\b(${name}(?<!\\<[^\\>]*))\\b`;
				el.innerHTML = el.innerHTML.replace(new RegExp(re, "gmi"), "<a href='$1' data-href='$1' class='internal-link autolink-link'>$1</a>");
			});
		});

		this.addCommand({
			id: "destructively-insert-all-note-links",
			name: "Destructively insert all note links",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let inCodeblock = false;
				let inFrontmatter = false;
				for (let i = 0; i < editor.lineCount(); i++) {
					let line = editor.getLine(i);

					if (i == 0 && line == "---")
					  inFrontmatter = true;

					if (inFrontmatter && line == "---")
					  inFrontmatter = false;

					if (line.startsWith("```"))
					  inCodeblock = !inCodeblock;

					if (inCodeblock || inFrontmatter)
					  continue;

					this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
						const term = mdf.basename.replace("+", "\\+").replace(".", "\\.");

						// https://regex101.com/r/9eA7Sl/5
						// 1st capture group captures $term within wikilinks, to filter them out
						// 2nd capture group captures $term, except for within headers and tags, and including with an -ed, -es, or -s suffix to allow for plurals etc.
						const matches = [...line.matchAll(getPlainRegex(term))].reverse();

						if (matches.length == 0 || this.app.workspace.activeEditor.file == mdf)
							return;

						for (const m of matches) {
							// index with [1] to use 2nd capture group
							if (!m[1])
							  continue;

							line = line.replaceAll(m[1], "[[" + mdf.name + "|" + m[1] + "]]");
						}
					});

					editor.setLine(i, line);
				}
			}
		});

		// this.registerEvent(this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, info) => {
		// 	console.log(menu);
		// }));

		registerExtension(this);
	}

	onunload() {
	}
}
