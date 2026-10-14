"""
Módulo de Varredura Estratégica e Classificação de Teses para a Defensoria Pública (DPE).
"""

def classificar_tese_defensorial(texto_ementa: str) -> dict:
    """
    Analisa o texto de um julgado, súmula ou tese e classifica de acordo com
    os ramos, níveis de relevância e papéis de atuação da Defensoria Pública.
    """
    texto = texto_ementa.lower()
    
    # Detecção de Ramos do Direito
    if any(k in texto for k in ["tráfico", "pena", "prisão", "regime", "habeas", "crime", "penal", "processual penal"]):
        ramo = "Penal e Execução Penal"
    elif any(k in texto for k in ["consumidor", "superendividamento", "dívidas", "fornecedor"]):
        ramo = "Direito do Consumidor"
    elif any(k in texto for k in ["saúde", "medicamento", "hospital", "médico", "tratamento"]):
        ramo = "Saúde e Direitos Fundamentais"
    elif any(k in texto for k in ["criança", "adolescente", "educação", "escola", "menor"]):
        ramo = "Infância, Juventude e Educação"
    elif any(k in texto for k in ["família", "alimentos", "paternidade", "herdeiros", "divórcio"]):
        ramo = "Direito de Família e Civil"
    else:
        ramo = "Direitos Difusos e Coletivos / Constitucional"

    # Definição do Papel de Atuação da Defensoria
    if "vítima" in texto or "violência doméstica" in texto or "medida protetiva" in texto:
        papel = "Atendimento e Proteção Integral à Vítima"
    elif any(k in texto for k in ["réu", "apenado", "condenado", "paciente", "habeas"]):
        papel = "Defesa Criminal e Execução Penal"
    else:
        papel = "Tutela Coletiva e Assistência ao Vulnerável"

    # Critério de Relevância para Provas de DPE
    termos_essenciais = ["superendividamento", "mínimo existencial", "tráfico privilegiado", "progressão", "saúde", "repercussão geral"]
    score = sum(1 for t in termos_essenciais if t in texto)
    
    if score >= 2 or "essencial" in texto:
        relevancia = "Essencial"
    elif score == 1:
        relevancia = "Alta"
    else:
        relevancia = "Média"

    # Construção do Motivo / Justificativa Estratégica
    motivo = f"Tese voltada à proteção de vulneráveis em {ramo}, com foco em {papel.lower()}; alta incidência em concursos e atuação prática da DPE."

    return {
        "ramo": ramo,
        "relevancia": relevancia,
        "papel": papel,
        "motivo": motivo
    }
