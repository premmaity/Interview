import { ArrowRight, BarChart3, Mic2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="brand"><span className="brand-mark">IM</span>Interview Mentor</Link>
        <nav aria-label="Guest navigation"><Link to="/login">Sign in</Link><Link className="nav-cta" to="/register">Start practicing</Link></nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> Deliberate practice, not generic advice</p>
            <h1>Turn interview nerves into a repeatable system.</h1>
            <p className="hero-lede">Practice one question at a time. Keep every completed turn. See exactly where your answer was strong, thin, or unsupported.</p>
            <div className="hero-actions"><Link className="primary-button" to="/register">Build my first round<ArrowRight size={18} /></Link><Link className="text-link" to="/login">Resume practice</Link></div>
            <div className="trust-strip"><span><ShieldCheck size={17} /> Private by default</span><span><Mic2 size={17} /> Text always available</span><span><BarChart3 size={17} /> Evidence-based feedback</span></div>
          </div>
          <div className="hero-visual" aria-label="Example interview feedback">
            <div className="visual-top"><span className="live-dot" />System design · question 3 of 5</div>
            <blockquote>“How would you prevent duplicate charges when a mobile client retries?”</blockquote>
            <div className="answer-preview"><small>Your answer</small><p>I would introduce an idempotency key, store it with the transaction, and return the original result on retry…</p></div>
            <div className="score-preview"><div><span>84</span><small>Coaching score</small></div><ul><li>Clear transaction boundary</li><li>Add expiry and collision policy</li></ul></div>
          </div>
        </section>
        <section className="feature-band" aria-labelledby="how-it-works">
          <p className="eyebrow">How it works</p><h2 id="how-it-works">A practice loop that survives refreshes—and reality.</h2>
          <div className="feature-grid"><article><span>01</span><h3>Configure the signal</h3><p>Choose the role, seniority, round, difficulty, and number of questions.</p></article><article><span>02</span><h3>Answer your way</h3><p>Type, dictate in supported browsers, or upload a short recording for transcription.</p></article><article><span>03</span><h3>Review the evidence</h3><p>Compare rubric coverage, concrete evidence, gaps, and a stronger answer outline.</p></article></div>
        </section>
      </main>
      <footer><span>Interview Mentor</span><span>Coaching feedback is not a hiring decision.</span></footer>
    </div>
  )
}

