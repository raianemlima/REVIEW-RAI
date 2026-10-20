"""Sincroniza o fonte.html com o código público do site, preservando o DECK do fonte.

    python ferramentas/ajustes/sincronizar_fonte.py fonte.html [index.html]

O index.html publicado contém o shell e o gate; o código do app é publicado em
app-src.txt. Este script lê esse arquivo irmão, substitui o marcador do baralho
pelo DECK que já existe no fonte e restaura referências data-lazy-src como tags
<script src> para que a fonte continue compatível com build.mjs.

Antes de trocar, guarda uma cópia do fonte em fonte-antes-AAAAMMDD-HHMM.html
(na mesma pasta; fora do GitHub). Atualize o repositório (git pull) antes de
rodar, para usar os artefatos mais recentes.
"""
import re
import shutil
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DECK_RE = re.compile(r"^const DECK = \{.*\};$", re.M)
MARCA = "/* baralho criptografado: ver gate */"
MODULOS = (
    "arquivos/metacognicao.js",
    "arquivos/cronograma-pesos.js",
    "arquivos/cronograma-taxonomia.js",
    "arquivos/cronograma-conteudo.js",
    "arquivos/cronograma-motor.js",
    "arquivos/cronograma.js",
    "arquivos/interface.js",
)
SCRIPT_RE = re.compile(r"<script\b([^>]*)>([\s\S]*?)</script\s*>", re.I)
APP_TAG_RE = re.compile(
    r"(<script\b(?=[^>]*\bid=[\"']app-src[\"'])[^>]*>)([\s\S]*?)(</script\s*>)",
    re.I,
)


def atributo(abertura: str, nome: str):
    padrao = re.compile(
        r"[\t\n\f\r ]" + re.escape(nome) + r"\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s\"'=<>`]+))",
        re.I,
    )
    match = padrao.search(abertura)
    return (match.group(1) or match.group(2) or match.group(3) or "") if match else None


def obter_app_src(index: str, index_path: Path, marcador):
    if not marcador:
        sys.exit("index.html sem o código do app (app-src).")
    abertura, corpo = marcador.group(1), marcador.group(2)
    referencia = atributo(abertura, "data-src")
    if referencia is not None:
        if referencia not in ("app-src.txt", "./app-src.txt"):
            sys.exit(f"referência app-src não suportada: {referencia}")
        if corpo.strip():
            sys.exit("app-src contém código inline e data-src ao mesmo tempo.")
        app_path = index_path.parent / "app-src.txt"
        if not app_path.is_file():
            sys.exit(f"app-src.txt não encontrado ao lado de {index_path}.")
        app = app_path.read_text(encoding="utf-8")
    else:
        app = corpo
    if not app.strip():
        sys.exit("app-src está vazio.")
    return app


def restaurar_modulos(resto: str) -> str:
    encontrados = {modulo: 0 for modulo in MODULOS}

    def converter(match):
        abertura = "<script" + match.group(1) + ">"
        referencia = atributo(abertura, "data-lazy-src") or atributo(abertura, "src")
        if referencia:
            caminho = referencia.strip().split("?", 1)[0].split("#", 1)[0].removeprefix("./")
            if caminho in encontrados:
                encontrados[caminho] += 1
                return f'<script src="{caminho}"></script>'
        return match.group(0)

    resultado = SCRIPT_RE.sub(converter, resto)
    ausentes = [caminho for caminho, total in encontrados.items() if total != 1]
    if ausentes:
        sys.exit("index.html precisa conter uma referência a cada módulo lazy obrigatório: " + ", ".join(ausentes))
    return resultado


def montar(index: str, deck_linha: str, app: str) -> str:
    if index.count(MARCA) != 1:
        sys.exit("index.html sem a marca do baralho: ele precisa ser gerado pelo build.mjs.")
    marcador = APP_TAG_RE.search(index)
    if not marcador:
        sys.exit("index.html sem o código do app (app-src).")
    gate_inicio = index.find("<script", marcador.end())
    if gate_inicio < 0:
        sys.exit("script do gate não encontrado após app-src.")
    gate_fim = index.find("</script>", gate_inicio)
    if gate_fim < 0:
        sys.exit("fechamento do script do gate não encontrado.")
    resto_inicio = gate_fim + len("</script>")
    resto = restaurar_modulos(index[resto_inicio:])
    return index[:marcador.start()].replace(MARCA, deck_linha) + "<script>" + app + "</script>" + resto


def sincronizar(fonte: Path, index_path: Path):
    html = fonte.read_text(encoding="utf-8")
    d = DECK_RE.search(html)
    if not d:
        sys.exit(f"const DECK não encontrado em {fonte}: confira se é o arquivo-fonte (sem criptografia).")
    index = index_path.read_text(encoding="utf-8")
    marcador = APP_TAG_RE.search(index)
    app = obter_app_src(index, index_path, marcador)
    novo = montar(index, d.group(0), app)
    if novo == html:
        print(f"{fonte}: já estava igual ao site publicado")
        return
    copia = fonte.with_name(f"fonte-antes-{time.strftime('%Y%m%d-%H%M')}.html")
    shutil.copy2(fonte, copia)
    fonte.write_text(novo, encoding="utf-8")
    print(f"{fonte}: código atualizado a partir de {index_path.name} e app-src.txt (baralho mantido). Cópia do anterior: {copia.name}")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    index = Path(sys.argv[2]) if len(sys.argv) == 3 else RAIZ / "index.html"
    sincronizar(Path(sys.argv[1]), index)
