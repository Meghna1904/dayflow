import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, CirclePlus, CloudSun, Droplets, Flower2,
  CalendarDays, Clock3, Menu, Moon, Settings2, Sparkles, Sun, Sunrise, Sunset, X,
} from "lucide-react";

type PhaseId = "morning" | "afternoon" | "sunset" | "night";
type Phase = { id: PhaseId; label: string; eyebrow: string; greeting: string; icon: typeof Sun };
type PhaseSettings = Record<PhaseId, { start: string; end: string; habits: string[]; archivedHabits?: string[] }>;
type Account = { name: string; passcode: string; settings: PhaseSettings };
type Activity = { id: string; text: string; phase: PhaseId; completedAt: string; addedLater: boolean };

const phaseInfo: Phase[] = [
  { id: "morning", label: "Morning", eyebrow: "A fresh start", greeting: "Good morning", icon: Sunrise },
  { id: "afternoon", label: "Afternoon", eyebrow: "Keep your rhythm", greeting: "Good afternoon", icon: Sun },
  { id: "sunset", label: "Evening", eyebrow: "A softer pace", greeting: "Good evening", icon: Sunset },
  { id: "night", label: "Night", eyebrow: "Time to unwind", greeting: "Good night", icon: Moon },
];

const defaults: PhaseSettings = {
  morning: { start: "06:30", end: "11:30", habits: ["Brush teeth", "Drink water", "Cold shower", "Breakfast", "Read 10 pages"] },
  afternoon: { start: "11:30", end: "15:30", habits: ["Lunch", "20 min walk", "Study", "Drink water"] },
  sunset: { start: "15:30", end: "19:00", habits: ["Exercise", "Shower", "Study", "Make time for a hobby"] },
  night: { start: "19:00", end: "06:30", habits: ["Dinner", "Skincare", "Journal", "Read", "Prepare for tomorrow"] },
};

const storageKey = "dayflow-account";
const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKeyFor = (date: Date) => date.toISOString().slice(0, 10);
const activitiesKey = () => `dayflow-activities-${todayKey()}`;
const waterKey = () => `dayflow-water-${todayKey()}`;
const poopKey = () => `dayflow-poop-${todayKey()}`;
const poopDetailKey = () => `dayflow-poop-detail-${todayKey()}`;
const screenKey = () => `dayflow-screen-${todayKey()}`;
const activeHabits = (settings: PhaseSettings, phase: PhaseId) => settings[phase].habits.filter((habit) => !settings[phase].archivedHabits?.includes(habit));
const allHabits = (settings: PhaseSettings, phase: PhaseId) => [...settings[phase].habits, ...(settings[phase].archivedHabits || [])].filter((habit, index, list) => list.indexOf(habit) === index);
type ScreenBreakdown = Record<string, number>;
type PoopLog = { mood: string; note: string; time: string };
const uniqueActivities = (items: Activity[]) => items.filter((activity, index, list) => list.findIndex((candidate) => candidate.phase === activity.phase && candidate.text.trim().toLowerCase() === activity.text.trim().toLowerCase()) === index);
const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
const formatTime = (value: string) => new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDateTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function getCurrentPhase(settings: PhaseSettings, now = new Date()): PhaseId {
  const current = now.getHours() * 60 + now.getMinutes();
  const ordered = phaseInfo;
  for (const item of ordered) {
    const range = settings[item.id];
    const start = toMinutes(range.start);
    const end = toMinutes(range.end);
    if (start < end ? current >= start && current < end : current >= start || current < end) return item.id;
  }
  return "morning";
}

function Join({ onJoin }: { onJoin: (account: Account) => void }) {
  const [mode, setMode] = useState<"join" | "login">("join");
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const saved = localStorage.getItem(storageKey);
    if (mode === "login" && saved) {
      const account = JSON.parse(saved) as Account;
      if (account.passcode !== passcode) { setError("That code doesn’t match this Dayflow."); return; }
      onJoin(account); return;
    }
    if (!name.trim() || passcode.trim().length < 4) { setError("Add your name and a passcode with 4+ characters."); return; }
    onJoin({ name: name.trim(), passcode, settings: defaults });
  };
  return <main className="app phase-morning join-screen"><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-one"><CloudSun size={56} /></div><div className="cloud cloud-two"><CloudSun size={42} /></div></div>
    <div className="join-wrap"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><div className="join-card">
      <p className="kicker"><span className="pulse" /> {mode === "join" ? "A calmer way to track your day" : "Welcome back to your day"}</p>
      <h1>{mode === "join" ? <>Make space for your <em>day.</em></> : <>Pick up where you <em>left off.</em></>}</h1>
      <p className="join-copy">{mode === "join" ? "Dayflow only shows what belongs to this moment. Start with a personal code, then shape it around your real routine." : "Your routine is waiting, exactly as you left it."}</p>
      <form onSubmit={submit}><label>{mode === "join" ? "What should we call you?" : "Your name"}<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label><label>Personal passcode<input value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="At least 4 characters" type="password" autoComplete={mode === "join" ? "new-password" : "current-password"} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" type="submit">{mode === "join" ? "Create my Dayflow" : "Open my Dayflow"} <ArrowUpRight size={17} /></button></form>
      <button className="switch-button" onClick={() => { setMode(mode === "join" ? "login" : "join"); setError(""); }}>{mode === "join" ? "Already have a Dayflow? Log in" : "New here? Create your Dayflow"}</button>
    </div><p className="join-note">Your day is personal. Your routine stays on this device.</p></div></main>;
}

function Onboarding({ account, onComplete }: { account: Account; onComplete: (account: Account) => void }) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<PhaseSettings>(structuredClone(defaults));
  const [activePhase, setActivePhase] = useState<PhaseId>("morning");
  const current = settings[activePhase];
  const update = (key: "start" | "end", value: string) => setSettings((old) => ({ ...old, [activePhase]: { ...old[activePhase], [key]: value } }));
  const updateHabits = (value: string) => setSettings((old) => ({ ...old, [activePhase]: { ...old[activePhase], habits: value.split("\n").map((item) => item.trim()).filter(Boolean) } }));
  const finish = () => onComplete({ ...account, settings });
  return <main className="app phase-morning onboarding"><div className="onboarding-wrap"><div className="onboarding-head"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><span className="step-count">{step + 1} / 3</span></div><div className="onboarding-card">
    {step === 0 && <><p className="section-label">A little context</p><h1>When does your day <em>change?</em></h1><p className="join-copy">Rough times are perfect. These are just the moments Dayflow uses to bring the right things forward.</p><div className="phase-editor">{phaseInfo.map((item) => <div className="time-row" key={item.id}><span className="phase-name"><item.icon size={17} />{item.label}</span><input type="time" value={settings[item.id].start} onChange={(event) => setSettings((old) => ({ ...old, [item.id]: { ...old[item.id], start: event.target.value } }))} /><span>to</span><input type="time" value={settings[item.id].end} onChange={(event) => setSettings((old) => ({ ...old, [item.id]: { ...old[item.id], end: event.target.value } }))} /></div>)}</div></>}
    {step === 1 && <><p className="section-label">Your everyday rhythm</p><h1>What belongs in each <em>part?</em></h1><p className="join-copy">One habit per line. You can always change these later — this is a starting point, not a promise.</p><div className="phase-tabs">{phaseInfo.map((item) => <button className={activePhase === item.id ? "selected" : ""} onClick={() => setActivePhase(item.id)} key={item.id}><item.icon size={15} />{item.label}</button>)}</div><textarea className="habit-editor" value={current.habits.join("\n")} onChange={(event) => updateHabits(event.target.value)} /></>}
    {step === 2 && <><p className="section-label">You’re all set, {account.name}</p><h1>Your day, in <em>motion.</em></h1><p className="join-copy">Dayflow will gently bring each part of your routine forward as your day moves. Nothing is lost when a moment passes.</p><div className="setup-preview">{phaseInfo.map((item) => <div key={item.id}><span><item.icon size={16} />{item.label}</span><small>{settings[item.id].habits.length} habits · {formatTime(settings[item.id].start)} start</small></div>)}</div></>}
    <button className="primary-button onboarding-next" onClick={() => step < 2 ? setStep(step + 1) : finish()}>{step < 2 ? "Continue" : "Enter my day"} <ArrowUpRight size={17} /></button>
  </div></div></main>;
}

function AddSomething({ phase, onClose, onHabit, onActivity }: { phase: PhaseId; onClose: () => void; onHabit: (phase: PhaseId, text: string) => void; onActivity: (activity: Activity) => void }) {
  const [kind, setKind] = useState<"habit" | "activity">("habit");
  const [text, setText] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<PhaseId>(phase);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (kind === "habit") onHabit(selectedPhase, text.trim());
    else onActivity({ id: crypto.randomUUID(), text: text.trim(), phase: selectedPhase, completedAt: `${todayKey()}T${time}:00`, addedLater: true });
    onClose();
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="entry-modal" onSubmit={submit}>
    <div className="modal-head"><div><p className="section-label">Make a note of it</p><h2>{kind === "habit" ? "Add a habit" : "Add something I did"}</h2></div><button type="button" className="modal-close" onClick={onClose}><X size={18} /></button></div>
    <div className="entry-switch"><button type="button" className={kind === "habit" ? "selected" : ""} onClick={() => setKind("habit")}>Plan a habit</button><button type="button" className={kind === "activity" ? "selected" : ""} onClick={() => setKind("activity")}>Log it later</button></div>
    <label className="modal-label">{kind === "habit" ? "What belongs in your routine?" : "What did you do?"}<input autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={kind === "habit" ? "e.g. Cold shower" : "e.g. Went for a 30 min walk"} /></label>
    <label className="modal-label">When does it belong?<select value={selectedPhase} onChange={(event) => setSelectedPhase(event.target.value as PhaseId)}>{phaseInfo.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
    {kind === "activity" && <label className="modal-label">What time did you do it?<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>}
    <button className="primary-button" type="submit">{kind === "habit" ? "Add to my routine" : "Add to my day"} <ArrowUpRight size={17} /></button>
  </form></div>;
}

function DayReview({ account, completed, activities, water, poop, screen, onClose, onCompleteLater, onToggleHabit, onAdd, readOnly = false, dateLabel }: { account: Account; completed: string[]; activities: Activity[]; water: number; poop: number; screen: number; onClose: () => void; onCompleteLater: (phase: PhaseId, habit: string) => void; onToggleHabit: (phase: PhaseId, habit: string) => void; onAdd: () => void; readOnly?: boolean; dateLabel?: string }) {
  const totalDone = phaseInfo.reduce((sum, item) => sum + allHabits(account.settings, item.id).filter((habit) => completed.includes(`${item.id}:${habit}`)).length, 0) + activities.length;
  const totalHabits = phaseInfo.reduce((sum, item) => sum + activeHabits(account.settings, item.id).length, 0);
  const score = Math.min(100, Math.round((totalDone / Math.max(totalHabits, 1)) * 70 + Math.min(water / 8, 1) * 20 + (poop ? 5 : 0) + (screen > 0 ? 5 : 0)));
  const goofy = score >= 85 ? "Your day was a tiny parade of competence. The moon has filed a very positive report." : score >= 60 ? "A respectable little day: some sparkle, some wobble, and absolutely no need to pretend the wobble was not there." : "Today was more of a cozy loading screen. You still logged in, and honestly, that counts as plot development.";
  const weather = totalDone >= 8 ? { icon: "☀️", label: "Golden-hour brain", detail: `You logged ${totalDone} things today.` } : totalDone >= 3 ? { icon: "🌤️", label: "Partly sparkly", detail: `You logged ${totalDone} things today.` } : { icon: "🌙", label: "Cozy moon mode", detail: totalDone ? `You logged ${totalDone} thing${totalDone === 1 ? "" : "s"} today.` : "A quiet day still deserves a soft landing." };
  const [geminiSummary, setGeminiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const getGeminiSummary = async () => {
    setSummaryLoading(true);
    try {
      const result = await fetch("/api/day-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, score, completed: totalDone, addedLater: activities.length, water, bathroom: poop, screenMinutes: screen }) });
      const data = await result.json() as { summary?: string };
      if (!result.ok || !data.summary) throw new Error("Summary unavailable");
      setGeminiSummary(data.summary);
    } catch {
      setGeminiSummary("The tiny summary machine is napping, so here’s the human version: you made it through another day, and that is worthy of a small celebratory wiggle.");
    } finally {
      setSummaryLoading(false);
    }
  };
  return <main className={`app phase-night review-screen ${readOnly ? "review-history" : ""}`}><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="stars">✦　·　✧　　·　✦　　·</div></div><header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><button className="review-close" onClick={onClose}>Back to calendar <X size={16} /></button></header>
    <section className="review-wrap"><p className="kicker"><span className="pulse" /> {readOnly ? "A day worth remembering" : "A gentle look back"}</p><h1>{dateLabel || "Your day is"} <em>{dateLabel ? "" : "ending."}</em></h1><p className="join-copy">You showed up in ways that count, {account.name}.</p><div className="day-weather"><span>{weather.icon}</span><div><strong>{weather.label}</strong><small>{weather.detail}</small></div></div><div className="day-rating"><span>{readOnly ? "That day’s goofy rating" : "Today’s goofy rating"}</span><strong>{score}/100</strong></div><p className="goofy-summary">{geminiSummary || goofy}</p>{!readOnly && <button className="summary-button" onClick={getGeminiSummary} disabled={summaryLoading}>{summaryLoading ? "Asking the tiny Gemini..." : "✨ Make my goofy summary"} </button>}<div className="review-stats"><strong>{totalDone} things completed</strong><span>{activities.length} added later · {water} glasses · {poop} bathroom visit{poop === 1 ? "" : "s"} · {screen} screen minutes</span></div>
      <div className="review-periods">{phaseInfo.map((item) => { const planned = allHabits(account.settings, item.id); const done = planned.filter((habit) => completed.includes(`${item.id}:${habit}`)); const late = activities.filter((activity, index, list) => activity.phase === item.id && list.findIndex((candidate) => candidate.phase === item.id && candidate.text.trim().toLowerCase() === activity.text.trim().toLowerCase()) === index); const PhaseIcon = item.icon; return <section className="review-period" key={item.id}><div className="review-period-head"><h2><PhaseIcon size={18} />{item.label}</h2><span>{done.length}/{planned.length}</span></div><div className="review-items">{planned.map((habit) => { const isDone = completed.includes(`${item.id}:${habit}`); return <button className={`review-item ${isDone ? "done" : ""}`} disabled={readOnly} key={habit} onClick={() => isDone ? onToggleHabit(item.id, habit) : onCompleteLater(item.id, habit)}><span className="check-box">{isDone && <Check size={13} strokeWidth={3} />}</span>{habit}<small>{readOnly ? "" : isDone ? "tap to undo" : "tap to log later"}</small></button>; })}{late.map((activity) => <div className="review-item done late-item" key={`${activity.phase}-${activity.text}`}><span className="check-box"><Check size={13} strokeWidth={3} /></span>{activity.text}<small>↳ completed later at {formatDateTime(activity.completedAt)}</small></div>)}</div></section>; })}</div>
      {!readOnly && <button className="add-line review-add" onClick={onAdd}><CirclePlus size={18} /> Add something I did</button>}<button className="primary-button close-day" onClick={onClose}><Sparkles size={17} /> {readOnly ? "Back to calendar" : "Close my day"}</button>
    </section></main>;
}

function TimelinePage({ account, completed, activities, water, poop, screen, onBack }: { account: Account; completed: string[]; activities: Activity[]; water: number; poop: number; screen: number; onBack: () => void }) {
  const events = phaseInfo.flatMap((item) => account.settings[item.id].habits.filter((habit) => completed.includes(`${item.id}:${habit}`)).map((habit) => ({ time: account.settings[item.id].start, label: habit, phase: item.id, later: false }))).concat(activities.map((item) => ({ time: item.completedAt, label: item.text, phase: item.phase, later: true }))).sort((a, b) => a.time.localeCompare(b.time));
  return <main className="app phase-afternoon subpage"><header className="topbar"><button className="back-link" onClick={onBack}>← Today</button><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><Clock3 size={18} /></header><section className="subpage-wrap"><p className="kicker"><span className="pulse" /> Everything that happened</p><h1>Your day, <em>in order.</em></h1><p className="tracker-copy">A gentle record of the things you noticed, did, and added later.</p><div className="timeline-list">{events.length ? events.map((event, index) => <div className="timeline-event" key={`${event.label}-${index}`}><span className={`timeline-dot phase-dot-${event.phase}`} /><time>{event.time.includes("T") ? formatDateTime(event.time) : formatTime(event.time)}</time><div><strong>{event.label}</strong><small>{event.later ? "added later" : phaseInfo.find((item) => item.id === event.phase)?.label}</small></div></div>) : <p className="empty-habits">Your timeline will fill up as your day happens.</p>}</div><div className="small-facts"><span>💧 {water} glasses</span><span>🚽 {poop} visits</span><span>📱 {screen} min screen time</span></div></section></main>;
}

function CalendarPage({ account, currentCompleted, onBack }: { account: Account; currentCompleted: string[]; onBack: () => void }) {
  const date = new Date(); const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const snapshot = selectedDate ? {
    completed: JSON.parse(localStorage.getItem(`dayflow-done-${selectedDate}`) || "[]") as string[],
    activities: JSON.parse(localStorage.getItem(`dayflow-activities-${selectedDate}`) || "[]") as Activity[],
    water: Number(localStorage.getItem(`dayflow-water-${selectedDate}`) || 0),
    poop: Number(localStorage.getItem(`dayflow-poop-${selectedDate}`) || 0),
    screen: Object.values(JSON.parse(localStorage.getItem(`dayflow-screen-${selectedDate}`) || "{}") as ScreenBreakdown).reduce((sum, value) => sum + value, 0),
  } : null;
  const today = dateKeyFor(date);
  const hasStoredData = (key: string) => Boolean(localStorage.getItem(`dayflow-done-${key}`) || localStorage.getItem(`dayflow-activities-${key}`) || localStorage.getItem(`dayflow-water-${key}`) || localStorage.getItem(`dayflow-poop-${key}`) || localStorage.getItem(`dayflow-screen-${key}`));
  const selectedLabel = selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "";
  return <main className="app phase-morning subpage"><header className="topbar"><button className="back-link" onClick={onBack}>← Today</button><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><CalendarDays size={18} /></header><section className="subpage-wrap"><p className="kicker"><span className="pulse" /> Your month at a glance</p><h1>{date.toLocaleDateString([], { month: "long" })} <em>{date.getFullYear()}</em></h1><p className="tracker-copy">No scores. Just small signs that a day was lived.</p><div className="calendar-card"><div className="calendar-week">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: first }).map((_, index) => <span className="calendar-empty" key={`empty-${index}`} />)}{Array.from({ length: days }).map((_, index) => { const day = index + 1; const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const isToday = key === today; const dayCompleted = isToday ? currentCompleted : JSON.parse(localStorage.getItem(`dayflow-done-${key}`) || "[]") as string[]; const used = isToday || hasStoredData(key); return <button className={`calendar-day ${isToday ? "today" : ""} ${selectedDate === key ? "selected" : ""}`} onClick={() => setSelectedDate(key)} key={day}><strong>{day}</strong>{used && <span className="calendar-mark">{dayCompleted.length || "·"}</span>}</button>; })}</div></div><div className="calendar-note"><Sparkles size={18} /><span><strong>{selectedDate ? `${snapshot?.completed.length || 0} things` : `${currentCompleted.length} things`}</strong> {selectedDate ? `recorded on ${selectedLabel}.` : "recorded today. Select a day to revisit it."}</span></div>{snapshot && <div className="history-modal"><DayReview account={account} completed={snapshot.completed} activities={snapshot.activities} water={snapshot.water} poop={snapshot.poop} screen={snapshot.screen} readOnly dateLabel={selectedLabel} onClose={() => setSelectedDate(null)} onCompleteLater={() => undefined} onToggleHabit={() => undefined} onAdd={() => undefined} /></div>}</section></main>;
}

function SettingsPage({ account, onSave, onBack }: { account: Account; onSave: (account: Account) => void; onBack: () => void }) {
  const [name, setName] = useState(account.name); const [settings, setSettings] = useState(account.settings);
  const removeHabit = (phase: PhaseId, habit: string) => setSettings((old) => ({ ...old, [phase]: { ...old[phase], archivedHabits: [...(old[phase].archivedHabits || []), habit] } }));
  const moveHabit = (phase: PhaseId, habit: string, target: PhaseId) => setSettings((old) => {
    if (phase === target) return old;
    const source = old[phase].habits.filter((item) => item !== habit);
    const destination = [...old[target].habits.filter((item) => item !== habit), habit];
    return { ...old, [phase]: { ...old[phase], habits: source }, [target]: { ...old[target], habits: destination, archivedHabits: (old[target].archivedHabits || []).filter((item) => item !== habit) } };
  });
  return <main className="app phase-morning subpage"><header className="topbar"><button className="back-link" onClick={onBack}>← Today</button><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><Settings2 size={18} /></header><section className="subpage-wrap settings-wrap"><p className="kicker"><span className="pulse" /> Your Dayflow</p><h1>Edit your <em>routine.</em></h1><p className="settings-intro">Change when a habit appears, move it to another part of your day, or archive it from future routines. Archived habits stay in your history.</p><label className="settings-label">Your name<input value={name} onChange={(event) => setName(event.target.value)} /></label><p className="section-label settings-caption">Day phases</p><div className="settings-phases">{phaseInfo.map((item) => <div className="settings-phase" key={item.id}><span><item.icon size={16} />{item.label}</span><input type="time" value={settings[item.id].start} onChange={(event) => setSettings((old) => ({ ...old, [item.id]: { ...old[item.id], start: event.target.value } }))} /><input type="time" value={settings[item.id].end} onChange={(event) => setSettings((old) => ({ ...old, [item.id]: { ...old[item.id], end: event.target.value } }))}/><div className="settings-habits">{activeHabits(settings, item.id).map((habit) => <div className="settings-habit" key={habit}><span className="settings-habit-name">{habit}</span><span className="settings-habit-actions"><select value={item.id} onChange={(event) => moveHabit(item.id, habit, event.target.value as PhaseId)} aria-label={`Move ${habit}`}><option value={item.id}>Move to...</option>{phaseInfo.filter((target) => target.id !== item.id).map((target) => <option value={target.id} key={target.id}>{target.label}</option>)}</select><button type="button" onClick={() => removeHabit(item.id, habit)} aria-label={`Archive ${habit}`}>Archive habit</button></span></div>)}</div></div>)}</div><button className="primary-button settings-save" onClick={() => onSave({ ...account, name: name.trim() || account.name, settings })}>Save routine <Check size={17} /></button></section></main>;
}

function TrackerPage({ kind, onBack }: { kind: "water" | "bathroom" | "screen"; onBack: () => void }) {
  const isWater = kind === "water";
  const isScreen = kind === "screen";
  const [water, setWater] = useState(() => Number(localStorage.getItem(waterKey()) || 0));
  const [poops, setPoops] = useState(() => Number(localStorage.getItem(poopKey()) || 0));
  const [screenApps, setScreenApps] = useState<ScreenBreakdown>(() => JSON.parse(localStorage.getItem(screenKey()) || "{}"));
  const [selectedApp, setSelectedApp] = useState("Instagram");
  const [container, setContainer] = useState(250);
  const [poopLog, setPoopLog] = useState(false);
  const [poopMood, setPoopMood] = useState("🙂 Normal");
  const [poopNote, setPoopNote] = useState("None");
  const screen = Object.values(screenApps).reduce((total, minutes) => total + minutes, 0);
  const count = isWater ? water : isScreen ? screen : poops;
  const add = () => {
    if (isWater) { const next = Math.min(water + 1, 12); setWater(next); localStorage.setItem(waterKey(), String(next)); }
    else if (isScreen) { const next = { ...screenApps, [selectedApp]: (screenApps[selectedApp] || 0) + 15 }; setScreenApps(next); localStorage.setItem(screenKey(), JSON.stringify(next)); }
    else { const next = poops + 1; setPoops(next); localStorage.setItem(poopKey(), String(next)); setPoopLog(true); }
  };
  return <main className={`app tracker-page ${isWater ? "phase-afternoon" : "phase-morning"}`}><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-one"><CloudSun size={56} /></div></div>
    <header className="topbar"><button className="back-link" onClick={onBack}>← Today</button><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><span className="date-label">{new Date().toLocaleDateString([], { month: "short", day: "numeric" })}</span></header>
    <section className="tracker-wrap"><p className="kicker"><span className="pulse" /> {isScreen ? "A simple manual log" : "A tiny body check-in"}</p><h1>{isWater ? <>Fill your <em>cup.</em></> : isScreen ? <>Notice your <em>screen time.</em></> : <>Listen to your <em>body.</em></>}</h1><p className="tracker-copy">{isWater ? "A little water, a little more energy. Tap the glass whenever you refill." : isScreen ? "Browsers cannot read your device usage, so add a rough amount whenever you notice." : "No judgement, just useful information. Tap the toilet whenever you go."}</p>
      <div className={`tracker-illustration ${isWater ? "water-illustration" : "poop-illustration"}`} aria-live="polite">{isWater ? <><Droplets className="big-drop" size={94} /><div className="glass"><div className="glass-fill" style={{ height: `${Math.min(count * 9, 100)}%` }} /><span>💧</span></div></> : isScreen ? <div className="screen-illustration">📱<span>+15</span></div> : <><div className="moon-face">☻</div><div className="toilet" aria-label="Cute toilet">🚽</div>{Array.from({ length: Math.min(count, 8) }).map((_, index) => <span className="poop-drop" style={{ animationDelay: `${index * .12}s`, left: `${35 + (index % 4) * 9}%` }} key={index}>💩</span>)}</>}</div>
      {isWater && <div className="container-picker">{[250, 500, 750].map((size) => <button className={container === size ? "selected" : ""} onClick={() => setContainer(size)} key={size}>{size} ml</button>)}</div>}{isScreen && <div className="screen-app-picker">{["Instagram", "YouTube", "Other"].map((app) => <button className={selectedApp === app ? "selected" : ""} onClick={() => setSelectedApp(app)} key={app}>{app === "Instagram" ? "📸" : app === "YouTube" ? "▶️" : "📱"} {app}<strong>{screenApps[app] || 0}m</strong></button>)}</div>}<div className="tracker-count"><strong>{isWater ? `${(water * container / 1000).toFixed(2)}L` : count}</strong><span>{isWater ? `${water} ${water === 1 ? "glass" : "glasses"} today` : isScreen ? "minutes total" : `${count === 1 ? "visit" : "visits"} today`}</span></div><button className="tracker-button" onClick={add}>{isWater ? <><Droplets size={20} /> Add {container} ml</> : isScreen ? <><Clock3 size={20} /> Add 15 minutes to {selectedApp}</> : <>🚽 Log a poop</>}</button><p className="tracker-note">{isWater ? "Pick your usual container, then tap each refill." : isScreen ? `Logging ${selectedApp} separately keeps your day clear.` : "Your body has its own schedule ✦"}</p>
    {poopLog && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPoopLog(false)}><div className="entry-modal poop-modal"><div className="modal-head"><div><p className="section-label">A discreet check-in</p><h2>How was it?</h2></div><button className="modal-close" onClick={() => setPoopLog(false)}><X size={18} /></button></div><div className="poop-options">{["😌 Easy", "🙂 Normal", "😐 Hard", "😣 Difficult", "💧 Loose"].map((option) => <button className={poopMood === option ? "selected" : ""} onClick={() => setPoopMood(option)} key={option}>{option}</button>)}</div><p className="section-label poop-caption">Anything unusual?</p><div className="poop-options">{["None", "Bloating", "Pain", "Urgency", "Other"].map((option) => <button className={poopNote === option ? "selected" : ""} onClick={() => setPoopNote(option)} key={option}>{option}</button>)}</div><button className="primary-button" onClick={() => { localStorage.setItem(poopDetailKey(), JSON.stringify({ mood: poopMood, note: poopNote, time: new Date().toISOString() } satisfies PoopLog)); setPoopLog(false); }}>Save check-in <Check size={17} /></button></div></div>}
    </section></main>;
}

function Today({ account, onLogout, onAccountChange }: { account: Account; onLogout: () => void; onAccountChange: (account: Account) => void }) {
  const [phase, setPhase] = useState<PhaseId>(() => getCurrentPhase(account.settings));
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<string[]>(() => JSON.parse(localStorage.getItem(`dayflow-done-${todayKey()}`) || "[]"));
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(() => getCurrentPhase(account.settings) === "night");
  const [activities, setActivities] = useState<Activity[]>(() => uniqueActivities(JSON.parse(localStorage.getItem(activitiesKey()) || "[]") as Activity[]));
  const [water, setWater] = useState(() => Number(localStorage.getItem(waterKey()) || 4));
  const [page, setPage] = useState<"today" | "water" | "bathroom" | "timeline" | "calendar" | "settings" | "screen">("today");
  const current = phaseInfo.find((item) => item.id === phase)!;
  const habits = activeHabits(account.settings, phase);
  const done = habits.filter((habit) => completed.includes(`${phase}:${habit}`)).length;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => { const interval = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(interval); }, []);
  useEffect(() => { const next = getCurrentPhase(account.settings, now); if (next !== phase) { setPhase(next); setToast(`${phaseInfo.find((item) => item.id === next)?.label} has started`); if (next === "night") setReviewOpen(true); } }, [now, account.settings, phase]);
  useEffect(() => { localStorage.setItem(`dayflow-done-${todayKey()}`, JSON.stringify(completed)); }, [completed]);
  useEffect(() => { localStorage.setItem(activitiesKey(), JSON.stringify(activities)); }, [activities]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(timeout); }, [toast]);
  const toggleHabit = (habit: string) => { const key = `${phase}:${habit}`; setCompleted((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]); };
  const addHabit = (targetPhase: PhaseId, text: string) => {
    const nextAccount = { ...account, settings: { ...account.settings, [targetPhase]: { ...account.settings[targetPhase], habits: [...account.settings[targetPhase].habits, text], archivedHabits: (account.settings[targetPhase].archivedHabits || []).filter((habit) => habit !== text) } } };
    onAccountChange(nextAccount);
    setToast(`${text} added to ${phaseInfo.find((item) => item.id === targetPhase)?.label}`);
  };
  const addActivity = (activity: Activity) => { setActivities((items) => [...items, activity]); setToast(`${activity.text} added to your day`); };
  const completeLater = (targetPhase: PhaseId, habit: string) => {
    setCompleted((items) => items.includes(`${targetPhase}:${habit}`) ? items : [...items, `${targetPhase}:${habit}`]);
    if (!activities.some((activity) => activity.phase === targetPhase && activity.text.trim().toLowerCase() === habit.trim().toLowerCase())) {
      addActivity({ id: crypto.randomUUID(), text: habit, phase: targetPhase, completedAt: new Date().toISOString(), addedLater: true });
    }
  };
  const overview = useMemo(() => phaseInfo.map((item) => ({ ...item, done: activeHabits(account.settings, item.id).filter((habit) => completed.includes(`${item.id}:${habit}`)).length, total: activeHabits(account.settings, item.id).length })), [account.settings, completed]);
  const Icon = current.icon;
  if (page === "water" || page === "bathroom" || page === "screen") return <TrackerPage kind={page} onBack={() => setPage("today")} />;
  if (page === "timeline") return <TimelinePage account={account} completed={completed} activities={activities} water={water} poop={Number(localStorage.getItem(poopKey()) || 0)} screen={Number(localStorage.getItem(screenKey()) || 0)} onBack={() => setPage("today")} />;
  if (page === "calendar") return <CalendarPage account={account} currentCompleted={completed} onBack={() => setPage("today")} />;
  if (page === "settings") return <SettingsPage account={account} onSave={(next) => { onAccountChange(next); setPage("today"); }} onBack={() => setPage("today")} />;
  if (reviewOpen) return <DayReview account={account} completed={completed} activities={activities} water={water} poop={Number(localStorage.getItem(poopKey()) || 0)} screen={Object.values(JSON.parse(localStorage.getItem(screenKey()) || "{}") as ScreenBreakdown).reduce((sum, value) => sum + value, 0)} onClose={() => setReviewOpen(false)} onCompleteLater={completeLater} onToggleHabit={(targetPhase, habit) => setCompleted((items) => items.filter((item) => item !== `${targetPhase}:${habit}`))} onAdd={() => setAddModal(true)} />;
  return <main className={`app phase-${phase}`}><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-one"><CloudSun size={56} /></div><div className="cloud cloud-two"><CloudSun size={42} /></div><div className="stars">✦　·　✧　　·　✦　　·</div></div>
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><div className="header-actions"><span className="date-label">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span><button className="avatar" onClick={onLogout} aria-label="Log out">{account.name.slice(0, 1).toUpperCase()}</button></div></header>
    <section className="hero content-width"><div className="hero-copy"><p className="kicker"><span className="pulse" /> {current.eyebrow}</p><h1>{current.greeting}, <em>{account.name}.</em></h1><p className="intro">Here’s a little space for what matters <span>right now.</span></p></div><div className="time-card"><Icon size={22} strokeWidth={1.7} /><div><strong>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{current.label} · {formatTime(account.settings[phase].start)} — {formatTime(account.settings[phase].end)}</span></div></div></section>
    <section className="content-width dashboard-grid"><div className="primary-column"><div className="section-heading"><div><p className="section-label">Your flow</p><h2>{current.label} things</h2></div><button className="edit-routine-button" onClick={() => setPage("settings")}><Settings2 size={14} /> Edit routine</button><span className="progress-count">{done}/{habits.length} done</span></div><div className="habit-list">{habits.length ? habits.map((habit, index) => { const isDone = completed.includes(`${phase}:${habit}`); return <button className={`habit-row ${isDone ? "is-done" : ""}`} key={`${habit}-${index}`} onClick={() => toggleHabit(habit)}><span className="check-box">{isDone && <Check size={14} strokeWidth={3} />}</span><span className="habit-name">{habit}</span><span className="habit-number">0{index + 1}</span></button>; }) : <p className="empty-habits">Nothing planned here yet. Add a small thing when you’re ready.</p>}</div><button className="add-line" onClick={() => setAddOpen(true)}><CirclePlus size={18} /> Add something to your {current.label.toLowerCase()}</button><div className="reflection-card"><div className="reflection-icon"><Sparkles size={20} /></div><div><p className="section-label">A tiny reflection</p><h3>How are you feeling so far?</h3><p>Nothing to fix. Just a moment to notice.</p></div><ArrowUpRight size={18} className="reflection-arrow" /></div></div>
      <aside className="side-column"><div className="side-card phase-card"><div className="side-card-head"><p className="section-label">Day overview</p><Menu size={18} /></div><div className="phase-track">{overview.map((item) => { const PhaseIcon = item.icon; return <button key={item.id} className={`phase-stop ${item.id === phase ? "selected" : ""}`} onClick={() => { setPhase(item.id); setToast(`${item.label} is in view`); }}><span className="track-line" /><span className="phase-dot"><PhaseIcon size={13} /></span><span><strong>{item.label}</strong><small>{item.done}/{item.total} · {formatTime(account.settings[item.id].start)}</small></span></button>; })}</div><p className="phase-hint">Only your current moment stays in focus <span>✦</span></p><button className="review-link" onClick={() => setReviewOpen(true)}>Review my day <ArrowUpRight size={15} /></button></div><div className="side-card water-card"><div className="water-icon"><Droplets size={21} /></div><div><p className="section-label">Little check-in</p><h3>Water</h3><p className="muted">You’ve had <strong>{water} glasses</strong> today.</p></div><button className="round-add" onClick={() => { const next = Math.min(water + 1, 8); setWater(next); localStorage.setItem(waterKey(), String(next)); setToast("A glass of water added"); }}>+</button><div className="water-dots">{[1, 2, 3, 4, 5, 6].map((dot) => <span className={dot <= water ? "filled" : ""} key={dot} />)}</div></div></aside></section>
    <nav className="bottom-nav content-width" aria-label="Main navigation"><button className="active">Today</button><button onClick={() => setPage("timeline")}>Timeline</button><button onClick={() => setPage("calendar")}>Calendar</button><button onClick={() => setPage("water")}><Droplets size={14} /> Water</button><button onClick={() => setPage("bathroom")}>🚽 Bathroom</button><button onClick={() => setPage("screen")}>📱 Screen</button><button className="nav-settings" onClick={() => setPage("settings")}><Settings2 size={14} /> Edit routine</button></nav>
    <button className={`floating-add ${addOpen ? "open" : ""}`} onClick={() => setAddOpen((open) => !open)} aria-label="Add something">{addOpen ? <X size={22} /> : <CirclePlus size={23} />}<span>{addOpen ? "Close" : "Add"}</span></button>{addOpen && <div className="add-menu"><button onClick={() => { setAddOpen(false); setAddModal(true); }}><Check size={17} /> Habit</button><button onClick={() => { setAddOpen(false); setAddModal(true); }}><Sparkles size={17} /> Something I did</button></div>}{addModal && <AddSomething phase={phase} onClose={() => setAddModal(false)} onHabit={addHabit} onActivity={addActivity} />}{toast && <div className="toast"><Check size={16} /> {toast}</div>}<span className="screen-reader-only">{currentMinutes}</span>
  </main>;
}

function App() {
  const [account, setAccount] = useState<Account | null>(() => { const saved = localStorage.getItem(storageKey); return saved ? JSON.parse(saved) as Account : null; });
  const [onboarding, setOnboarding] = useState(false);
  const join = (next: Account) => { setAccount(next); setOnboarding(!localStorage.getItem(storageKey)); };
  const complete = (next: Account) => { localStorage.setItem(storageKey, JSON.stringify(next)); setAccount(next); setOnboarding(false); };
  if (!account) return <Join onJoin={join} />;
  if (onboarding) return <Onboarding account={account} onComplete={complete} />;
  return <Today account={account} onAccountChange={(next) => { localStorage.setItem(storageKey, JSON.stringify(next)); setAccount(next); }} onLogout={() => { setAccount(null); setOnboarding(false); }} />;
}

export default App;
