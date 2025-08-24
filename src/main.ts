import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { registerExtension } from './register_extension.ts';
import { getPlainRegex } from './util.ts';

// TODO: work with file aliases
// TODO: headings feature
// BUG: user-inserted HTML elements cause out of range codemirror6 error

interface Settings {
	fmBlacklist: string;
}

const DEFAULT_SETTINGS: Partial<Settings> = {
	fmBlacklist: "autolink-blacklist; ",
}

class SettingsTab extends PluginSettingTab {
	plugin: Autolink;

	constructor(app: App, plugin: Autolink) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Blacklist properties")
			.setDesc("Frontmatter properties to use as blacklists")
			.addText((text) => {
				text
					.setPlaceholder("autolink-blacklist; ...")
					.setValue(this.plugin.settings.fmBlacklist)
					.onChange(async (value) => {
						this.plugin.settings.fmBlacklist = value;
						await this.plugin.saveSettings();
					});
			});
	}
}

export default class Autolink extends Plugin {
	fmBlacklist: string[] = [];

	async onload() {
		await this.loadSettings();

		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p")) // exclude links, headers, etc.
				return

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				const fm = this.app.metadataCache.getFileCache(this.app.workspace.activeEditor.file).frontmatter;

				if (fm) {
					for (const term of this.fmBlacklist) {
						if (fm[term] && fm[term].includes("[[" + mdf.basename + "]]")) {
							return
						}
					}
				}

				if (this.app.workspace.activeEditor.file == mdf)
					return;

				// https://regex101.com/r/uNwlc1/3
				const name = mdf.basename.replaceAll("+", "\\+").replaceAll("#", "\\#");
				let re = `\\b((?<!\\>.*)${name}(?<!\\<[^\\>]*))\\b`
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

		this.addSettingTab(new SettingsTab(this.app, this));
		registerExtension(this);
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		this.fmBlacklist = [];
		this.settings.fmBlacklist.replaceAll(" ", "").split(";").forEach((a) => this.fmBlacklist.push(a.toLowerCase().trim()));
		console.log(this.fmBlacklist);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.loadSettings();
	}
}
