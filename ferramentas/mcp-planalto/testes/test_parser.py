"""Teste offline do parser com HTML no estilo do Planalto (windows-1252, texto riscado)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import planalto as P

HTML = """<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252"></head><body>
<p>LEI Nº 99.999, DE 1º DE JANEIRO DE 2026</p>
<p>TÍTULO I<br>DAS DISPOSIÇÕES GERAIS</p>
<p>CAPÍTULO I<br>DO OBJETO</p>
<p>Art. 1º Esta Lei dispõe sobre a assistência jurídica integral e gratuita.</p>
<p><strike>Art. 2º O prazo é de 10 (dez) dias.</strike></p>
<p>Art. 2º O prazo é de 15 (quinze) dias. (Redação dada pela Lei nº 15.000, de 2025)</p>
<p>§ 1º O prazo conta-se em dobro para a Defensoria Pública.</p>
<p>Art. 3º-A É vedada a cobrança de custas do hipossuficiente. (Incluído pela Lei nº 15.001, de 2025)</p>
<p><span style="text-decoration: line-through">Art. 4º Revogado de forma antiga.</span></p>
<p>Art. 1.000. Artigo de numeração com milhar.</p>
<p>ATO DAS DISPOSIÇÕES CONSTITUCIONAIS TRANSITÓRIAS</p>
<p>Art. 1º Artigo do ADCT.</p>
<p>Brasília, 1º de janeiro de 2026; 205º da Independência.</p>
<p>Art. 9º Não deve aparecer (após a assinatura).</p>
</body></html>"""

def main():
    html = P._decodificar(HTML.encode("cp1252"))
    arts = P.parse_lei(html)
    nums = [a.numero for a in arts]
    assert nums == ["1", "2", "3-A", "1000", "1"], nums
    assert [a.parte for a in arts] == ["", "", "", "", "ADCT"]
    assert "Não deve aparecer" not in arts[-1].texto
    a2 = P.achar_artigo(arts, "art. 2º")
    assert "15 (quinze)" in a2.texto and "10 (dez)" not in a2.texto, a2.texto
    assert "em dobro" in a2.texto
    assert "CAPÍTULO I" in a2.contexto.upper() or "DO OBJETO" in a2.contexto.upper(), a2.contexto
    sem = P.parse_lei(html, manter_notas=False)
    assert "Redação dada" not in P.achar_artigo(sem, "2").texto
    assert P.achar_artigo(arts, "3-A") and P.achar_artigo(arts, "1.000")
    c = P.comparar("o prazo é de 15 (quinze) dias", a2.texto)
    assert c["cobertura"] >= 0.9, c
    c = P.comparar("o prazo é de 30 (trinta) dias úteis", a2.texto)
    assert c["cobertura"] < 0.9, c
    for lei in ["CPC", "Lei 13.105/2015", "lei 15466 2026", "LC 80", "Maria da Penha"]:
        nome, urls = P.resolver(lei)
        assert urls and urls[0].startswith("https://www.planalto.gov.br/"), (lei, urls)
    print("parser ok:", nums)

if __name__ == "__main__":
    main()


def test_servidor():
    """Ferramentas do MCP com o download simulado (sem rede)."""
    import server
    P._baixar = lambda url, timeout=30: HTML.encode("cp1252")
    print(server.ler_artigo("CPC", "2")[:160])
    print(server.conferir_trecho("CPC", "2", "O prazo é de 10 (dez) dias."))
    print(server.buscar_no_texto("CPC", "Defensoria")[:200])


if __name__ == "__main__" and "--servidor" in sys.argv:
    test_servidor()
