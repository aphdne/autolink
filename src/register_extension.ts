import { Decoration, DecorationSet, ViewUpdate, PluginValue, PluginSpec, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Plugin } from 'obsidian';
import { getPlainRegex } from './util.ts';

export function registerExtension(plugin: Plugin) {
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

