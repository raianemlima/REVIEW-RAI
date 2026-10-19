import { useState, type CSSProperties } from "react";
import Icon, { type IconName } from "./Icon";

export type Confidence = "guess" | "think" | "sure";
export type StudyCard = { id: string; discipline: string; question: string; answer: string; source: string };
export type CardResult = { card: StudyCard; confidence: Confidence; correct: boolean };
export type Verdict = "illusion" | "gap" | "shaky" | "mastered";

const confidenceOptions: { id: Confidence; label: string; hint: string }[] = [
  { id: "guess", label: "Chutei", hint: "Não sei de verdade" },
  { id: "think", label: "Acho que sei", hint: "Tenho uma ideia" },
  { id: "sure", label: "Tenho certeza", hint: "Explicaria sem olhar" },
];

export const verdicts: Record<Verdict, { label: string; detail: string; review: string; icon: IconName }> = {
  illusion: { label: "Ilusão de conhecimento", detail: "Você tinha certeza, mas errou. Esse é o erro mais perigoso na prova, por isso o item volta com prioridade.", review: "Revisão prioritária amanhã", icon: "alert" },
  gap: { label: "Lacuna consciente", detail: "Você percebeu que não sabia. Esse alerta é bom: agora você sabe exatamente o que revisar.", review: "Revisar amanhã", icon: "eye" },
  shaky: { label: "Acerto inseguro", detail: "Acertou, mas sem convicção. Ainda não está dominado, e numa prova poderia virar erro.", review: "Revisar em 2 dias", icon: "refresh" },
  mastered: { label: "Dominado", detail: "Confiança e resposta caminharam juntas. Você realmente sabe isso.", review: "Revisar em 7 dias", icon: "check" },
};

export function verdictOf(result: Pick<CardResult, "confidence" | "correct">): Verdict {
  if (result.correct) return result.confidence === "sure" ? "mastered" : "shaky";
  return result.confidence === "sure" ? "illusion" : "gap";
}

const goalSuggestions = ["Fixar a base institucional da Defensoria", "Testar o que eu acho que já sei", "Revisar os pontos em que errei"];
const phases = ["Antes", "Durante", "Depois"];

type Props = {
  cards: StudyCard[];
  onRate: (result: CardResult) => void;
  onReflect: (reflection: { worked: string; change: string }) => void;
  onExit: () => void;
};

function Stepper({ current }: { current: number }) {
  return (
    <ol className="study-stepper" aria-label="Fases da sessão">
      {phases.map((phase, index) => (
        <li className={index === current ? "current" : index < current ? "done" : ""} key={phase}>
          <span>{index < current ? <Icon name="check" size={12} /> : index + 1}</span>{phase}
        </li>
      ))}
    </ol>
  );
}

export default function StudySession({ cards, onRate, onReflect, onExit }: Props) {
  const [phase, setPhase] = useState<"plan" | "card" | "summary" | "done">("plan");
  const [goal, setGoal] = useState("");
  const [index, setIndex] = useState(0);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<CardResult[]>([]);
  const [worked, setWorked] = useState("");
  const [change, setChange] = useState("");
  const [reflected, setReflected] = useState(false);

  const card = cards[index];

  function grade(isCorrect: boolean) {
    if (!confidence || correct !== null) return;
    const result = { card, confidence, correct: isCorrect };
    setCorrect(isCorrect);
    setResults((current) => [...current, result]);
    onRate(result);
  }

  function next() {
    if (index + 1 >= cards.length) {
      setPhase("summary");
      return;
    }
    setIndex(index + 1);
    setConfidence(null);
    setCorrect(null);
  }

  function finish(withReflection: boolean) {
    if (withReflection) {
      onReflect({ worked: worked.trim(), change: change.trim() });
      setReflected(true);
    }
    setPhase("done");
  }

  if (phase === "plan") {
    return (
      <div className="study">
        <Stepper current={0} />
        <span className="eyebrow">Antes · Planejar</span>
        <h2 className="study-title">O que você quer dominar nos próximos minutos?</h2>
        <p className="study-lead">Um objetivo claro tira você do piloto automático: você deixa de só passar pelos cartões e passa a dirigir o próprio estudo.</p>
        <div className="goal-chips">
          {goalSuggestions.map((suggestion) => (
            <button className={goal === suggestion ? "chip selected" : "chip"} key={suggestion} onClick={() => setGoal(suggestion)} type="button">{suggestion}</button>
          ))}
        </div>
        <label className="study-field">
          <span>Ou escreva com suas palavras</span>
          <input onChange={(event) => setGoal(event.target.value)} placeholder="Ex.: entender prazos e prerrogativas do defensor" value={goal} />
        </label>
        <ul className="how-it-works">
          <li><Icon name="pencil" size={17} /><span><strong>Responda mentalmente</strong> antes de ver a resposta.</span></li>
          <li><Icon name="eye" size={17} /><span><strong>Diga sua confiança</strong>: chute, acho que sei ou certeza.</span></li>
          <li><Icon name="refresh" size={17} /><span><strong>Avalie no final</strong> o que funcionou e o que muda amanhã.</span></li>
        </ul>
        <div className="study-actions">
          <button className="button button-primary" disabled={!goal.trim()} onClick={() => setPhase("card")} type="button">Começar com esse objetivo <Icon name="arrow" size={18} /></button>
          <button className="button button-quiet" onClick={onExit} type="button">Voltar ao resumo</button>
        </div>
      </div>
    );
  }

  if (phase === "card") {
    const verdict = correct !== null && confidence ? verdicts[verdictOf({ confidence, correct })] : null;
    const verdictKey = correct !== null && confidence ? verdictOf({ confidence, correct }) : null;
    return (
      <div className="study">
        <Stepper current={1} />
        <div className="study-meta">
          <span className="eyebrow">Durante · Monitorar</span>
          <span>Cartão {index + 1} de {cards.length}</span>
        </div>
        <div className="progress-track study-progress"><span style={{ width: `${((index + (correct !== null ? 1 : 0)) / cards.length) * 100}%` }} /></div>
        <p className="study-goal"><Icon name="target" size={15} /> {goal}</p>

        <article className="flashcard">
          <span className="pill pill-light">{card.discipline}</span>
          <h2>{card.question}</h2>
          {confidence ? (
            <div className="answer">
              <span className="eyebrow">Resposta</span>
              <p>{card.answer}</p>
              <small>{card.source}</small>
            </div>
          ) : (
            <p className="flashcard-hint">Responda mentalmente, sem olhar. Depois, diga com sinceridade quanto você confia na sua resposta.</p>
          )}
        </article>

        {!confidence && (
          <div className="study-block">
            <strong className="study-question">Qual sua confiança?</strong>
            <div className="confidence-options">
              {confidenceOptions.map((option) => (
                <button className={`confidence ${option.id}`} key={option.id} onClick={() => setConfidence(option.id)} type="button">
                  <strong>{option.label}</strong><small>{option.hint}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {confidence && correct === null && (
          <div className="study-block">
            <strong className="study-question">Comparando com a resposta, você acertou?</strong>
            <div className="grade-options">
              <button className="grade right" onClick={() => grade(true)} type="button"><Icon name="check" size={18} /> Acertei</button>
              <button className="grade wrong" onClick={() => grade(false)} type="button"><Icon name="refresh" size={18} /> Errei ou fiquei incompleto</button>
            </div>
          </div>
        )}

        {verdict && verdictKey && (
          <div className={`verdict ${verdictKey}`} role="status">
            <span className="verdict-icon"><Icon name={verdict.icon} size={20} /></span>
            <div><strong>{verdict.label}</strong><p>{verdict.detail}</p><small><Icon name="clock" size={13} /> {verdict.review}</small></div>
            <button className="button button-primary" onClick={next} type="button">{index + 1 >= cards.length ? "Avaliar sessão" : "Próximo cartão"} <Icon name="arrow" size={17} /></button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "summary") {
    const counts = { illusion: 0, gap: 0, shaky: 0, mastered: 0 } as Record<Verdict, number>;
    results.forEach((result) => { counts[verdictOf(result)] += 1; });
    const hits = results.filter((result) => result.correct).length;
    const calibration = results.length ? Math.round(((counts.mastered + counts.gap) / results.length) * 100) : 0;
    const priority = results.filter((result) => verdictOf(result) === "illusion");
    return (
      <div className="study">
        <Stepper current={2} />
        <span className="eyebrow">Depois · Avaliar</span>
        <h2 className="study-title">Você sabia mesmo, ou só reconheceu?</h2>
        <div className="calibration">
          <div className="calibration-ring" style={{ "--value": `${calibration * 3.6}deg` } as CSSProperties}><span>{calibration}%</span></div>
          <div>
            <strong>Calibração da sua confiança</strong>
            <p>Mostra quantas vezes a sua confiança bateu com o resultado. Você acertou {hits} de {results.length} cartões.</p>
          </div>
        </div>
        <div className="verdict-grid">
          {(Object.keys(verdicts) as Verdict[]).map((key) => (
            <div className={`verdict-tile ${key}`} key={key}><Icon name={verdicts[key].icon} size={17} /><strong>{counts[key]}</strong><span>{verdicts[key].label}</span></div>
          ))}
        </div>
        {priority.length > 0 && (
          <div className="priority-list">
            <strong><Icon name="alert" size={16} /> Revisão prioritária amanhã</strong>
            <ul>{priority.map((result) => <li key={result.card.id}>{result.card.question}</li>)}</ul>
          </div>
        )}
        <div className="reflection">
          <label className="study-field"><span>O que funcionou hoje?</span><textarea onChange={(event) => setWorked(event.target.value)} placeholder="Ex.: responder antes de olhar me fez perceber o que eu não sabia" rows={2} value={worked} /></label>
          <label className="study-field"><span>O que você vai mudar amanhã?</span><textarea onChange={(event) => setChange(event.target.value)} placeholder="Ex.: reler o art. 134 e explicar em voz alta" rows={2} value={change} /></label>
        </div>
        <div className="study-actions">
          <button className="button button-primary" disabled={!worked.trim() && !change.trim()} onClick={() => finish(true)} type="button">Salvar reflexão e concluir <Icon name="arrow" size={18} /></button>
          <button className="button button-quiet" onClick={() => finish(false)} type="button">Concluir sem refletir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="session-ready">
      <span className="session-check"><Icon name="check" size={32} /></span>
      <span className="eyebrow">Sessão concluída</span>
      <h2>Você estudou como quem dirige, não como passageiro.</h2>
      <p>{reflected ? "Sua reflexão foi salva. Amanhã, comece pelos itens em que a sua confiança falhou." : "Da próxima vez, tire 1 minuto para refletir: é aí que o aprendizado se consolida."}</p>
      <div className="session-actions">
        <button className="button button-primary" onClick={onExit} type="button">Voltar ao painel <Icon name="arrow" size={18} /></button>
      </div>
    </div>
  );
}
