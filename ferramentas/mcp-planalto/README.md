# MCP Planalto

Servidor MCP que dá a um agente de IA (Claude Desktop, Claude Code, VS Code/Copilot) acesso de leitura ao texto **compilado e vigente** das leis no site do Planalto. Os trechos revogados (tachados) ficam de fora. Serve para conferir e atualizar os cartões de lei seca do app.

O app em si é estático e criptografado: ele **não** chama o MCP. Quem usa o MCP é o agente, que confere ou atualiza o conteúdo no arquivo-fonte e depois gera o `index.html` de novo.

## Ferramentas expostas

| Ferramenta | O que faz |
|---|---|
| `listar_atalhos()` | Siglas prontas (CF, ADCT, CP, CPP, CPC, CC, CDC, ECA, LEP, LC 80, CTN, LINDB, Maria da Penha, Drogas, EPD, Sinase...) |
| `ler_artigo(lei, artigo)` | Texto vigente de um artigo, com §§, incisos e notas de redação |
| `ler_artigos(lei, de, ate)` | Um intervalo de artigos |
| `buscar_no_texto(lei, termo)` | Artigos que contêm um termo (ex.: "Defensoria") |
| `conferir_trecho(lei, artigo, trecho)` | Compara um trecho (de um cartão) com o texto oficial e devolve `confere`, `revisar` ou `provável divergência` |
| `buscar_norma(consulta)` | Pesquisa normas no LexML (útil para lei nova sem atalho) |

Em `lei` você pode usar uma sigla (`CPC`), um número (`Lei 13.105/2015`, `lei 15466 2026`, `LC 80`) ou a URL do Planalto.

## Instalação (Windows, macOS ou Linux)

Você precisa do Python 3.10 ou mais novo.

```bash
cd ferramentas/mcp-planalto
pip install -r requirements.txt
python testes/test_parser.py            # teste offline: deve imprimir "parser ok"
```

Para um teste real (com internet), rode no Python: `import planalto; print(planalto.carregar("LC 80")[2][0].texto)`.

### Claude Desktop

Abra *Configurações → Desenvolvedor → Editar configuração* (`claude_desktop_config.json`) e adicione o bloco abaixo. Use o caminho completo da sua pasta:

```json
{
  "mcpServers": {
    "planalto": {
      "command": "python",
      "args": ["C:\\caminho\\cronograma-inteligente\\ferramentas\\mcp-planalto\\server.py"]
    }
  }
}
```

Depois, reinicie o Claude Desktop.

### Claude Code (terminal)

```bash
claude mcp add planalto -- python /caminho/cronograma-inteligente/ferramentas/mcp-planalto/server.py
```

### VS Code (Copilot, modo agente)

Crie o arquivo `.vscode/mcp.json`:

```json
{
  "servers": {
    "planalto": { "type": "stdio", "command": "python", "args": ["${workspaceFolder}/ferramentas/mcp-planalto/server.py"] }
  }
}
```

## Exemplos de pedido ao agente

- "Leia o art. 4º da LC 80 no Planalto e confira os cartões de lei seca da LC 80."
- "A Lei 15.466/2026 alterou o CPP? Busque a norma, leia os artigos alterados e me diga quais cartões ficaram desatualizados."
- "Rode `baralho.py conferir` para o CPC e corrija os cartões marcados como provável divergência."

## Observações

- As páginas baixadas ficam em cache por 24 h em `~/.cache/mcp-planalto`. Configure com as variáveis `MCP_PLANALTO_CACHE` e `MCP_PLANALTO_TTL` (segundos).
- O Planalto às vezes muda a URL de uma lei (ex.: `l8078compilado.htm`). Se um atalho falhar, passe a URL direto ou corrija o dicionário `ATALHOS` em `planalto.py`.
- Funciona com as versões 1.x (`FastMCP`) e 2.x (`MCPServer`) do pacote `mcp`.
