import { Plugin } from 'obsidian';

function toLink(link: string, display: string = link) {
	return `<a data-href="${link}" href="${link}" class="internal-link autolink-link" target="_blank" rel="noopener nofollow">${display}</a>`;
}

export default class Autolink extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p")) // exclude links, headers, etc.
				return

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				// https://regex101.com/r/iMlLME/1
				let re  = `(${mdf.basename}(?<=\<a.*\>.*)(?=.*\<\/a\>)`; // capture items within a <a*> and </a>
				    re += `|${mdf.basename}(?<=\<a[^\>]*)(?=[^\<]*\>)` // capture items within a <a> tag
				    re += `)|(${mdf.basename}[es]?s?[ed]?d?)` // separate other matches into another capture group, including plurals -s & -es and -e & -ed
				const matches = [...el.innerHTML.matchAll(new RegExp(re.replace("\\", "\\\\"), "gmi"))];

				if (matches.length == 0 || this.app.workspace.activeEditor.file == mdf)
					return;

				for (const m of matches) {
					if (m[2]) {
						el.innerHTML = el.innerHTML.replaceAll(m[2], toLink(mdf.basename, m[2]));
					}
				}
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
						const re  = `(?<=\\[\\[.*)${term}(?![^\\]\\]]*\\[\\[)(?=.*\\]\\])|((?<!\\#|^\\|.*|^\\#.*)\\b${term}[es]?s?[ed]?\\b)`;
						const matches = [...line.matchAll(new RegExp(re, "gmi"))].reverse();

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
	}

	onunload() {
	}
}
