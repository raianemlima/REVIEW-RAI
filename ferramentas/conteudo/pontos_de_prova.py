"""Converte um resumo de "pontos de prova" (Markdown) no JSON de e-book do Aprofundamento (Biblioteca › Aprofundamento).

    python3 -I ferramentas/conteudo/pontos_de_prova.py RESUMO.md id disc "Título" "Subtítulo" SAIDA.json

- cada "# Título" (um só "#") vira um capítulo do app (ids c1, c2...); dentro do capítulo, use "##" e abaixo
  (o renderizador mostra "##" como h3 e lista no sumário os títulos até h4);
- o texto é de apoio ao estudo, reescrito e sem nome de curso, de editora ou de material de origem: o script RECUSA
  menção a curso/editora/material e dado pessoal, linha de tabela com número de colunas diferente do cabeçalho e
  "#" no corpo de um capítulo;
- o e-book sai com grupo "Pontos de prova" e entra no baralho pelo mesmo caminho dos resumos por matéria.

Depois: node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/pontos-de-prova.bin SAIDA.json [...]
O Markdown e o JSON são material de estudo de uso pessoal: NÃO vão para o Git (o repositório é público); só o .bin selado vai.
"""
import json
import re
import sys
from datetime import date

CURSO = re.compile(r"cp ?iuris|reta final|dpe ?full|\bouse\b|pro leges|\bmege\b|estrat[eé]gia concursos|cursinho|dizer o direito|e-?book(?!\))|podivm|editora|sinopses?\b", re.I)
PII = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\buid:|cpfCnpj|Licenciad[oa] para|Baixado por", re.I)


def colunas(linha):
    return len(linha.strip().strip("|").split("|"))


def montar(md, eid, disc, titulo, subtitulo):
    partes = re.split(r"(?m)^# (.+)$", md.replace("\r\n", "\n"))
    if partes[0].strip():
        sys.exit("há texto antes do primeiro '# Capítulo'")
    if len(partes) < 3:
        sys.exit("nenhum '# Capítulo' no Markdown")
    caps = []
    for i in range(1, len(partes), 2):
        nome, corpo = partes[i].strip(), partes[i + 1].strip() + "\n"
        if not corpo.strip():
            sys.exit(f"capítulo '{nome}' sem texto")
        if re.search(r"(?m)^#\s", corpo):
            sys.exit(f"capítulo '{nome}': título '#' no corpo (use ##)")
        if CURSO.search(corpo + nome) or PII.search(corpo):
            sys.exit(f"capítulo '{nome}': menção a curso, editora ou material de origem, ou dado pessoal")
        linhas = corpo.split("\n")
        for n, l in enumerate(linhas):
            if re.match(r"^\s*\|", l) and n + 1 < len(linhas) and re.match(r"^\s*\|?\s*:?-{3,}", linhas[n + 1]):
                esperado, m = colunas(l), n + 2
                while m < len(linhas) and re.match(r"^\s*\|", linhas[m]):
                    if colunas(linhas[m]) != esperado:
                        sys.exit(f"capítulo '{nome}': linha de tabela com {colunas(linhas[m])} colunas (esperado {esperado}): {linhas[m][:60]}")
                    m += 1
        caps.append({"id": f"c{len(caps) + 1}", "t": nome, "md": corpo})
    return {"id": eid, "titulo": titulo, "subtitulo": subtitulo, "disc": disc, "grupo": "Pontos de prova",
            "atualizado": date.today().isoformat(), "caps": caps}


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) != 6:
        sys.exit(__doc__)
    e = montar(open(a[0], encoding="utf-8").read(), a[1], a[2], a[3], a[4])
    json.dump(e, open(a[5], "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{a[5]}: {len(e['caps'])} capítulos, {sum(len(c['md']) for c in e['caps']):,} caracteres")
