import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlus,
  CloudSun,
  Droplets,
  Flower2,
  Menu,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  X,
} from "lucide-react";

type PhaseId = "morning" | "afternoon" | "sunset" | "night";

type Phase = {
  id: PhaseId;
  label: string;
  eyebrow: string;
  greeting: string;
  range: string;
  icon: typeof Sun;
  next: string;
};

const phases: Phase[] = [
  {
    id: "morning",
    label: "Morning",
    eyebrow: "A fresh start",
    greeting: "Good morning",
    range: "6:00 — 11:00",
    icon: Sunrise,
    next: "afternoon",
  },
  {
    id: "afternoon",
    label: "Afternoon",
    eyebrow: "Keep your rhythm",
    greeting: "Good afternoon",
    range: "11:00 — 16:00",
    icon: Sun,
    next: "sunset",
  },
  {
    id: "sunset",
    label: "Sunset",
    eyebrow: "A softer pace",
    greeting: "Good evening",
    range: "16:00 — 20:00",
    icon: Sunset,
    next: "night",
  },
  {
    id: "night",
    label: "Night",
    eyebrow: "Time to unwind",
    greeting: "Good night",
    range: "20:00 — 06:00",
    icon: Moon,
    next: "morning",
  },
];

const habitsByPhase: Record<PhaseId, string[]> = {
  morning: ["Drink a glass of water", "Stretch for 5 minutes", "Read a few pages", "Have a nourishing breakfast"],
  afternoon: ["Take a proper lunch break", "Go for a little walk", "Focus on one meaningful thing", "Refill your water"],
  sunset: ["Move your body", "Make time for a hobby", "Tidy one small corner", "Check in with yourself"],
  night: ["Put your phone away", "Take care of your skin", "Write one line about today", "Get ready for sleep"],
};

function getTimePhase(): PhaseId {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "sunset";
  return "night";
}

function App() {
  const [phase, setPhase] = useState<PhaseId>(getTimePhase);
  const [completed, setCompleted] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Today");
  const [toast, setToast] = useState("");
  const current = useMemo(() => phases.find((item) => item.id === phase)!, [phase]);
  const Icon = current.icon;
  const habits = habitsByPhase[phase];

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1), 1);
      const nextPhase = phases[Math.min(Math.floor(progress * 4), 3)].id;
      setPhase((currentPhase) => (currentPhase === nextPhase ? currentPhase : nextPhase));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const toggleHabit = (habit: string) => {
    setCompleted((items) => items.includes(habit) ? items.filter((item) => item !== habit) : [...items, habit]);
  };

  const changePhase = (id: PhaseId) => {
    setPhase(id);
    setToast(`${phases.find((item) => item.id === id)?.label} has started`);
  };

  return (
    <main className={`app phase-${phase}`}>
      <div className="sky" aria-hidden="true">
        <div className="sun-orb" />
        <div className="cloud cloud-one"><CloudSun size={56} /></div>
        <div className="cloud cloud-two"><CloudSun size={42} /></div>
        <div className="stars">✦　·　✧　　·　✦　　·</div>
      </div>

      <header className="topbar">
        <a className="brand" href="/" aria-label="Dayflow home"><span className="brand-mark"><Flower2 size={18} /></span>dayflow</a>
        <div className="header-actions">
          <button className="date-picker" aria-label="Select date"><span>Today</span><ChevronDown size={15} /></button>
          <button className="avatar" aria-label="Open profile">M</button>
        </div>
      </header>

      <section className="hero content-width">
        <div className="hero-copy">
          <p className="kicker"><span className="pulse" /> {current.eyebrow}</p>
          <h1>{current.greeting}, <em>Meghna.</em></h1>
          <p className="intro">Here’s a little space for what matters <span>right now.</span></p>
        </div>
        <div className="time-card">
          <Icon size={22} strokeWidth={1.7} />
          <div><strong>{new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong><span>{current.label} · {current.range}</span></div>
        </div>
      </section>

      <section className="content-width dashboard-grid">
        <div className="primary-column">
          <div className="section-heading">
            <div><p className="section-label">Your flow</p><h2>{current.label} things</h2></div>
            <span className="progress-count">{completed.filter((item) => habits.includes(item)).length}/{habits.length} done</span>
          </div>
          <div className="habit-list">
            {habits.map((habit, index) => {
              const isDone = completed.includes(habit);
              return <button className={`habit-row ${isDone ? "is-done" : ""}`} key={habit} onClick={() => toggleHabit(habit)}>
                <span className="check-box">{isDone && <Check size={14} strokeWidth={3} />}</span>
                <span className="habit-name">{habit}</span>
                <span className="habit-number">0{index + 1}</span>
              </button>;
            })}
          </div>
          <button className="add-line" onClick={() => setAddOpen(true)}><CirclePlus size={18} /> Add something to your {current.label.toLowerCase()}</button>

          <div className="reflection-card">
            <div className="reflection-icon"><Sparkles size={20} /></div>
            <div><p className="section-label">A tiny reflection</p><h3>How are you feeling so far?</h3><p>Nothing to fix. Just a moment to notice.</p></div>
            <ArrowUpRight size={18} className="reflection-arrow" />
          </div>
        </div>

        <aside className="side-column">
          <div className="side-card phase-card">
            <div className="side-card-head"><p className="section-label">The day in motion</p><Menu size={18} /></div>
            <div className="phase-track">
              {phases.map((item) => {
                const PhaseIcon = item.icon;
                return <button key={item.id} className={`phase-stop ${item.id === phase ? "selected" : ""}`} onClick={() => changePhase(item.id)}>
                  <span className="track-line" /><span className="phase-dot"><PhaseIcon size={13} /></span><span><strong>{item.label}</strong><small>{item.range}</small></span>
                </button>;
              })}
            </div>
            <p className="phase-hint">Scroll to move through your day <span>↓</span></p>
          </div>
          <div className="side-card water-card">
            <div className="water-icon"><Droplets size={21} /></div><div><p className="section-label">Little check-in</p><h3>Water</h3><p className="muted">You’ve had <strong>4 glasses</strong> today.</p></div>
            <button className="round-add" onClick={() => setToast("A glass of water added")}>+</button>
            <div className="water-dots">{[1, 2, 3, 4, 5, 6].map((dot) => <span className={dot <= 4 ? "filled" : ""} key={dot} />)}</div>
          </div>
        </aside>
      </section>

      <nav className="bottom-nav content-width" aria-label="Main navigation">
        {["Today", "Timeline", "Calendar"].map((tab) => <button className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setToast(`${tab} view coming soon`); }} key={tab}>{tab}</button>)}
        <button className="nav-settings" aria-label="Settings">···</button>
      </nav>

      <button className={`floating-add ${addOpen ? "open" : ""}`} onClick={() => setAddOpen((open) => !open)} aria-label={addOpen ? "Close add menu" : "Add something"}>{addOpen ? <X size={22} /> : <CirclePlus size={23} />}<span>{addOpen ? "Close" : "Add"}</span></button>
      {addOpen && <div className="add-menu"><button onClick={() => { setAddOpen(false); setToast("Habit added to your flow"); }}><Check size={17} /> Habit</button><button onClick={() => { setAddOpen(false); setToast("Note added to your day"); }}><Sparkles size={17} /> Note</button></div>}
      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </main>
  );
}

export default App;
