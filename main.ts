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
						el.innerHTML = el.innerHTML.replaceAll(m[2], toLink(m[2]));
					}
				}
			});
		});
	}

	onunload() {
	}
}
