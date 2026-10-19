import { useEffect, useState, type ReactNode } from "react";

type IconName =
  | "home"
  | "book"
  | "library"
  | "scale"
  | "chart"
  | "search"
  | "moon"
  | "sun"
  | "settings"
  | "cloud"
  | "flame"
  | "target"
  | "layers"
  | "check"
  | "arrow"
  | "clock"
  | "spark"
  | "chevron";

const icons: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22Z" /><path d="M4 5.5v13A3.5 3.5 0 0 0 7.5 22" /></>,
  library: <><path d="M4 4h6v16H4z" /><path d="M14 4h6v16h-6z" /><path d="M7 8h0M17 8h0" /></>,
  scale: <><path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7ZM19 7l-3 6h6l-3-6ZM8 21h8" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88L4.2 7.02l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3h4v.08A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.25.61.85 1.01 1.51 1.03H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
  cloud: <path d="M17.5 19H6a4 4 0 0 1-.4-7.98A6 6 0 0 1 17 8.5a5.25 5.25 0 0 1 .5 10.5Z" />,
  flame: <path d="M12.5 22c4 0 7-2.7 7-6.5 0-2.6-1.4-5-4.2-7.5.1 2.4-1.1 3.8-2.2 4.3.3-4.2-2.2-7-5.1-9.3.3 4.8-3.5 7.4-3.5 12.5 0 3.8 3 6.5 7 6.5Z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  spark: <><path d="m12 2 1.4 5.1L18 10l-4.6 2.9L12 18l-1.4-5.1L6 10l4.6-2.9L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>{icons[name]}</svg>;
}

const navItems: { label: string; icon: IconName; href: string }[] = [
  { label: "Hoje", icon: "home", href: "#hoje" },
  { label: "Estudar", icon: "book", href: "#estudar" },
  { label: "Biblioteca", icon: "library", href: "#biblioteca" },
  { label: "Lei seca", icon: "scale", href: "#lei-seca" },
  { label: "Progresso", icon: "chart", href: "#progresso" },
];

function Logo() {
  return <a className="logo" href="#hoje" aria-label="Review DPE — início"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span><span>Review <strong>DPE</strong></span></a>;
}

function AppButton({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <button className={`button ${className}`} onClick={onClick} type="button">{children}</button>;
}

function ProgressBar({ value, warm = false }: { value: number; warm?: boolean }) {
  return <div aria-label={`${value}% concluído`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={value} className={`progress-track${warm ? " warm" : ""}`} role="progressbar"><span style={{ width: `${value}%` }} /></div>;
}

function Mission({ icon, title, detail, current, total }: { icon: IconName; title: string; detail: string; current: number; total: number }) {
  return <article className="mission"><span className="mission-icon"><Icon name={icon} /></span><div className="mission-copy"><div className="mission-title"><strong>{title}</strong><span>{current}/{total}</span></div><p>{detail}</p><ProgressBar value={Math.round((current / total) * 100)} /></div></article>;
}

function ResourceCard({ icon, eyebrow, title, detail, badge }: { icon: IconName; eyebrow: string; title: string; detail: string; badge?: string }) {
  return <a className="resource-card" href="#estudar"><span className="resource-icon"><Icon name={icon} /></span><span className="resource-copy"><small>{eyebrow}</small><strong>{title}</strong><span>{detail}</span></span>{badge && <b className="resource-badge">{badge}</b>}<Icon name="chevron" size={18} /></a>;
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [activeNav, setActiveNav] = useState("Hoje");

  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav aria-label="Navegação principal">
          {navItems.map((item) => <a className={activeNav === item.label ? "nav-link active" : "nav-link"} href={item.href} key={item.label} onClick={() => setActiveNav(item.label)}><Icon name={item.icon} /><span>{item.label}</span>{item.label === "Lei seca" && <b className="notification-dot">10</b>}</a>)}
        </nav>
        <div className="sidebar-footer"><div className="streak-mini"><span><Icon name="flame" size={18} /></span><div><strong>7 dias</strong><small>sequência atual</small></div></div><a className="nav-link" href="#ajustes"><Icon name="settings" /><span>Ajustes</span></a></div>
      </aside>
      <main>
        <header className="topbar">
          <div className="mobile-logo"><Logo /></div><div className="sync-state"><Icon name="cloud" size={17} /> sincronizado na sua conta</div>
          <div className="top-actions">
            {searchOpen && <label className="search-field"><span className="sr-only">Buscar no Review DPE</span><input autoFocus placeholder="Buscar no Review DPE" type="search" /></label>}
            <AppButton className="icon-button" onClick={() => setSearchOpen((current) => !current)}><span className="sr-only">Buscar</span><Icon name="search" size={20} /></AppButton>
            <AppButton className="icon-button" onClick={() => setDark((current) => !current)}><span className="sr-only">Alternar tema</span><Icon name={dark ? "sun" : "moon"} size={20} /></AppButton>
            <AppButton className="profile-button"><span>MA</span><span className="profile-copy"><strong>Marina Alves</strong><small>Plano ativo</small></span><Icon name="chevron" size={16} /></AppButton>
          </div>
        </header>
        <div className="page" id="hoje">
          <section className="welcome"><div><span className="eyebrow">Boa tarde, Marina</span><h1>O próximo passo da sua aprovação começa agora.</h1><p>Seu plano de hoje está pronto. Uma sessão curta já mantém seu ritmo e protege o que você aprendeu.</p></div><div className="date-chip"><span>HOJE</span><strong>18</strong><small>OUT</small></div></section>
          <section className="dashboard-grid">
            <article className="focus-card">
              <div className="focus-topline"><span className="pill pill-light"><Icon name="spark" size={16} /> Revisão de hoje</span><span className="streak-pill"><Icon name="flame" size={17} /> 7 dias</span></div>
              {sessionStarted ? (
                <div className="session-ready"><span className="session-check"><Icon name="check" size={32} /></span><span className="eyebrow">Sessão preparada</span><h2>Seu primeiro cartão está pronto.</h2><p>Você pode começar pelos cartões novos e seguir para as revisões vencidas.</p><div className="session-actions"><AppButton className="button-primary">Abrir primeiro cartão <Icon name="arrow" size={18} /></AppButton><AppButton className="button-quiet" onClick={() => setSessionStarted(false)}>Voltar ao resumo</AppButton></div></div>
              ) : (
                <><div className="focus-main"><div className="level-orbit" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="level-core"><Icon name="flame" size={34} /></span><b>1</b></div><div className="focus-copy"><span className="eyebrow">Seu plano personalizado</span><h2>Vamos estudar?</h2><p><strong>1 cartão</strong> para hoje <span>•</span> cerca de 1 min</p></div></div><div className="level-progress"><div><strong>Ovo de Fênix · nível 1</strong><span>0/100 XP</span></div><ProgressBar value={8} warm /><div className="goal-copy"><span>Meta de hoje</span><strong>0%</strong></div><ProgressBar value={0} /></div><blockquote>“Constância vence intensidade: 30 minutos hoje valem mais que 5 horas no domingo.”</blockquote><AppButton className="button-primary button-large" onClick={() => setSessionStarted(true)}>Começar sessão <Icon name="arrow" size={19} /></AppButton><p className="reassurance"><Icon name="clock" size={15} /> Leva cerca de 1 minuto</p></>
              )}
            </article>
            <aside className="right-column">
              <article className="missions-card"><div className="section-heading"><div><span className="eyebrow">Ritmo diário</span><h2>Missões de hoje</h2></div><span className="counter">0/3 <small>+20 XP cada</small></span></div><div className="missions-list"><Mission icon="target" title="Acerte 20 cartões" detail="Treine sua memória" current={0} total={20} /><Mission icon="layers" title="Estude 3 disciplinas" detail="Amplie seu repertório" current={0} total={3} /><Mission icon="flame" title="Feche a meta do dia" detail="Mantenha sua sequência" current={0} total={1} /></div></article>
              <article className="week-card" id="progresso"><div className="section-heading compact"><div><span className="eyebrow">Sua semana</span><h2>6 de 7 dias</h2></div><span className="success-copy">Em boa sequência</span></div><div className="week-days">{["S", "T", "Q", "Q", "S", "S", "D"].map((day, index) => <div className={index === 3 ? "day rest" : index === 6 ? "day today" : "day done"} key={`${day}-${index}`}><span>{index === 3 ? "—" : <Icon name="check" size={15} />}</span><small>{day}</small></div>)}</div></article>
            </aside>
          </section>
          <section className="learning-section" id="estudar"><div className="section-title-row"><div><span className="eyebrow">Continue avançando</span><h2>Seu estudo, organizado</h2><p>Leia, treine e revise os pontos mais importantes para a Defensoria.</p></div><a className="text-link" href="#biblioteca">Ver biblioteca <Icon name="arrow" size={17} /></a></div><div className="resource-grid" id="biblioteca"><ResourceCard icon="scale" eyebrow="Ler e aprender" title="Lei seca" detail="Os artigos que mais caem, com questões de prova" badge="10 novas" /><ResourceCard icon="book" eyebrow="Atualizado" title="Novidades legislativas" detail="Leis, súmulas e teses recentes" badge="8 leis" /><ResourceCard icon="library" eyebrow="Aprofundamento" title="Biblioteca" detail="Doutrina, quadros, glossário e seus cartões" /></div></section>
          <section className="legal-highlight" id="lei-seca"><div className="legal-icon"><Icon name="scale" size={28} /></div><div><span className="eyebrow">Novidade legislativa</span><h2>Lei 15.512/2026</h2><p>ECA Ambiental: direito da criança e do adolescente à natureza.</p></div><a className="button button-secondary" href="#lei-seca">Ler atualização <Icon name="arrow" size={18} /></a></section>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegação principal mobile">{navItems.map((item) => <a className={activeNav === item.label ? "active" : ""} href={item.href} key={item.label} onClick={() => setActiveNav(item.label)}><span><Icon name={item.icon} size={21} />{item.label === "Lei seca" && <b>10</b>}</span><small>{item.label}</small></a>)}</nav>
    </div>
  );
}
