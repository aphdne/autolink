// generic regex to grab a keyword within markdown, excluding links, headers, tags, and including variants of the keyword with -ed, -d, -s, and -es suffixes

export function getPlainRegex(keyword: string) {
	// https://regex101.com/r/9eA7Sl/5
	// 1st capture group captures $term within wikilinks, to filter them out
	// 2nd capture group captures $term, except for within headers and tags, and including with an -ed, -es, or -s suffix to allow for plurals etc.
	keyword = keyword.replaceAll("+", "\\+").replace("#", "\\#");
	const re  = `(?<=\\[\\[.*)${keyword}(?![^\\]\\]]*\\[\\[)(?=.*\\]\\])|((?<!\\#|^\\|.*|^\\#.*)\\b${keyword}[es]?s?[ed]?\\b)`;
	return new RegExp(re, "gmi");
}
