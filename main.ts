import { Decoration, DecorationSet, ViewUpdate, PluginValue, PluginSpec, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Plugin } from 'obsidian';

// TODO: work with file aliases
// TODO: headings feature
// BUG: user-inserted HTML elements cause out of range codemirror6 error

// generic regex to grab a keyword within markdown, excluding links, headers, tags, and including variants of the keyword with -ed, -d, -s, and -es suffixes
function getPlainRegex(keyword: string) {
	// https://regex101.com/r/9eA7Sl/5
	// 1st capture group captures $term within wikilinks, to filter them out
	// 2nd capture group captures $term, except for within headers and tags, and including with an -ed, -es, or -s suffix to allow for plurals etc.
	keyword = keyword.replaceAll("+", "\\+");
	const re  = `(?<=\\[\\[.*)${keyword}(?![^\\]\\]]*\\[\\[)(?=.*\\]\\])|((?<!\\#|^\\|.*|^\\#.*)\\b${keyword}[es]?s?[ed]?\\b)`;
	return new RegExp(re, "gmi");
}

function registerExtension(plugin: Plugin) {
	class AutolinkExtension implements PluginValue {
		decorations: DecorationSet;
		markdownFiles: TFile[];

		constructor(view: EditorView) {
			this.markdownFiles = plugin.app.vault.getMarkdownFiles();
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		destroy() {
		}

		buildDecorations(view: EditorView): DecorationSet {
			const builder = new RangeSetBuilder<Decoration>();
			const markdownFiles = this.markdownFiles;

			if (!markdownFiles) {
				return;
			}

			for (let { from, to } of view.visibleRanges) {
				syntaxTree(view.state).iterate({ from, to, enter(node: Node) {
					if (node.type.name.startsWith('Document')) {
						const text = view.state.doc.sliceString(node.from, node.to);

						let matches = [];
						markdownFiles.forEach((mdf) => {
							const links = [...text.matchAll(getPlainRegex(mdf.basename))];
							links.forEach((link) => {
								if (link[1]) {
									matches.push({ name: mdf.basename, link: link});
								}
							})
						});

						matches.sort((a, b) => {
							if (a.link.index > b.link.index)
								return 1;
							else if (a.link.index == b.link.index)
								return 0;
							return -1;
						});

						matches.forEach((match) => {
							builder.add(match.link.index, match.link.index + match.name.length, Decoration.mark({
								class: "autolink-link",
								tagName: "a",
							}));
						});
					}
				},
			});
		}

		return builder.finish();
	  }
	}

	const pluginSpec: PluginSpec<AutolinkExtension> = {
	  decorations: (value: AutolinkExtension) => value.decorations,
	};

	plugin.registerEditorExtension(ViewPlugin.fromClass(AutolinkExtension, pluginSpec));
}

export default class Autolink extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p")) // exclude links, headers, etc.
				return

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				if (this.app.workspace.activeEditor.file == mdf)
					return;
				// https://regex101.com/r/uNwlc1/1
				const name = mdf.basename.replaceAll("+", "\\+");
				let re = `\\b(${name}(?<!\\<[^\\>]*))\\b`;
				console.log(el.innerHTML);
				el.innerHTML = el.innerHTML.replace(new RegExp(re, "gmi"), "<a href='$1' data-href='$1' class='internal-link autolink-link'>$1</a>");
				console.log(el.innerHTML);
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
