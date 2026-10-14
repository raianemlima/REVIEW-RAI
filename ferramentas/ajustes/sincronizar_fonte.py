"""Traz para o fonte.html todo o código do index.html publicado, mantendo o baralho (DECK) do fonte.

    python ferramentas/ajustes/sincronizar_fonte.py fonte.html [index.html]

O index.html do repositório tem o app inteiro em texto aberto (só o baralho é cifrado). Este script faz o caminho
inverso do build.mjs: pega o index.html, tira o baralho cifrado e a tela de entrada e põe no lugar o DECK do seu
fonte.html. Assim, qualquer mudança feita direto no site (menu, abas, estilo) entra no próximo build.
Antes de trocar, guarda uma cópia do fonte em fonte-antes-AAAAMMDD-HHMM.html (na mesma pasta; fora do GitHub).
Atualize o repositório (git pull) antes de rodar, para usar o index.html mais recente.
"""
import re, shutil, sys, time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DECK_RE = re.compile(r"^const DECK = \{.*\};$", re.M)
MARCA = "/* baralho criptografado: ver gate */"

def montar(index: str, deck_linha: str) -> str:
    if index.count(MARCA) != 1: sys.exit("index.html sem a marca do baralho: ele precisa ser um index.html gerado pelo build.mjs.")
    m = re.search(r'<script type="text/plain" id="app-src">(.*?)</script>', index, re.S)
    if not m: sys.exit("index.html sem o código do app (app-src).")
    g = index.index("<script>", index.index('id="deck-enc"'))           # tela de entrada (gate.js), que o build põe de novo
    resto = index[index.index("</script>", g) + len("</script>"):]
    return index[:m.start()].replace(MARCA, deck_linha) + "<script>" + m.group(1) + "</script>" + resto

def sincronizar(fonte: Path, index: Path):
    html = fonte.read_text(encoding="utf-8")
    d = DECK_RE.search(html)
    if not d: sys.exit(f"const DECK não encontrado em {fonte}: confira se é o arquivo-fonte (sem criptografia).")
    novo = montar(index.read_text(encoding="utf-8"), d.group(0))
    if novo == html: print(f"{fonte}: já estava igual ao site publicado"); return
    copia = fonte.with_name(f"fonte-antes-{time.strftime('%Y%m%d-%H%M')}.html")
    shutil.copy2(fonte, copia)
    fonte.write_text(novo, encoding="utf-8")
    print(f"{fonte}: código atualizado a partir de {index.name} (baralho mantido). Cópia do anterior: {copia.name}")

if __name__ == "__main__":
    if len(sys.argv) not in (2, 3): sys.exit(__doc__)
    sincronizar(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else RAIZ / "index.html")
