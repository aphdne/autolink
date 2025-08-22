import { Plugin } from 'obsidian';

export default class Autolink extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p"))
				return

			let text = el.innerHTML;

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				if (!text.contains(mdf.basename))
					return;
				console.log(el, mdf.basename);
			});
		});
	}

	onunload() {
	}
}
