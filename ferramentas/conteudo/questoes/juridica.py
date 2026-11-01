"""Filtro "só área jurídica" das provas extraídas.

Dois níveis:
- cargo: fora engenharia, psicologia, contabilidade, TI, administração, saúde etc.; entram carreiras jurídicas
  (juiz, promotor, procurador, defensor, oficial de justiça, analista/técnico judiciário da área judiciária ou de direito);
- disciplina: dentro de um cargo jurídico, saem Português/Redação, Informática, Estatística, Raciocínio Lógico,
  Matemática, Atualidades, Administração geral e os blocos "Conhecimentos Gerais".
As questões mantêm o número original do caderno (n), para continuar rastreáveis à prova.
"""
import re
import unicodedata


def _n(t):
    return "".join(c for c in unicodedata.normalize("NFD", (t or "").lower()) if unicodedata.category(c) != "Mn")


# especialidades e áreas que não são jurídicas (engenharia, saúde, TI, contabilidade, administração...)
ESPECIALIDADE_NAO_JURIDICA = re.compile(
    r"engenh|psicolog|psiquiatr|contab|contador|medic|enferm|odont|servico social|assistente social|arquitet|biblioteco|"
    r"estatistic|economi|pedagog|comunicacao|taquigraf|licenciatura|letras\b|informatica|tecnologia|sistemas|suporte|\bti\b|"
    r"ciberseg|infraestrutura|ciencia de dados|arquivo|arquivolog|fiscal de arrecadacao|jornalis|administra|"
    r"nutri|fisioter|farmac|veterin|biolog|fonoaud|terapeut|perito|estagi|motorista|seguranca|agente|auxiliar de|"
    r"area meio|apoio a gestao|apoio especializado|analista de redes|programador|computa|assistencia social|ambiental|"
    r"agronom|edifica|quimic|fisic|geolog|topograf|cartograf|design|publicidade|relacoes publicas")
# carreiras e áreas jurídicas
DENTRO_CARGO = re.compile(
    r"juiz|promotor|procurador|defensor|oficial de justica|analista juridic|assessor juridic|advogado|direito|"
    r"judiciaria|area fim|tecnico judiciario|analista judiciario|tecnico juridic|notari|registr|"
    r"execucao penal|comissario de justica")
# cargo com termo "não jurídico" que mesmo assim é jurídico (ex.: Apoio Especializado - Direito; Administrativo-Judiciária)
EXCECAO_ADMIN = re.compile(r"administrativo\s+judiciaria|direito|juridic|oficial de justica")

FORA_DISC = re.compile(
    r"portugu|redacao|interpretacao de texto|compreensao|informatica|estatistic|raciocinio|logica|matematic|"
    r"atualidades|conhecimentos gerais|conhecimentos basicos|ingles|espanhol|geografia|historia (do|de)|realidade|"
    r"administracao (geral|publica e|de)|nocoes de administracao|contabil|arquivolog|etica no servico|gestao de pessoas")


def cargo_juridico(cargo):
    c = re.sub(r"[^a-z0-9]+", " ", _n(cargo)).strip()
    if ESPECIALIDADE_NAO_JURIDICA.search(c) and not EXCECAO_ADMIN.search(c):
        return False
    return bool(DENTRO_CARGO.search(c))


def disciplina_juridica(disciplina):
    d = _n(disciplina)
    return not FORA_DISC.search(d)


def filtrar(prova):
    """prova (dict do extrator) -> prova só com questões jurídicas; None se o cargo não for jurídico ou nada restar."""
    if not cargo_juridico(prova["cargo"]):
        return None
    qs = [q for q in prova["questoes"] if disciplina_juridica(q.get("disciplina", ""))]
    if len(qs) < 5:
        return None
    return {**prova, "questoes": qs}
