"""Servidor MCP do Planalto: ler artigos, buscar no texto de leis e conferir trechos.

Executar:  python server.py          (transporte stdio, usado por Claude Desktop, Claude Code e VS Code)
"""
from __future__ import annotations

import json

try:  # mcp 1.x
    from mcp.server.fastmcp import FastMCP as _Server
except ImportError:  # mcp 2.x
    from mcp.server.mcpserver import MCPServer as _Server

import planalto as P

mcp = _Server("planalto", instructions=(
    "Ferramentas para consultar a legislação federal no site do Planalto (texto compilado). "
    "Use 'ler_artigo' para o texto vigente de um artigo, 'buscar_no_texto' para achar artigos por palavra, "
    "'conferir_trecho' para checar se um cartão ou material bate com a lei e 'buscar_norma' para descobrir leis novas. "
    "Trechos tachados no Planalto (revogados) são removidos, salvo pedido expresso."))


def _fmt(a: P.Artigo, url: str) -> str:
    return f"{a.texto}\n\n[{a.contexto}]\nFonte: {url}" if a.contexto else f"{a.texto}\n\nFonte: {url}"


@mcp.tool()
def listar_atalhos() -> str:
    """Lista as siglas aceitas (CF, CP, CPP, CPC, CC, CDC, ECA, LEP, LC 80...) e os endereços no Planalto."""
    return "\n".join(f"{k}: {nome} -> {P.BASE}{rel}" for k, (nome, rel) in P.ATALHOS.items())


@mcp.tool()
def ler_artigo(lei: str, artigo: str, incluir_revogados: bool = False, manter_notas: bool = True) -> str:
    """Texto oficial de um artigo. lei: sigla ('CP', 'LC 80'), 'Lei 13.105/2015' ou URL do Planalto.
    artigo: '121', '121-A', '1.015'. incluir_revogados: mantém trechos tachados.
    manter_notas: mantém '(Redação dada pela Lei...)'."""
    nome, url, arts = P.carregar(lei, incluir_revogados, manter_notas)
    a = P.achar_artigo(arts, artigo)
    if not a:
        return f"Artigo {artigo} não encontrado em {nome} ({url}). A página tem {len(arts)} artigos reconhecidos."
    return f"{nome}, art. {a.numero}\n\n" + _fmt(a, url)


@mcp.tool()
def ler_artigos(lei: str, de: str, ate: str) -> str:
    """Texto de um intervalo de artigos (ex.: de '1' até '5'). Máximo de 40 artigos por chamada."""
    nome, url, arts = P.carregar(lei)
    nums = [P.norm_art(a.numero) for a in arts]
    try:
        i, j = nums.index(P.norm_art(de)), nums.index(P.norm_art(ate))
    except ValueError:
        return "Intervalo não encontrado; confira os números dos artigos."
    sel = arts[i:j + 1][:40]
    return f"{nome} ({url})\n\n" + "\n\n".join(a.texto for a in sel)


@mcp.tool()
def buscar_no_texto(lei: str, termo: str, limite: int = 10) -> str:
    """Procura um termo (sem diferenciar acentos/maiúsculas) no texto vigente da lei e devolve os artigos que o contêm."""
    nome, url, arts = P.carregar(lei)
    alvo = P._sem_acento(termo)
    achados = [a for a in arts if alvo in P._sem_acento(a.texto)][:limite]
    if not achados:
        return f"Nenhum artigo de {nome} contém '{termo}'."
    return f"{nome} ({url}): {len(achados)} artigo(s)\n\n" + "\n\n---\n\n".join(a.texto for a in achados)


@mcp.tool()
def conferir_trecho(lei: str, artigo: str, trecho: str) -> str:
    """Compara um trecho (frente/verso de cartão, resumo de material) com o texto oficial do artigo.
    Devolve cobertura de palavras (0 a 1), semelhança da melhor janela e palavras ausentes no texto oficial."""
    nome, url, arts = P.carregar(lei, manter_notas=False)
    a = P.achar_artigo(arts, artigo)
    if not a:
        return f"Artigo {artigo} não encontrado em {nome} ({url})."
    r = P.comparar(trecho, a.texto)
    veredito = "confere" if r["cobertura"] >= 0.9 else "revisar" if r["cobertura"] >= 0.7 else "provável divergência"
    return json.dumps({"lei": nome, "artigo": a.numero, "url": url, "veredito": veredito, **r,
                       "texto_oficial": a.texto[:3000]}, ensure_ascii=False, indent=1)


@mcp.tool()
def buscar_norma(consulta: str, limite: int = 10) -> str:
    """Busca leis federais pelo assunto no LexML (ex.: 'violência contra a mulher alimentos 2026').
    Use o número encontrado em 'ler_artigo' (ex.: 'Lei 15.451/2026')."""
    try:
        res = P.buscar_lexml(consulta, limite)
    except Exception as e:  # noqa: BLE001
        return f"Falha na busca do LexML: {e}"
    return json.dumps(res, ensure_ascii=False, indent=1) if res else "Nada encontrado."


if __name__ == "__main__":
    mcp.run()
