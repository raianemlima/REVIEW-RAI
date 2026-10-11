# Instalar o Revisão DPE no celular (PWA)

O Revisão DPE é um **PWA**: um site que se instala na tela inicial e abre como aplicativo, **sem App Store, sem Google Play e sem pagar nada**.

**Endereço:** `https://raianemlima.github.io/REVIEW-RAI/` (envie este link por qualquer conversa; quem receber precisa da senha de acesso, enviada à parte).

## Instalar
**iPhone (Safari):** Compartilhar (quadrado com seta) → **Adicionar à Tela de Início** → Adicionar.
Funciona também por outros navegadores no iOS 16.4 ou mais novo, pelo mesmo menu Compartilhar.

**Android (Chrome):** menu ⋮ → **Instalar app** (ou toque em "Instalar app" no cartão da tela Hoje).

Depois de instalado, o app tem ícone da fênix, abre em tela cheia (sem a barra do navegador) e tem atalhos: segurando o ícone no Android, aparecem *Começar sessão*, *Modo ouvir*, *Novidades* e *Buscar*.

## O que funciona, e onde
| Recurso | Android (Chrome) | iPhone (Safari) | Computador |
|---|---|---|---|
| Ícone na tela inicial e tela cheia | Sim | Sim | Sim (instalação pelo Chrome/Edge) |
| Funcionar offline (depois da 1ª abertura) | Sim | Sim | Sim |
| Aviso de nova versão ("Atualizar") | Sim | Sim | Sim |
| Atalhos no ícone | Sim | Não | Sim |
| Selo com o número de revisões no ícone | Sim | Sim (iOS 16.4+, com permissão de notificações) | Sim |
| Notificação de teste | Sim | Sim (app instalado, iOS 16.4+) | Sim |
| **Lembrete diário automático** | Sim, com limites (o Chrome decide o horário exato) | **Não** (precisa de servidor de notificações) | Sim, com limites |
| Lembrete diário pelo **calendário (.ics)** | Sim | Sim | Sim |
| Compartilhar o app por link | Sim | Sim | Sim |
| Modo ouvir (voz do aparelho) | Sim | Sim (pode parar com a tela bloqueada) | Sim |

## Sobre notificações
- **Sem servidor, só dá para avisar onde o navegador agenda tarefas em segundo plano** (Chrome no Android e no computador, com o app instalado). Mesmo ali, o horário não é exato: o Chrome decide quando rodar.
- **No iPhone, o aviso diário automático exige um servidor** que envie notificações push. O app não tem servidor (de propósito: nada sai do seu aparelho), então não faz isso. A saída é o **lembrete no calendário** (Ajustes → Lembrete diário → "Lembrete no calendário"), que toca na hora certa em qualquer celular.
- Se um dia você quiser notificação push de verdade no iPhone, dá para ligar um serviço gratuito de envio (por exemplo, um Cloudflare Worker). Isso exige criar uma conta e guardar uma chave. Me peça que eu preparo.

## Limites de armazenamento
O progresso fica no navegador do aparelho. Se você **limpar os dados do navegador** ou **remover o app**, perde o progresso. O iOS também pode apagar dados de sites que ficam muito tempo sem uso (quando o app não está instalado). Por isso: instale o app e faça um **backup** de vez em quando (Ajustes → Backup).

## Atualizar
Quando houver versão nova, aparece a faixa **"Nova versão do app pronta. Atualizar"**. Toque nela. Para forçar, feche o app por completo e abra de novo.
