import { useState, useEffect } from "react";
import { auth, db, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./App.css";

// ── Data ─────────────────────────────────────────────────────────────
const questions = [
  { id: "energy", text: "How's your energy right now?", options: [["Drained 🪫", 1], ["Low", 2], ["Okay", 3], ["Good ⚡", 4]] },
  { id: "stress", text: "How stressed do you feel?", options: [["Overwhelmed 😵", 4], ["Pretty stressed", 3], ["A little", 2], ["Calm 😌", 1]] },
  { id: "goal", text: "What do you need right now?", options: [["Calm me down 🌊", "calm"], ["Lift my mood ☀️", "uplift"], ["Help me focus 🎯", "focus"], ["Let me feel it 🌧️", "feel"]] },
];

const MOOD_INFO = {
  calm:   { label: "Calm & Grounded", emoji: "🌊", desc: "Slow your breath, settle your mind.", color: "#1565c0" },
  uplift: { label: "Energised & Uplifted", emoji: "☀️", desc: "A shot of serotonin, straight to the soul.", color: "#e65100" },
  focus:  { label: "Deep Focus Mode", emoji: "🎯", desc: "Minimal. Immersive. Lock in.", color: "#4a148c" },
  feel:   { label: "Let It All Out", emoji: "🌧️", desc: "Sometimes you just need to feel it fully.", color: "#37474f" },
};

const PLAYLISTS = {
  calm: [
    { title: "Golden Hour", artist: "JVKE", spotifyUrl: "https://open.spotify.com/track/0nrRP0lCHK4qhTCcMnEjlS" },
    { title: "Weightless", artist: "Marconi Union", spotifyUrl: "https://open.spotify.com/track/2S0FGe0V2kpSmMVHHIFPXn" },
    { title: "Breathe (2 AM)", artist: "Anna Nalick", spotifyUrl: "https://open.spotify.com/track/0fAB6qJa13kvMnqNsQGJOd" },
    { title: "Sunset Lover", artist: "Petit Biscuit", spotifyUrl: "https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt" },
    { title: "Bloom", artist: "The Paper Kites", spotifyUrl: "https://open.spotify.com/track/2rB5kRrRLq8KLSYFmgIbZ8" },
    { title: "River", artist: "Leon Bridges", spotifyUrl: "https://open.spotify.com/track/2mSjPGOVVqgFXuJq5SGCPF" },
  ],
  uplift: [
    { title: "Good as Hell", artist: "Lizzo", spotifyUrl: "https://open.spotify.com/track/6KgBpzTuTRPebChN0VTyzV" },
    { title: "Levitating", artist: "Dua Lipa", spotifyUrl: "https://open.spotify.com/track/463CkQjx2Zfosg1mjXMHJZ" },
    { title: "Happy", artist: "Pharrell Williams", spotifyUrl: "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCO" },
    { title: "Shake It Off", artist: "Taylor Swift", spotifyUrl: "https://open.spotify.com/track/0cqRj7pUJDkTCEsJkx8snD" },
    { title: "Can't Stop the Feeling", artist: "Justin Timberlake", spotifyUrl: "https://open.spotify.com/track/6173rrDJBaHucqOOGLiARL" },
    { title: "Best Day of My Life", artist: "American Authors", spotifyUrl: "https://open.spotify.com/track/5WJ9AHjN2JJHhViqtKNvhS" },
  ],
  focus: [
    { title: "Experience", artist: "Ludovico Einaudi", spotifyUrl: "https://open.spotify.com/track/1BncfTJAWtKlZnAmEGMpei" },
    { title: "Time", artist: "Hans Zimmer", spotifyUrl: "https://open.spotify.com/track/6ZFbXIJkuI1dVNWvzJzown" },
    { title: "Divenire", artist: "Ludovico Einaudi", spotifyUrl: "https://open.spotify.com/track/1tCKGTibgkBBZ6D8UVIuRF" },
    { title: "Re: Stacks", artist: "Bon Iver", spotifyUrl: "https://open.spotify.com/track/3hQKB3fFPqCg0se53Bxo7b" },
    { title: "Comptine d'un autre été", artist: "Yann Tiersen", spotifyUrl: "https://open.spotify.com/track/1qNaWNBKyTMDLMEVFcQI2i" },
    { title: "Clair de Lune", artist: "Debussy", spotifyUrl: "https://open.spotify.com/track/4dKNeCUMCMUAiXSjCGBWxG" },
  ],
  feel: [
    { title: "Liability", artist: "Lorde", spotifyUrl: "https://open.spotify.com/track/1Ib7D4hFLHVFirEpvUjXpx" },
    { title: "Skinny Love", artist: "Bon Iver", spotifyUrl: "https://open.spotify.com/track/6cLBjCcQ5hKnFhFfezAFKZ" },
    { title: "Motion Sickness", artist: "Phoebe Bridgers", spotifyUrl: "https://open.spotify.com/track/4M0hQhkf2hbMKBb4YBW4OC" },
    { title: "Fade Into You", artist: "Mazzy Star", spotifyUrl: "https://open.spotify.com/track/2jpDioAB9tlYXMdXDK3BGl" },
    { title: "The Night Will Always Win", artist: "Manchester Orchestra", spotifyUrl: "https://open.spotify.com/track/2pMDFbOvzZkMCkdcbJTxLz" },
    { title: "Team", artist: "Lorde", spotifyUrl: "https://open.spotify.com/track/2dLLR6qlu5UJ5gk0dKIFcJ" },
  ],
};

function algorithm(answers) {
  const MOOD_SCORES = {
    calm:   { eRange: [1,2], sRange: [3,4] },
    uplift: { eRange: [3,4], sRange: [1,2] },
    focus:  { eRange: [2,3], sRange: [2,3] },
    feel:   { eRange: [1,3], sRange: [3,4] },
  };
  const energy = answers.energy || 2;
  const stress = answers.stress || 2;
  const goal   = answers.goal || "calm";
  return Object.entries(MOOD_SCORES).map(([key, r]) => {
    let score = key === goal ? 50 : 0;
    score += energy >= r.eRange[0] && energy <= r.eRange[1] ? 30 : Math.max(0, 30 - Math.min(Math.abs(energy - r.eRange[0]), Math.abs(energy - r.eRange[1])) * 10);
    score += stress >= r.sRange[0] && stress <= r.sRange[1] ? 20 : Math.max(0, 20 - Math.min(Math.abs(stress - r.sRange[0]), Math.abs(stress - r.sRange[1])) * 8);
    return [key, score];
  }).sort((a, b) => b[1] - a[1]);
}

// ── Screens ──────────────────────────────────────────────────────────

function Splash({ onStart }) {
  return (
    <div className="screen">
      <div className="card splash-card">
        <div className="leaf-bg">
          <div className="leaf leaf1">🍃</div>
          <div className="leaf leaf2">🌿</div>
          <div className="leaf leaf3">🍃</div>
        </div>
        <div className="splash-header">
          <div className="logo-icon">🌿</div>
          <h1 className="logo-title">Solstice</h1>
          <p className="logo-sub">Where nature meets your feelings</p>
        </div>
        <div className="card-body">
          <p className="desc-text">
            Answer 3 quick questions and get a playlist perfectly matched to your mood — powered by Spotify and the Solstice Algorithm.
          </p>
          <button className="btn-primary" onClick={() => onStart("terms")}>Get Started →</button>
          <p className="hint-text">Requires Spotify to open songs</p>
        </div>
      </div>
    </div>
  );
}

function Terms({ onAgree, onBack }) {
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="screen">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Terms & Privacy</h2>
          <p className="card-sub">Please read before continuing</p>
        </div>
        <div className="card-body">
          <div className="terms-box">
            <b>SOLSTICE TERMS OF SERVICE</b><br/><br/>
            1. By using Solstice you agree to these terms.<br/>
            2. Spotify is required to play music.<br/>
            3. Your account data is stored securely in Firebase.<br/>
            4. We never access your Spotify payment information.<br/>
            5. Passwords are encrypted — we cannot read them.<br/>
            6. Solstice is provided as-is without warranties.<br/>
            7. We may update these terms at any time.<br/><br/>
            By clicking Agree you confirm you have read and accepted these Terms & Privacy Policy.
          </div>
          <label className="check-label">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            I have read and agree to the Terms & Privacy Policy
          </label>
          {err && <p className="error-text">{err}</p>}
          <button className="btn-primary" onClick={() => { if (!agreed) { setErr("Please agree to continue"); return; } onAgree(); }}>Continue →</button>
          <button className="btn-outline" onClick={onBack}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function Auth({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleGoogle() {
    setLoading(true); setErr("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName,
        email: result.user.email,
        createdAt: new Date().toISOString()
      }, { merge: true });
      onLogin({ name: result.user.displayName, email: result.user.email });
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  async function submit() {
    setErr(""); setLoading(true);
    try {
      if (mode === "register") {
        if (!form.name) { setErr("Please enter your name"); setLoading(false); return; }
        if (form.password.length < 6) { setErr("Password must be 6+ characters"); setLoading(false); return; }
        if (form.password !== form.confirm) { setErr("Passwords do not match"); setLoading(false); return; }
        const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(result.user, { displayName: form.name });
        await setDoc(doc(db, "users", result.user.uid), {
          name: form.name,
          email: form.email,
          createdAt: new Date().toISOString()
        });
        onLogin({ name: form.name, email: form.email });
      } else {
        const result = await signInWithEmailAndPassword(auth, form.email, form.password);
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        const name = userDoc.exists() ? userDoc.data().name : result.user.displayName || "Friend";
        onLogin({ name, email: form.email });
      }
    } catch (e) {
      if (e.code === "auth/user-not-found") setErr("No account found with this email");
      else if (e.code === "auth/wrong-password") setErr("Incorrect password");
      else if (e.code === "auth/email-already-in-use") setErr("Account already exists — please login");
      else setErr(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="screen">
      <div className="card">
        <div className="card-header">
          <div className="logo-icon small">🌿</div>
          <h2 className="card-title">Solstice</h2>
        </div>
        <div className="card-body">
          <div className="tabs">
            <button className={`tab ${mode === "login" ? "tab-active" : ""}`} onClick={() => { setMode("login"); setErr(""); }}>Login</button>
            <button className={`tab ${mode === "register" ? "tab-active" : ""}`} onClick={() => { setMode("register"); setErr(""); }}>Register</button>
          </div>
          {mode === "register" && <>
            <label className="field-label">Full Name</label>
            <input className="field-input" placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} />
          </>}
          <label className="field-label">Email Address</label>
          <input className="field-input" placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
          <label className="field-label">Password</label>
          <input className="field-input" type="password" placeholder="Password" value={form.password} onChange={e => set("password", e.target.value)} />
          {mode === "register" && <>
            <label className="field-label">Confirm Password</label>
            <input className="field-input" type="password" placeholder="Confirm password" value={form.confirm} onChange={e => set("confirm", e.target.value)} />
          </>}
          {err && <p className="error-text">{err}</p>}
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Please wait..." : mode === "register" ? "Create Account →" : "Login →"}
          </button>
          <div className="divider"><span>or</span></div>
          <button className="btn-google" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
            Continue with Google
          </button>
          <button className="btn-outline" onClick={onBack}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function Home({ user, onStart, onLogout }) {
  return (
    <div className="screen">
      <div className="card splash-card">
        <div className="leaf-bg">
          <div className="leaf leaf1">🍃</div>
          <div className="leaf leaf2">🌿</div>
          <div className="leaf leaf3">🍃</div>
        </div>
        <div className="card-header home-header">
          <div className="user-bar">
            <span className="user-name">👤 {user.name}</span>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
          <div className="logo-icon">🌿</div>
          <h1 className="logo-title">Solstice</h1>
          <p className="logo-sub">Where nature meets your feelings</p>
        </div>
        <div className="card-body">
          <p className="desc-text">Welcome back, <b>{user.name}</b>! Ready to find your perfect playlist?</p>
          <button className="btn-primary" onClick={onStart}>Find My Playlist 🎵</button>
          <p className="hint-text">Powered by Solstice Algorithm</p>
        </div>
      </div>
    </div>
  );
}

function Question({ step, onAnswer, onBack }) {
  const q = questions[step];
  return (
    <div className="screen">
      <div className="card">
        <div className="card-header">
          <div className="progress-bar">
            {[0,1,2].map(i => <div key={i} className={`progress-seg ${i <= step ? "progress-active" : ""}`} />)}
          </div>
          <p className="step-label">Step {step + 1} of 3</p>
          <h2 className="question-text">{q.text}</h2>
        </div>
        <div className="card-body">
          {q.options.map(([label, val]) => (
            <button key={val} className="opt-btn" onClick={() => onAnswer(q.id, val)}>{label}</button>
          ))}
          {step > 0 && <button className="btn-outline" onClick={onBack}>← Back</button>}
        </div>
      </div>
    </div>
  );
}

function Result({ answers, onRestart }) {
  const ranked = algorithm(answers);
  const topMood = ranked[0][0];
  const mood = MOOD_INFO[topMood];
  const tracks = PLAYLISTS[topMood];

  return (
    <div className="screen">
      <div className="card result-card">
        <div className="card-header result-header" style={{ background: `linear-gradient(135deg, #2e7d32, ${mood.color})` }}>
          <p className="result-label">Solstice picked for you</p>
          <div className="result-emoji">{mood.emoji}</div>
          <h2 className="result-title">{mood.label}</h2>
          <p className="result-desc">{mood.desc}</p>
          <div className="mood-scores">
            {ranked.map(([k, sc]) => (
              <span key={k} className="mood-score-pill">
                {MOOD_INFO[k].emoji} {sc}%
              </span>
            ))}
          </div>
        </div>
        <div className="card-body">
          <p className="playlist-label">🎧 Your Playlist — opens in Spotify</p>
          {tracks.map((t, i) => (
            <a key={i} className="track-row" href={t.spotifyUrl} target="_blank" rel="noopener noreferrer">
              <div className="track-num">{i + 1}</div>
              <div className="track-info">
                <div className="track-title">{t.title}</div>
                <div className="track-artist">{t.artist}</div>
              </div>
              <div className="spotify-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              </div>
            </a>
          ))}
          <div className="result-actions">
            <button className="btn-primary" onClick={onRestart}>🔄 Try Again</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const userDoc = await getDoc(doc(db, "users", fireUser.uid));
        const name = userDoc.exists() ? userDoc.data().name : fireUser.displayName || "Friend";
        setUser({ name, email: fireUser.email });
        setScreen("home");
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  function answer(id, val) {
    const newAnswers = { ...answers, [id]: val };
    setAnswers(newAnswers);
    if (step + 1 >= questions.length) setScreen("result");
    else setStep(step + 1);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setScreen("splash");
  }

  if (authLoading) return (
    <div className="screen">
      <div className="loading-box">
        <div className="loading-icon">🌿</div>
        <p>Loading Solstice...</p>
      </div>
    </div>
  );

  if (screen === "splash") return <Splash onStart={() => setScreen("terms")} />;
  if (screen === "terms")  return <Terms onAgree={() => setScreen("auth")} onBack={() => setScreen("splash")} />;
  if (screen === "auth")   return <Auth onLogin={u => { setUser(u); setScreen("home"); }} onBack={() => setScreen("terms")} />;
  if (screen === "home")   return <Home user={user} onStart={() => { setStep(0); setAnswers({}); setScreen("question"); }} onLogout={logout} />;
  if (screen === "question") return <Question step={step} answers={answers} onAnswer={answer} onBack={() => { if (step === 0) setScreen("home"); else setStep(step - 1); }} />;
  if (screen === "result") return <Result answers={answers} onRestart={() => { setAnswers({}); setStep(0); setScreen("home"); }} />;
}
