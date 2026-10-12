"""Leitura de leis no site do Planalto (planalto.gov.br) e busca de normas no LexML.

Sem dependências além de beautifulsoup4. Faz cache em disco das páginas baixadas
(padrão: ~/.cache/mcp-planalto, validade de 24 horas).
"""
from __future__ import annotations

import difflib
import hashlib
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

from bs4 import BeautifulSoup

BASE = "https://www.planalto.gov.br/ccivil_03/"
UA = "Mozilla/5.0 (compatible; mcp-planalto/1.0; estudo de legislacao)"
CACHE_DIR = Path(os.environ.get("MCP_PLANALTO_CACHE", Path.home() / ".cache" / "mcp-planalto"))
CACHE_TTL = int(os.environ.get("MCP_PLANALTO_TTL", 24 * 3600))

# Atalhos para os diplomas mais usados em concursos de Defensoria (texto compilado).
ATALHOS: dict[str, tuple[str, str]] = {
    "CF": ("Constituição Federal de 1988", "constituicao/constituicao.htm"),
    "ADCT": ("Ato das Disposições Constitucionais Transitórias", "constituicao/constituicao.htm"),
    "CP": ("Código Penal (Decreto-Lei 2.848/1940)", "decreto-lei/del2848compilado.htm"),
    "CPP": ("Código de Processo Penal (Decreto-Lei 3.689/1941)", "decreto-lei/del3689compilado.htm"),
    "CPC": ("Código de Processo Civil (Lei 13.105/2015)", "_ato2015-2018/2015/lei/l13105.htm"),
    "CC": ("Código Civil (Lei 10.406/2002)", "leis/2002/l10406compilada.htm"),
    "CDC": ("Código de Defesa do Consumidor (Lei 8.078/1990)", "leis/l8078compilado.htm"),
    "ECA": ("Estatuto da Criança e do Adolescente (Lei 8.069/1990)", "leis/l8069.htm"),
    "LEP": ("Lei de Execução Penal (Lei 7.210/1984)", "leis/l7210.htm"),
    "LC 80": ("Lei Orgânica da Defensoria Pública (LC 80/1994)", "leis/lcp/lcp80.htm"),
    "CTN": ("Código Tributário Nacional (Lei 5.172/1966)", "leis/l5172compilado.htm"),
    "LINDB": ("Lei de Introdução às Normas do Direito Brasileiro", "decreto-lei/del4657compilado.htm"),
    "LACP": ("Lei da Ação Civil Pública (Lei 7.347/1985)", "leis/l7347orig.htm"),
    "MARIA DA PENHA": ("Lei Maria da Penha (Lei 11.340/2006)", "_ato2004-2006/2006/lei/l11340.htm"),
    "DROGAS": ("Lei de Drogas (Lei 11.343/2006)", "_ato2004-2006/2006/lei/l11343.htm"),
    "ESTATUTO DA PESSOA IDOSA": ("Estatuto da Pessoa Idosa (Lei 10.741/2003)", "leis/2003/l10.741.htm"),
    "EPD": ("Estatuto da Pessoa com Deficiência (Lei 13.146/2015)", "_ato2015-2018/2015/lei/l13146.htm"),
    "LIA": ("Lei de Improbidade Administrativa (Lei 8.429/1992)", "leis/l8429.htm"),
    "LICITACOES": ("Lei de Licitações (Lei 14.133/2021)", "_ato2019-2022/2021/lei/l14133.htm"),
    "JUIZADOS": ("Lei dos Juizados Especiais (Lei 9.099/1995)", "leis/l9099.htm"),
    "ORG CRIM": ("Lei de Organizações Criminosas (Lei 12.850/2013)", "_ato2011-2014/2013/lei/l12850.htm"),
    "SINASE": ("Lei do Sinase (Lei 12.594/2012)", "_ato2011-2014/2012/lei/l12594.htm"),
}
SINONIMOS = {
    "CONSTITUICAO": "CF", "CRFB": "CF", "CF/88": "CF", "CODIGO PENAL": "CP", "CODIGO DE PROCESSO PENAL": "CPP",
    "CODIGO DE PROCESSO CIVIL": "CPC", "CODIGO CIVIL": "CC", "LC 80/94": "LC 80", "LC 80/1994": "LC 80",
    "LEI 11.340": "MARIA DA PENHA", "LMP": "MARIA DA PENHA", "LEI 11.343": "DROGAS", "LEI 13.105": "CPC",
    "LEI 8.069": "ECA", "LEI 7.210": "LEP", "LEI 8.078": "CDC", "LEI 10.406": "CC", "LEI 13.146": "EPD",
    "LEI 8.429": "LIA", "LEI 14.133": "LICITACOES", "LEI 9.099": "JUIZADOS", "LEI 12.850": "ORG CRIM",
    "LEI 12.594": "SINASE", "LEI 7.347": "LACP", "LEI 10.741": "ESTATUTO DA PESSOA IDOSA", "CTN": "CTN",
}
# Pastas do Planalto por período, para adivinhar o endereço de leis ordinárias recentes.
PERIODOS = [(2023, 2026, "_ato2023-2026"), (2019, 2022, "_ato2019-2022"), (2015, 2018, "_ato2015-2018"),
            (2011, 2014, "_ato2011-2014"), (2007, 2010, "_ato2007-2010"), (2004, 2006, "_ato2004-2006")]


def _sem_acento(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper().strip()


def resolver(lei: str) -> tuple[str, list[str]]:
    """Recebe 'CP', 'Código Civil', 'Lei 13.105/2015', 'lei 15466 2026' ou uma URL do Planalto.
    Devolve (nome, lista de URLs candidatas)."""
    lei = lei.strip()
    if lei.startswith("http"):
        return lei, [lei]
    chave = _sem_acento(lei)
    chave = SINONIMOS.get(chave, chave)
    if chave in ATALHOS:
        nome, rel = ATALHOS[chave]
        return nome, [BASE + rel]
    m = re.search(r"(LC|LEI COMPLEMENTAR|DECRETO-LEI|DECRETO|LEI)?\s*N?[ºO°.]*\s*([\d.]+)\s*(?:/|,?\s*DE\s*\d*\s*\w*\s*(?:DE)?\s*|\s+)?(\d{2,4})?", chave)
    if not m:
        raise ValueError(f"Não reconheci a norma: {lei!r}. Use uma sigla ({', '.join(ATALHOS)}), 'Lei 13.105/2015' ou a URL do Planalto.")
    tipo, num, ano = (m.group(1) or "LEI"), m.group(2).replace(".", ""), m.group(3)
    for k, (nome, rel) in ATALHOS.items():  # número de lei que tem atalho
        if re.search(rf"\b{num}\b", rel.replace("l", " ").replace(".htm", " ")):
            return nome, [BASE + rel]
    if ano and len(ano) == 2:
        ano = ("19" if int(ano) > 30 else "20") + ano
    cands: list[str] = []
    if tipo.startswith("LC") or "COMPLEMENTAR" in tipo:
        cands += [f"{BASE}leis/lcp/lcp{num}.htm", f"{BASE}leis/lcp/Lcp{num}compilado.htm"]
    elif tipo == "DECRETO-LEI":
        cands += [f"{BASE}decreto-lei/del{num}compilado.htm", f"{BASE}decreto-lei/del{num}.htm"]
    else:
        if ano:
            a = int(ano)
            for ini, fim, pasta in PERIODOS:
                if ini <= a <= fim:
                    cands += [f"{BASE}{pasta}/{a}/lei/l{num}.htm", f"{BASE}{pasta}/{a}/lei/L{num}.htm"]
        cands += [f"{BASE}leis/l{num}compilado.htm", f"{BASE}leis/l{num}.htm", f"{BASE}leis/l{num}compilada.htm"]
    return f"{tipo.title()} {m.group(2)}" + (f"/{ano}" if ano else ""), cands


def _baixar(url: str, timeout: int = 30) -> bytes:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    arq = CACHE_DIR / (hashlib.sha1(url.encode()).hexdigest() + ".html")
    if arq.exists() and time.time() - arq.stat().st_mtime < CACHE_TTL:
        return arq.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        dados = r.read()
    arq.write_bytes(dados)
    return dados


def _decodificar(dados: bytes) -> str:
    cab = dados[:3000].decode("ascii", "ignore").lower()
    m = re.search(r'charset=["\']?([\w-]+)', cab)
    for enc in ([m.group(1)] if m else []) + ["utf-8", "cp1252"]:
        try:
            return dados.decode(enc)
        except (LookupError, UnicodeDecodeError):
            continue
    return dados.decode("cp1252", "replace")


ART_RE = re.compile(r"^Art\.?\s*(\d+(?:\.\d{3})*)\s*[º°o]?\s*(?:-\s*([A-Z]{1,2})\b)?", re.I)
NOTA_RE = re.compile(r"\((?:Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Vide|Revogad[oa]|Vig[êe]ncia|Acrescid[oa]|Renumerad[oa]|Promulga[çc][ãa]o)[^)]*\)", re.I)


@dataclass
class Artigo:
    numero: str          # "121", "121-A", "1015"
    texto: str           # caput, parágrafos, incisos e alíneas (sem trechos revogados)
    contexto: str = ""   # último título/capítulo/seção antes do artigo
    paragrafos: list[str] = field(default_factory=list)
    parte: str = ""  # "ADCT" para artigos do ADCT (mesma página da CF)


def _limpar(t: str) -> str:
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip()


def parse_lei(html: str, incluir_revogados: bool = False, manter_notas: bool = True) -> list[Artigo]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    if not incluir_revogados:  # o Planalto marca texto revogado com tachado
        for tag in soup.find_all(["strike", "s", "del"]):
            tag.decompose()
        for tag in soup.find_all(style=re.compile(r"line-through", re.I)):
            tag.decompose()
    arts: list[Artigo] = []
    atual: Artigo | None = None
    contexto = ""
    parte = ""
    for p in soup.find_all(["p", "h1", "h2", "h3", "h4"]):
        t = _limpar(p.get_text(" "))
        if not t:
            continue
        if not manter_notas:
            t = _limpar(NOTA_RE.sub("", t))
        if re.match(r"^ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT[ÓO]RIAS", t, re.I):
            parte, contexto, atual = "ADCT", "", None
            continue
        if re.match(r"^(Bras[íi]lia\s*,|Este texto não substitui)", t):
            break  # fim do texto normativo (assinaturas, anexos de publicação)
        if re.match(r"^(T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|LIVRO|PARTE)\b", t, re.I):
            contexto = t
            continue
        m = ART_RE.match(t)
        if m:
            num = m.group(1).replace(".", "") + (f"-{m.group(2).upper()}" if m.group(2) else "")
            atual = Artigo(num, t, contexto, [t], parte)
            arts.append(atual)
        elif atual is not None:
            atual.texto += "\n" + t
            atual.paragrafos.append(t)
    return arts


def carregar(lei: str, incluir_revogados: bool = False, manter_notas: bool = True) -> tuple[str, str, list[Artigo]]:
    nome, cands = resolver(lei)
    erros = []
    for url in cands:
        try:
            html = _decodificar(_baixar(url))
        except Exception as e:  # noqa: BLE001
            erros.append(f"{url}: {e}")
            continue
        arts = parse_lei(html, incluir_revogados, manter_notas)
        if "constituicao.htm" in url:  # CF e ADCT dividem a mesma página
            quer = "ADCT" if nome.startswith("Ato das") else ""
            arts = [a for a in arts if a.parte == quer]
        if arts:
            return nome, url, arts
        erros.append(f"{url}: página sem artigos reconhecíveis")
    raise LookupError("Não consegui abrir a norma no Planalto.\n" + "\n".join(erros))


def norm_art(a: str) -> str:
    a = _sem_acento(a).replace("ART.", "").replace("ART", "").replace("º", "").replace("O", "").strip()
    a = re.sub(r"\s*-\s*", "-", a).replace(".", "")
    return a


def achar_artigo(arts: list[Artigo], numero: str) -> Artigo | None:
    alvo = norm_art(numero)
    for a in arts:
        if norm_art(a.numero) == alvo:
            return a
    return None


def _tokens(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode())


def comparar(trecho: str, texto_lei: str) -> dict:
    """Mede o quanto um trecho (de cartão ou de material) bate com o texto oficial.
    Devolve a cobertura de palavras, a melhor janela correspondente e as palavras ausentes."""
    tt, tl = _tokens(trecho), _tokens(texto_lei)
    if not tt or not tl:
        return {"cobertura": 0.0, "semelhanca": 0.0, "ausentes": tt, "melhor_trecho": ""}
    conj = set(tl)
    ausentes = [w for w in tt if w not in conj and len(w) > 2]
    cobertura = 1 - len(ausentes) / max(1, len([w for w in tt if len(w) > 2]))
    n, melhor, pos = len(tt), 0.0, 0
    for i in range(0, max(1, len(tl) - n + 1), max(1, n // 4)):
        r = difflib.SequenceMatcher(None, tt, tl[i:i + n + 5]).ratio()
        if r > melhor:
            melhor, pos = r, i
    return {"cobertura": round(cobertura, 3), "semelhanca": round(melhor, 3),
            "ausentes": sorted(set(ausentes))[:30], "melhor_trecho": " ".join(tl[pos:pos + n + 5])}


def buscar_lexml(consulta: str, limite: int = 10) -> list[dict]:
    """Busca normas federais no LexML (SRU). Ex.: 'violência contra a mulher 2026'."""
    q = " and ".join(f'dc.description any "{w}"' for w in consulta.split() if len(w) > 2) or f'dc.title any "{consulta}"'
    q = f'({q}) and tipoDocumento any "Lei"'
    url = "https://www.lexml.gov.br/busca/SRU?" + urllib.parse.urlencode(
        {"operation": "searchRetrieve", "version": "1.1", "query": q, "maximumRecords": limite})
    root = ET.fromstring(_baixar(url))
    out = []
    for rec in root.iter():
        if not rec.tag.endswith("recordData"):
            continue
        d: dict = {}
        for el in rec.iter():
            nome = el.tag.split("}")[-1]
            if nome in ("title", "description", "date", "urn", "tipoDocumento", "localidade") and el.text:
                d.setdefault(nome, el.text.strip())
        if d.get("urn"):
            d["link_lexml"] = "https://www.lexml.gov.br/urn/" + d["urn"]
        out.append(d)
    return out
