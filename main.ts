import { Plugin } from 'obsidian';

function toLink(link: string, display: string = link) {
	return `<a data-href="${link}" href="${link}" class="internal-link autolink-link" target="_blank" rel="noopener nofollow">${display}</a>`;
}

export default class Autolink extends Plugin {
	async onload() {
		this.registerMarkdownPostProcessor((el, ctx) => {
			if (!el.hasClass("el-p"))
				return

			this.app.vault.getMarkdownFiles().reverse().forEach((mdf) => {
				// https://regex101.com/r/xBzjHB/1
				const matches = [...el.innerHTML.matchAll(new RegExp(`(?<!\\<a\\>)${mdf.basename}(?!.*\\<\\/a\\>)`, "gmi"))];
				if (matches.length == 0)
					return;

				for (const m of matches) {
					el.innerHTML = el.innerHTML.replaceAll(m[0], toLink(m[0]));
				}
			});
		});
	}

	onunload() {
	}
}
