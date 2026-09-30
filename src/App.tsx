import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight, Check, ChevronDown, CirclePlus, CloudSun, Droplets, Flower2,
  Menu, Moon, Sparkles, Sun, Sunrise, Sunset, X,
} from "lucide-react";

type PhaseId = "morning" | "afternoon" | "sunset" | "night";
type Phase = { id: PhaseId; label: string; eyebrow: string; greeting: string; icon: typeof Sun };
type PhaseSettings = Record<PhaseId, { start: string; end: string; habits: string[] }>;
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
const activitiesKey = () => `dayflow-activities-${todayKey()}`;
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

function DayReview({ account, completed, activities, onClose, onActivity, onCompleteLater, onAdd }: { account: Account; completed: string[]; activities: Activity[]; onClose: () => void; onActivity: (activity: Activity) => void; onCompleteLater: (phase: PhaseId, habit: string) => void; onAdd: () => void }) {
  const totalDone = phaseInfo.reduce((sum, item) => sum + account.settings[item.id].habits.filter((habit) => completed.includes(`${item.id}:${habit}`)).length, 0) + activities.length;
  return <main className="app phase-night review-screen"><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="stars">✦　·　✧　　·　✦　　·</div></div><header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><button className="review-close" onClick={onClose}>Back to today <X size={16} /></button></header>
    <section className="review-wrap"><p className="kicker"><span className="pulse" /> A gentle look back</p><h1>Your day is <em>ending.</em></h1><p className="join-copy">You showed up in ways that count, {account.name}.</p><div className="review-stats"><strong>{totalDone} things completed</strong><span>{activities.length} added later</span></div>
      <div className="review-periods">{phaseInfo.map((item) => { const planned = account.settings[item.id].habits; const done = planned.filter((habit) => completed.includes(`${item.id}:${habit}`)); const late = activities.filter((activity) => activity.phase === item.id); const PhaseIcon = item.icon; return <section className="review-period" key={item.id}><div className="review-period-head"><h2><PhaseIcon size={18} />{item.label}</h2><span>{done.length}/{planned.length}</span></div><div className="review-items">{planned.map((habit) => { const isDone = completed.includes(`${item.id}:${habit}`); return <button className={`review-item ${isDone ? "done" : ""}`} key={habit} onClick={() => !isDone && onCompleteLater(item.id, habit)}><span className="check-box">{isDone && <Check size={13} strokeWidth={3} />}</span>{habit}{!isDone && <small>tap to log later</small>}</button>; })}{late.map((activity) => <div className="review-item done late-item" key={activity.id}><span className="check-box"><Check size={13} strokeWidth={3} /></span>{activity.text}<small>↳ completed later at {formatDateTime(activity.completedAt)}</small></div>)}</div></section>; })}</div>
      <button className="add-line review-add" onClick={onAdd}><CirclePlus size={18} /> Add something I did</button><button className="primary-button close-day" onClick={onClose}><Sparkles size={17} /> Close my day</button>
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
  const [activities, setActivities] = useState<Activity[]>(() => JSON.parse(localStorage.getItem(activitiesKey()) || "[]"));
  const [water, setWater] = useState(4);
  const current = phaseInfo.find((item) => item.id === phase)!;
  const habits = account.settings[phase].habits;
  const done = habits.filter((habit) => completed.includes(`${phase}:${habit}`)).length;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => { const interval = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(interval); }, []);
  useEffect(() => { const next = getCurrentPhase(account.settings, now); if (next !== phase) { setPhase(next); setToast(`${phaseInfo.find((item) => item.id === next)?.label} has started`); if (next === "night") setReviewOpen(true); } }, [now, account.settings, phase]);
  useEffect(() => { localStorage.setItem(`dayflow-done-${todayKey()}`, JSON.stringify(completed)); }, [completed]);
  useEffect(() => { localStorage.setItem(activitiesKey(), JSON.stringify(activities)); }, [activities]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(timeout); }, [toast]);
  const toggleHabit = (habit: string) => { const key = `${phase}:${habit}`; setCompleted((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]); };
  const addHabit = (targetPhase: PhaseId, text: string) => {
    const nextAccount = { ...account, settings: { ...account.settings, [targetPhase]: { ...account.settings[targetPhase], habits: [...account.settings[targetPhase].habits, text] } } };
    onAccountChange(nextAccount);
    setToast(`${text} added to ${phaseInfo.find((item) => item.id === targetPhase)?.label}`);
  };
  const addActivity = (activity: Activity) => { setActivities((items) => [...items, activity]); setToast(`${activity.text} added to your day`); };
  const completeLater = (targetPhase: PhaseId, habit: string) => {
    setCompleted((items) => items.includes(`${targetPhase}:${habit}`) ? items : [...items, `${targetPhase}:${habit}`]);
    addActivity({ id: crypto.randomUUID(), text: habit, phase: targetPhase, completedAt: new Date().toISOString(), addedLater: true });
  };
  const overview = useMemo(() => phaseInfo.map((item) => ({ ...item, done: account.settings[item.id].habits.filter((habit) => completed.includes(`${item.id}:${habit}`)).length, total: account.settings[item.id].habits.length })), [account.settings, completed]);
  const Icon = current.icon;
  if (reviewOpen) return <DayReview account={account} completed={completed} activities={activities} onClose={() => setReviewOpen(false)} onActivity={addActivity} onCompleteLater={completeLater} onAdd={() => setAddModal(true)} />;
  return <main className={`app phase-${phase}`}><div className="sky" aria-hidden="true"><div className="sun-orb" /><div className="cloud cloud-one"><CloudSun size={56} /></div><div className="cloud cloud-two"><CloudSun size={42} /></div><div className="stars">✦　·　✧　　·　✦　　·</div></div>
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a><div className="header-actions"><span className="date-label">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span><button className="avatar" onClick={onLogout} aria-label="Log out">{account.name.slice(0, 1).toUpperCase()}</button></div></header>
    <section className="hero content-width"><div className="hero-copy"><p className="kicker"><span className="pulse" /> {current.eyebrow}</p><h1>{current.greeting}, <em>{account.name}.</em></h1><p className="intro">Here’s a little space for what matters <span>right now.</span></p></div><div className="time-card"><Icon size={22} strokeWidth={1.7} /><div><strong>{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{current.label} · {formatTime(account.settings[phase].start)} — {formatTime(account.settings[phase].end)}</span></div></div></section>
    <section className="content-width dashboard-grid"><div className="primary-column"><div className="section-heading"><div><p className="section-label">Your flow</p><h2>{current.label} things</h2></div><span className="progress-count">{done}/{habits.length} done</span></div><div className="habit-list">{habits.length ? habits.map((habit, index) => { const isDone = completed.includes(`${phase}:${habit}`); return <button className={`habit-row ${isDone ? "is-done" : ""}`} key={`${habit}-${index}`} onClick={() => toggleHabit(habit)}><span className="check-box">{isDone && <Check size={14} strokeWidth={3} />}</span><span className="habit-name">{habit}</span><span className="habit-number">0{index + 1}</span></button>; }) : <p className="empty-habits">Nothing planned here yet. Add a small thing when you’re ready.</p>}</div><button className="add-line" onClick={() => setAddOpen(true)}><CirclePlus size={18} /> Add something to your {current.label.toLowerCase()}</button><div className="reflection-card"><div className="reflection-icon"><Sparkles size={20} /></div><div><p className="section-label">A tiny reflection</p><h3>How are you feeling so far?</h3><p>Nothing to fix. Just a moment to notice.</p></div><ArrowUpRight size={18} className="reflection-arrow" /></div></div>
      <aside className="side-column"><div className="side-card phase-card"><div className="side-card-head"><p className="section-label">Day overview</p><Menu size={18} /></div><div className="phase-track">{overview.map((item) => { const PhaseIcon = item.icon; return <button key={item.id} className={`phase-stop ${item.id === phase ? "selected" : ""}`} onClick={() => { setPhase(item.id); setToast(`${item.label} is in view`); }}><span className="track-line" /><span className="phase-dot"><PhaseIcon size={13} /></span><span><strong>{item.label}</strong><small>{item.done}/{item.total} · {formatTime(account.settings[item.id].start)}</small></span></button>; })}</div><p className="phase-hint">Only your current moment stays in focus <span>✦</span></p><button className="review-link" onClick={() => setReviewOpen(true)}>Review my day <ArrowUpRight size={15} /></button></div><div className="side-card water-card"><div className="water-icon"><Droplets size={21} /></div><div><p className="section-label">Little check-in</p><h3>Water</h3><p className="muted">You’ve had <strong>{water} glasses</strong> today.</p></div><button className="round-add" onClick={() => { setWater((value) => Math.min(value + 1, 8)); setToast("A glass of water added"); }}>+</button><div className="water-dots">{[1, 2, 3, 4, 5, 6].map((dot) => <span className={dot <= water ? "filled" : ""} key={dot} />)}</div></div></aside></section>
    <nav className="bottom-nav content-width" aria-label="Main navigation"><button className="active">Today</button><button onClick={() => setToast("Your timeline is coming together")}>Timeline</button><button onClick={() => setToast("Calendar view is coming soon")}>Calendar</button><button className="nav-settings" onClick={onLogout}>Log out</button></nav>
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
