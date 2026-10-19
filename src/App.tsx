import { useEffect, useState, type ReactNode } from "react";
import Icon, { type IconName } from "./Icon";
import StudySession, { verdictOf, type CardResult, type StudyCard } from "./StudySession";

// Baralho de exemplo para a sessão; deve ser substituído pelos cartões reais do app.
const todayCards: StudyCard[] = [
  { id: "cf-134", discipline: "Constitucional", question: "Segundo a Constituição, a quem a Defensoria Pública presta assistência jurídica?", answer: "Aos necessitados: assistência jurídica integral e gratuita aos que comprovarem insuficiência de recursos, em todos os graus, judicial e extrajudicialmente.", source: "CF, art. 5º, LXXIV, e art. 134" },
  { id: "lc80-prazo", discipline: "Institucional", question: "Quais prerrogativas processuais o Defensor Público tem quanto à intimação e aos prazos?", answer: "Intimação pessoal em qualquer processo e grau de jurisdição, com contagem em dobro de todos os prazos.", source: "LC 80/94, arts. 44, I, 89, I, e 128, I; CPC, art. 186" },
  { id: "acp-legitimidade", discipline: "Tutela coletiva", question: "A Defensoria Pública tem legitimidade para propor ação civil pública?", answer: "Sim. A Defensoria Pública está no rol de legitimados para propor a ação principal e a cautelar.", source: "Lei 7.347/85, art. 5º, II" },
  { id: "cf-134-4", discipline: "Constitucional", question: "Quais são os princípios institucionais da Defensoria Pública?", answer: "A unidade, a indivisibilidade e a independência funcional.", source: "CF, art. 134, § 4º; LC 80/94, art. 3º" },
  { id: "cf-134-2", discipline: "Institucional", question: "As Defensorias Públicas estaduais têm autonomia? De que tipo?", answer: "Sim: autonomia funcional e administrativa, e a iniciativa de sua proposta orçamentária, dentro dos limites da LDO.", source: "CF, art. 134, § 2º" },
];

type DailyProgress = { date: string; rated: number; disciplines: string[]; reflected: boolean; completed: boolean; priority: string[] };

const storageKey = "review-dpe:metacognicao";
const todayKey = () => new Date().toISOString().slice(0, 10);
const emptyDay = (): DailyProgress => ({ date: todayKey(), rated: 0, disciplines: [], reflected: false, completed: false, priority: [] });

function loadProgress(): DailyProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as DailyProgress | null;
    return saved && saved.date === todayKey() ? saved : emptyDay();
  } catch {
    return emptyDay();
  }
}

const navItems: { label: string; icon: IconName; href: string }[] = [
  { label: "Hoje", icon: "home", href: "#hoje" },
  { label: "Estudar", icon: "book", href: "#estudar" },
  { label: "Biblioteca", icon: "library", href: "#biblioteca" },
  { label: "Lei seca", icon: "scale", href: "#lei-seca" },
  { label: "Progresso", icon: "chart", href: "#progresso" },
];

function Logo() {
  return (
    <a className="logo" href="#hoje" aria-label="Review DPE — início">
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>Review <strong>DPE</strong></span>
    </a>
  );
}

function AppButton({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <button className={`button ${className}`} onClick={onClick} type="button">{children}</button>;
}

function ProgressBar({ value, warm = false }: { value: number; warm?: boolean }) {
  return (
    <div aria-label={`${value}% concluído`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={value} className={`progress-track${warm ? " warm" : ""}`} role="progressbar">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function Mission({ icon, title, detail, current, total, tag }: { icon: IconName; title: string; detail: string; current: number; total: number; tag?: string }) {
  const done = current >= total;
  return (
    <article className={done ? "mission done" : "mission"}>
      <span className="mission-icon"><Icon name={done ? "check" : icon} /></span>
      <div className="mission-copy">
        <div className="mission-title"><strong>{title}</strong><span>{Math.min(current, total)}/{total}</span></div>
        <p>{detail}{tag && <em className="mission-tag">{tag}</em>}</p>
        <ProgressBar value={Math.min(100, Math.round((current / total) * 100))} />
      </div>
    </article>
  );
}

function ResourceCard({ icon, eyebrow, title, detail, badge }: { icon: IconName; eyebrow: string; title: string; detail: string; badge?: string }) {
  return (
    <a className="resource-card" href="#estudar">
      <span className="resource-icon"><Icon name={icon} /></span>
      <span className="resource-copy"><small>{eyebrow}</small><strong>{title}</strong><span>{detail}</span></span>
      {badge && <b className="resource-badge">{badge}</b>}
      <Icon name="chevron" size={18} />
    </a>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [activeNav, setActiveNav] = useState("Hoje");
  const [progress, setProgress] = useState<DailyProgress>(loadProgress);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* armazenamento indisponível */ }
  }, [progress]);

  function recordRating(result: CardResult) {
    setProgress((current) => {
      const rated = current.rated + 1;
      const isIllusion = verdictOf(result) === "illusion";
      return {
        ...current,
        rated,
        completed: current.completed || rated >= todayCards.length,
        disciplines: current.disciplines.includes(result.card.discipline) ? current.disciplines : [...current.disciplines, result.card.discipline],
        priority: isIllusion && !current.priority.includes(result.card.id) ? [...current.priority, result.card.id] : current.priority,
      };
    });
  }

  const missions = [
    { icon: "eye" as IconName, title: "Avalie sua confiança em 20 cartões", detail: "Separe o que sabe do que só reconhece", current: progress.rated, total: 20, tag: "Metacognição" },
    { icon: "layers" as IconName, title: "Estude 3 disciplinas alternadas", detail: "Alternar obriga o cérebro a recalibrar", current: progress.disciplines.length, total: 3 },
    { icon: "pencil" as IconName, title: "Faça a reflexão pós-sessão", detail: "O que funcionou e o que muda amanhã", current: progress.reflected ? 1 : 0, total: 1, tag: "Metacognição" },
    { icon: "flame" as IconName, title: "Feche a meta do dia", detail: "Mantenha sua sequência", current: progress.completed ? 1 : 0, total: 1 },
  ];
  const missionsDone = missions.filter((mission) => mission.current >= mission.total).length;
  const xp = Math.min(100, progress.rated * 5 + missionsDone * 20);
  const goalPercent = Math.min(100, Math.round((progress.rated / todayCards.length) * 100));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Navegação principal">
          {navItems.map((item) => (
            <a className={activeNav === item.label ? "nav-link active" : "nav-link"} href={item.href} key={item.label} onClick={() => setActiveNav(item.label)}>
              <Icon name={item.icon} /><span>{item.label}</span>
              {item.label === "Lei seca" && <b className="notification-dot">10</b>}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="streak-mini"><span><Icon name="flame" size={18} /></span><div><strong>7 dias</strong><small>sequência atual</small></div></div>
          <a className="nav-link" href="#ajustes"><Icon name="settings" /><span>Ajustes</span></a>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-logo"><Logo /></div>
          <div className="sync-state"><Icon name="cloud" size={17} /> sincronizado na sua conta</div>
          <div className="top-actions">
            {searchOpen && <label className="search-field"><span className="sr-only">Buscar no Review DPE</span><input autoFocus placeholder="Buscar no Review DPE" type="search" /></label>}
            <AppButton className="icon-button" onClick={() => setSearchOpen((current) => !current)}><span className="sr-only">Buscar</span><Icon name="search" size={20} /></AppButton>
            <AppButton className="icon-button" onClick={() => setDark((current) => !current)}><span className="sr-only">Alternar tema</span><Icon name={dark ? "sun" : "moon"} size={20} /></AppButton>
            <AppButton className="profile-button"><span>MA</span><span className="profile-copy"><strong>Marina Alves</strong><small>Plano ativo</small></span><Icon name="chevron" size={16} /></AppButton>
          </div>
        </header>

        <div className="page" id="hoje">
          <section className="welcome">
            <div>
              <span className="eyebrow">Boa tarde, Marina</span>
              <h1>O próximo passo da sua aprovação começa agora.</h1>
              <p>Seu plano de hoje está pronto. Uma sessão curta já mantém seu ritmo e protege o que você aprendeu.</p>
            </div>
            <div className="date-chip"><span>HOJE</span><strong>18</strong><small>OUT</small></div>
          </section>

          <section className="dashboard-grid">
            <article className="focus-card">
              <div className="focus-topline">
                <span className="pill pill-light"><Icon name="spark" size={16} /> Revisão de hoje</span>
                <span className="streak-pill"><Icon name="flame" size={17} /> 7 dias</span>
              </div>

              {sessionStarted ? (
                <StudySession
                  cards={todayCards}
                  onExit={() => setSessionStarted(false)}
                  onRate={recordRating}
                  onReflect={() => setProgress((current) => ({ ...current, reflected: true }))}
                />
              ) : (
                <>
                  <div className="focus-main">
                    <div className="level-orbit" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="level-core"><Icon name="flame" size={34} /></span><b>1</b></div>
                    <div className="focus-copy"><span className="eyebrow">Seu plano personalizado</span><h2>{progress.completed ? "Meta batida!" : "Vamos estudar?"}</h2><p><strong>{todayCards.length} cartões</strong> para hoje <span>•</span> cerca de 5 min</p></div>
                  </div>
                  {progress.priority.length > 0 && (
                    <p className="priority-note"><Icon name="alert" size={16} /> <span><strong>{progress.priority.length} {progress.priority.length === 1 ? "item" : "itens"} com ilusão de conhecimento</strong> vão para a revisão prioritária de amanhã.</span></p>
                  )}
                  <div className="level-progress">
                    <div><strong>Ovo de Fênix · nível 1</strong><span>{xp}/100 XP</span></div>
                    <ProgressBar value={Math.max(xp, 2)} warm />
                    <div className="goal-copy"><span>Meta de hoje</span><strong>{goalPercent}%</strong></div>
                    <ProgressBar value={goalPercent} />
                  </div>
                  <blockquote>“Reconhecer o texto não é saber a matéria. Antes de virar o cartão, pergunte: eu explicaria isso sem olhar?”</blockquote>
                  <AppButton className="button-primary button-large" onClick={() => setSessionStarted(true)}>{progress.completed ? "Estudar de novo" : "Começar sessão"} <Icon name="arrow" size={19} /></AppButton>
                  <p className="reassurance"><Icon name="clock" size={15} /> Planejar, responder e avaliar em cerca de 5 minutos</p>
                </>
              )}
            </article>

            <aside className="right-column">
              <article className="missions-card">
                <div className="section-heading"><div><span className="eyebrow">Ritmo diário</span><h2>Missões de hoje</h2></div><span className="counter">{missionsDone}/{missions.length} <small>+20 XP cada</small></span></div>
                <div className="missions-list">
                  {missions.map((mission) => <Mission key={mission.title} {...mission} />)}
                </div>
              </article>
              <article className="week-card" id="progresso">
                <div className="section-heading compact"><div><span className="eyebrow">Sua semana</span><h2>6 de 7 dias</h2></div><span className="success-copy">Em boa sequência</span></div>
                <div className="week-days">
                  {["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => (
                    <div className={index === 3 ? "day rest" : index === 6 ? "day today" : "day done"} key={`${day}-${index}`}><span>{index === 3 ? "—" : <Icon name="check" size={15} />}</span><small>{day}</small></div>
                  ))}
                </div>
              </article>
            </aside>
          </section>

          <section className="learning-section" id="estudar">
            <div className="section-title-row">
              <div><span className="eyebrow">Continue avançando</span><h2>Seu estudo, organizado</h2><p>Leia, treine e revise os pontos mais importantes para a Defensoria.</p></div>
              <a className="text-link" href="#biblioteca">Ver biblioteca <Icon name="arrow" size={17} /></a>
            </div>
            <div className="resource-grid" id="biblioteca">
              <ResourceCard icon="scale" eyebrow="Ler e aprender" title="Lei seca" detail="Os artigos que mais caem, com questões de prova" badge="10 novas" />
              <ResourceCard icon="book" eyebrow="Atualizado" title="Novidades legislativas" detail="Leis, súmulas e teses recentes" badge="8 leis" />
              <ResourceCard icon="library" eyebrow="Aprofundamento" title="Biblioteca" detail="Doutrina, quadros, glossário e seus cartões" />
            </div>
          </section>

          <section className="legal-highlight" id="lei-seca">
            <div className="legal-icon"><Icon name="scale" size={28} /></div>
            <div><span className="eyebrow">Novidade legislativa</span><h2>Lei 15.512/2026</h2><p>ECA Ambiental: direito da criança e do adolescente à natureza.</p></div>
            <a className="button button-secondary" href="#lei-seca">Ler atualização <Icon name="arrow" size={18} /></a>
          </section>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação principal mobile">
        {navItems.map((item) => (
          <a className={activeNav === item.label ? "active" : ""} href={item.href} key={item.label} onClick={() => setActiveNav(item.label)}>
            <span><Icon name={item.icon} size={21} />{item.label === "Lei seca" && <b>10</b>}</span><small>{item.label}</small>
          </a>
        ))}
      </nav>
    </div>
  );
}
