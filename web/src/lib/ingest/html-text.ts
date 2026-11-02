const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  rsaquo: "›",
  lsaquo: "‹",
  middot: "·",
  bull: "•",
  shy: "",
  zwj: "",
  zwnj: "",
  eacute: "é",
  egrave: "è",
  aacute: "á",
  oacute: "ó",
  iacute: "í",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  ccedil: "ç",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1]?.toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint < 0x110000 ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS =
  /<\/?(p|div|section|article|header|footer|main|aside|nav|li|ul|ol|h[1-6]|tr|td|th|table|br|hr|blockquote|dt|dd|dl|details|summary|figcaption|label|option)\b[^>]*>/gi;

/** Converts HTML to readable plain text: drops scripts/styles, keeps block boundaries as newlines. */
export function htmlToText(html: string) {
  const withoutHidden = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, " ");
  const withBreaks = withoutHidden.replace(BLOCK_TAGS, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeEntities(stripped)
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
