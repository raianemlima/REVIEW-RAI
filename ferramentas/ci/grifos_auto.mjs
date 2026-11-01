// Marcação colorida automática da lei seca que não tem os grifos do curso (texto oficial do app, resoluções, leis
// federais). Destaca os tipos de termo que as bancas mais exploram na literalidade:
//   v (vermelho) prazo, número, percentual ou quórum      a (azul)    exceção, vedação ou restrição
//   d (dourado)  dever, competência, nulidade, de ofício   m (marinho) definição legal
// Não é estatística de questões: a lei seca do curso (grifos do professor e questões por artigo) não passa por aqui.
// As notas "(Redação dada pela Lei ...)" não são marcadas. Saída no formato g do leitor: [[trecho, classe], ...].
const L = "[\\p{L}\\d]";
const NUM = "(?:\\d+(?:[.,]\\d+)?|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|mil)";
const NUMS = `${NUM}(?:\\s+e\\s+${NUM})*`;
const termo = (s, flags = "giu") => new RegExp(`(?<!${L})(?:${s})(?!${L})`, flags);
const PADROES = [
  ["v", termo(`${NUMS}\\s*(?:\\([^)]{1,40}\\)\\s*)?(?:dias?(?:\\s+(?:úteis|corridos))?|meses|mês|anos?|horas?|semanas?|salários?[- ]mínimos?|vezes)`)],
  ["v", termo(`\\d+(?:[.,]\\d+)?\\s*%(?:\\s*\\([^)]{1,40}\\))?|${NUM}\\s+por\\s+cento|(?:um|dois)\\s+(?:terço|terços|quinto|quintos|quarto|quartos)|maioria\\s+(?:absoluta|simples|qualificada)|metade|quórum|unanimidade|em\\s+dobro|triplo|no\\s+mínimo|no\\s+máximo|pelo\\s+menos|prazo\\s+razoável`)],
  ["a", termo("salvo|exceto|excetuad[oa]s?|ressalvad[oa]s?|vedad[oa]s?|vedação|proibid[oa]s?|independentemente\\s+d[eoa]s?|em\\s+nenhuma\\s+hipótese|em\\s+qualquer\\s+hipótese|não\\s+(?:se\\s+aplica|se\\s+aplicam|poderá|poderão|será|serão|haverá|constitui|constituem|configura|implica|se\\s+admite|prejudica|exime)|somente|apenas|exclusivamente|desde\\s+que|ainda\\s+que|mesmo\\s+que|sem\\s+prejuízo\\s+d[eoa]s?")],
  ["d", termo("compete(?:\\s+privativamente)?|competência\\s+(?:privativa|exclusiva|comum|concorrente)|caberá|de\\s+ofício|obrigatoriamente|obrigatóri[oa]s?|facultad[oa]s?|facultativ[oa]s?|privativ[oa]s?|privativamente|nul[oa]s?\\s+de\\s+pleno\\s+direito|será\\s+nul[oa]|serão\\s+nul[oa]s|anulável|imprescritíve(?:l|is)|irrevogáve(?:l|is)|irretratáve(?:l|is)|solidariamente|subsidiariamente|objetivamente|imediatamente|expressamente")],
  ["m", termo("considera-se|consideram-se|entende-se\\s+por|entendem-se\\s+por|define-se|denomina-se|para\\s+os\\s+(?:fins|efeitos)\\s+d[eoa]st[ae]\\s+(?:Lei|Resolução|Decreto|Código|Estatuto)")],
];
const NOTA = /\((?:Reda[çc][ãa]o dad|Inclu[íi]d|Vide|Revogad|Vig[êe]ncia|Acrescid|Renumerad|Par[áa]grafo acrescid|Inciso acrescid|Al[íi]nea acrescid|Artigo acrescid|“Caput”|"Caput"|Express[ãa]o|Regulamento|VETAD|Vetad)[^()]*(?:\([^()]*\)[^()]*)*\)/g;

/** Trechos marcados de um texto de artigo; null quando nada é marcado. */
export function marcar(texto) {
  const s = String(texto || "");
  const notas = [...s.matchAll(NOTA)].map(m => [m.index, m.index + m[0].length]);
  const emNota = (a, b) => notas.some(([x, y]) => a < y && b > x);
  const achados = [];
  for (const [classe, re] of PADROES) for (const m of s.matchAll(re)) {
    const a = m.index, b = a + m[0].length;
    if (!emNota(a, b)) achados.push([a, b, classe]);
  }
  // definições em lista ("I - dado pessoal: ...") quando o artigo define termos
  if (/considera-se|consideram-se|entende-se por|para os fins desta/i.test(s)) {
    for (const m of s.matchAll(/(^|\n)((?:[IVXLC]+(?:-[A-Z])?)\s*[-–]\s*)([^:;\n]{3,70}):/g)) {
      const a = m.index + m[1].length + m[2].length;
      achados.push([a, a + m[3].length, "m"]);
    }
  }
  if (!achados.length) return null;
  achados.sort((x, y) => x[0] - y[0] || (y[1] - y[0]) - (x[1] - x[0]));
  const segs = [];
  let pos = 0;
  for (const [a, b, c] of achados) {
    if (a < pos) continue;                  // sobreposto: fica o primeiro (e mais longo)
    if (a > pos) segs.push([s.slice(pos, a), ""]);
    segs.push([s.slice(a, b), c]);
    pos = b;
  }
  if (pos < s.length) segs.push([s.slice(pos), ""]);
  return segs;
}

/** Marca uma lei inteira ({grupos:[{itens:[{a,x,g?}]}]}); devolve quantos artigos ganharam marcação. */
export function marcarLei(lei) {
  let n = 0;
  for (const g of lei.grupos || []) for (const it of g.itens || []) {
    if (it.a === undefined || it.g) continue;
    const segs = marcar(it.x);
    if (segs) { it.g = segs; n++; }
  }
  if (n) lei.grifos = "auto";
  return n;
}
