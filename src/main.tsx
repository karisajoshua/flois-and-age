import {OurStory} from './OurStory';
import {StrictMode, Suspense, lazy, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {motion, useReducedMotion} from 'motion/react';
import {asset, wedding} from './wedding';
import {Envelope} from './Envelope';
import {OpeningTitle} from './OpeningTitle';
import {EventDetails} from './EventDetails';
import {Rsvp} from './Rsvp';
import './styles.css';

const Admin = lazy(() => import('./Admin').then(module => ({default: module.Admin})));
gsap.registerPlugin(ScrollTrigger);

function Countdown() {
  const remaining = () => Math.max(0, Math.floor((Date.parse(wedding.date + 'T00:00:00+03:00') - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(remaining);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds(remaining()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const units = [
    ['Days', Math.floor(seconds / 86400)],
    ['Hours', Math.floor(seconds / 3600) % 24],
    ['Minutes', Math.floor(seconds / 60) % 60],
    ['Seconds', seconds % 60],
  ] as const;
  return <section className="live-countdown" aria-label="Countdown to the wedding day">
    <p className="eyebrow">{seconds > 0 ? 'Until we celebrate' : 'Our wedding day has arrived'}</p>
    <div className="countdown-units" role="timer" aria-live="off">
      {units.map(([label, value]) => <div className="countdown-unit" key={label}><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>)}
    </div>
  </section>;
}

function App() {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started || !('wakeLock' in navigator)) return;
    let disposed = false;
    let lock: WakeLockSentinel | null = null;
    let pending = false;
    const acquire = async () => {
      if (disposed || document.hidden || pending || (lock && !lock.released)) return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) await next.release();
        else lock = next;
      } catch { /* Unsupported or denied by the browser or operating system. */ }
      finally { pending = false; }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      if (lock && !lock.released) void lock.release().catch(() => {});
    };
  }, [started]);
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    if (!confetti) return;
    const timer = window.setTimeout(() => setConfetti(false), 4800);
    return () => window.clearTimeout(timer);
  }, [confetti]);
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const entrance = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const musicMuted = useRef(false);
  
  const openingRef = useRef(false);
  const reduced = useReducedMotion();
  const [manualIntro, setManualIntro] = useState(false);
  const automaticScroll = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (opened) {
      window.scrollTo({top: 0, behavior: 'instant'});
      heading.current?.focus({preventScroll: true});
    }
  }, [opened]);

  useEffect(() => {
    if (!opening) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = previous; };
  }, [opening]);

  useEffect(() => {
    if (opened || !entrance.current) return;
    const el = entrance.current;
    const scenes = Array.from(el.querySelectorAll<HTMLElement>('.scene'));
    let lastActive = -1;
    let lastReady = false;
    function activate(active: number, isReady: boolean) {
      if (openingRef.current) return;
      if (lastActive !== active) {
        scenes.forEach((scene, i) => {
          scene.inert = i !== active;
          scene.setAttribute('aria-hidden', String(i !== active));
        });
        lastActive = active;
      }
      if (isReady !== lastReady) {
        setReady(isReady);
        lastReady = isReady;
      }
    }
    setReady(false);
    const context = gsap.context(() => {
      if (reduced) {
        // Keep the opening and envelope in normal document flow, without automatic movement.
        scenes.forEach((scene, i) => {
          const visible = i === 0 || i === scenes.length - 1;
          gsap.set(scene, {opacity: visible ? 1 : 0});
          scene.inert = !visible;
          scene.setAttribute('aria-hidden', String(!visible));
        });
        setReady(true);
        return;
      }
      gsap.set(scenes, {opacity: 0});
      gsap.set(scenes[0], {opacity: 1});
      const sequence = gsap.timeline({
        scrollTrigger: {trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.8},
        onUpdate: () => {
          const active = scenes.reduce((best, scene, i) =>
            Number(gsap.getProperty(scene, 'opacity')) > Number(gsap.getProperty(scenes[best], 'opacity')) ? i : best, 0);
          activate(active, Number(gsap.getProperty(scenes[scenes.length - 1], 'opacity')) > 0.98);
        },
      });
      scenes.forEach((scene, i) => {
        if (i > 0) sequence.to(scene, {opacity: 1, duration: 0.8, ease: 'sine.inOut'});
        sequence.to({}, {duration: i === scenes.length - 1 ? 1.1 : 0.85});
        if (i < scenes.length - 1) sequence.to(scene, {opacity: 0, duration: 0.65, ease: 'sine.inOut'});
      });
      activate(0, false);
    }, el);
    return () => context.revert();
  }, [opened, reduced]);

  useEffect(() => {
    if (!started || opened || reduced || !entrance.current) return;
    const el = entrance.current;
    const position = {progress: 0};
    let active = true;
    setManualIntro(false);
    window.scrollTo({top: 0, behavior: 'instant'});
    const destination = () => Math.max(0, el.offsetTop + el.offsetHeight - (el.querySelector<HTMLElement>('.pinned-scenes')?.offsetHeight || window.innerHeight));
    const tween = gsap.to(position, {
      progress: 1, delay: 0.6, duration: 20, ease: 'none',
      onUpdate: () => {
        if (!openingRef.current) window.scrollTo({top: position.progress * destination(), behavior: 'instant'});
      },
      onComplete: () => {active = false; window.scrollTo({top: destination(), behavior: 'instant'}); ScrollTrigger.update();},
    });
    automaticScroll.current = tween;
    const stop = () => {
      if (!active) return;
      active = false; tween.kill(); setManualIntro(true);
    };
    const key = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) stop();
    };
    const visibility = () => {if (active) {if (document.hidden) tween.pause(); else tween.resume();}};
    visibility();
    window.addEventListener('wheel', stop, {passive: true});
    window.addEventListener('touchmove', stop, {passive: true});
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false; tween.kill(); automaticScroll.current = null;
      window.removeEventListener('wheel', stop); window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', visibility);
    };
  }, [started, opened, reduced]);

  useEffect(() => {
    if (!opened || reduced) return;
    let frame = 0, last = 0, elapsed = 0, stopped = false;
    const stop = () => { stopped = true; cancelAnimationFrame(frame); };
    const tick = (now: number) => {
      if (stopped) return;
      const dt = last ? Math.min(now - last, 50) : 0;
      last = now;
      if (!document.hidden) {
        elapsed += dt;
        if (elapsed > 3500) {
          const target = document.getElementById('rsvp');
          const end = target ? target.getBoundingClientRect().top + window.scrollY - 24 : document.documentElement.scrollHeight - window.innerHeight;
          if (window.scrollY >= end - 2) { stop(); return; }
          const gallery = document.querySelector<HTMLElement>('.story-cinema');
          if (gallery && gallery.dataset.storyComplete !== 'true') {
            const rect = gallery.getBoundingClientRect();
            if (rect.top <= Math.max(16, (window.innerHeight - rect.height) / 2) && rect.bottom > 0) {
              frame = requestAnimationFrame(tick);
              return;
            }
          }
          distance += dt * 0.045;
          const pixels = Math.floor(distance);
          if (pixels > 0) { distance -= pixels; window.scrollTo({top: Math.min(end, window.scrollY + pixels), behavior: 'instant'}); }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    let distance = 0;
    frame = requestAnimationFrame(tick);
    const interact = (event: Event) => {
      if (event.type === 'click' && event.target instanceof Element && !event.target.closest('a,button,input,textarea,select,summary')) return;
      stop();
    };
    const events = ['wheel', 'touchmove', 'keydown', 'click', 'focusin'];
    events.forEach(name => window.addEventListener(name, interact, {passive: true}));
    return () => { stop(); events.forEach(name => window.removeEventListener(name, interact)); };
  }, [opened, reduced]);

  function reveal() {
    openingRef.current = false;
    setOpening(false);
    setOpened(true);
  }

  function replay() {
    window.scrollTo({top: 0, behavior: 'instant'});
    setReady(false);
    openingRef.current = false;
    setOpening(false);
    setOpened(false);
    setStarted(false);
  }

  function startInvitation() {
    const player = audio.current;
    if (player && !musicMuted.current) {
      player.muted = false;
      player.volume = 0.35;
      void player.play().catch(() => setMusicError(true));
    }
    if (!reduced) setConfetti(true);
    setStarted(true);
    if (reduced) requestAnimationFrame(() => entrance.current?.querySelector('.envelope-chapter')?.scrollIntoView({behavior: 'instant'}));
  }

  function fadeMusic() {
    const player = audio.current;
    if (!player) return;
    setPlaying(true);
    setMusicError(false);
    
    player.muted = false;
    player.volume = 0.35;
  }

  function toggleMusic() {
    const player = audio.current;
    if (!player) return;
    setMusicError(false);
    if (!player.paused) {
      musicMuted.current = true;
      
      player.pause();
      return;
    }
    musicMuted.current = false;
    player.muted = false;
      player.volume = 0.35;
    void player.play().catch(() => setMusicError(true));
  }

  return <main className="experience">
    {!opened && <div className="persistent-floral-frame" aria-hidden="true" style={{opacity:opening?0:1,transition:reduced?'none':'opacity 900ms ease'}}>
    <motion.img className="intro-floral intro-floral-left" src="/assets/florals/champagne-top-left.png" alt="" aria-hidden="true" initial={reduced ? false : {opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:1.8}} onError={e=>{e.currentTarget.style.visibility='hidden';}}/>
    <motion.img className="intro-floral intro-floral-right" src="/assets/florals/champagne-bottom-right.png" alt="" aria-hidden="true" initial={reduced ? false : {opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:1.8,delay:reduced?0:.25}} onError={e=>{e.currentTarget.style.visibility='hidden';}}/>
    </div>}
    {!reduced && <div className="falling-petals" aria-hidden="true">{Array.from({length:16},(_,i)=><span key={i} style={{left:`${(i*37+9)%100}%`,width:`${10+i%5*3}px`,height:`${15+i%5*3}px`,animationDuration:`${13+i%7*2}s`,animationDelay:`-${i*2.7}s`,backgroundColor:['#f5e9da','#e8d5bf','#fff8ef','#dfcbb6'][i%4]}}/>)}</div>}
    {confetti && <div className="wedding-confetti" aria-hidden="true">
      {Array.from({length: 72}, (_, i) => <span key={i} style={{
        left: ((i * 37 + 11) % 100) + '%',
        backgroundColor: ['#c8a45b','#f8e5b2','#fffaf0','#d9aaa0','#a98039'][i % 5],
        width: 5 + i % 5,
        height: 7 + i % 8,
        borderRadius: i % 3 === 0 ? '50%' : '2px',
        animationDelay: (i % 12) * 0.075 + 's',
        animationDuration: (2.7 + (i % 9) * 0.13) + 's',
      }}/>)}
    </div>}
    {wedding.music && <>
      <audio ref={audio} src={wedding.music} loop preload="auto"
        onPlay={fadeMusic} onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setMusicError(true); }}/>
      <button className="music quiet" onClick={toggleMusic} aria-label={playing ? 'Mute background music' : 'Play background music'} aria-pressed={playing}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9z"/>{playing ? <><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/></> : <path d="m16 9 5 6m0-6-5 6"/>}</svg>
      </button>
      {musicError && <p className="music-error" role="status">Music is unavailable. Please try again.</p>}
    </>}
    {opened && <nav className="floating-guest-actions" aria-label="Wedding guest actions">
      <a href="#rsvp" onClick={event => {
        event.preventDefault();
        document.getElementById('rsvp')?.scrollIntoView({behavior: reduced ? 'instant' : 'smooth', block: 'start'});
        document.getElementById('rsvp-title')?.focus({preventScroll: true});
      }}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></svg><span>RSVP</span></a>
      <a href={wedding.directions} target="_blank" rel="noreferrer" aria-label="Get directions to the wedding venue"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 10 10-10 10L2 12zM8 15v-5h8m-3-3 3 3-3 3"/></svg><span>Directions</span></a>
    </nav>}
    {opened && <details className="calendar-picker">
      <summary className="floating-calendar" aria-label="Add wedding day to calendar" title="Add wedding day to calendar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-9 3v5m-2.5-2.5h5"/></svg></summary>
      <div className="calendar-options">
        <p>Add to your calendar</p>
        <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Flois%20%26%20%C3%85ge%20Wedding&amp;dates=20270109%2F20270110&amp;location=Glee%20Hotel%2C%20Nairobi%2C%20Kenya&amp;details=Ceremony%20time%20to%20be%20confirmed." target="_blank" rel="noreferrer">Google Calendar</a>
        <a href="https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&amp;rru=addevent&amp;subject=Flois%20%26%20%C3%85ge%20Wedding&amp;startdt=2027-01-09&amp;enddt=2027-01-10&amp;allday=true&amp;location=Glee%20Hotel%2C%20Nairobi%2C%20Kenya&amp;body=Ceremony%20time%20to%20be%20confirmed." target="_blank" rel="noreferrer">Outlook Calendar</a>
        <a href="/flois-and-age-wedding.ics">Apple / device calendar <small>Calendar file import if required</small></a>
        <button type="button" onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}>Close</button>
      </div>
    </details>}
    {!opened ? <section className={`entrance${reduced ? ' is-reduced' : ''}`} ref={entrance} aria-label="Wedding introduction">
      <div className="pinned-scenes">
        <div className="scene intro-chapter">
          <OpeningTitle automatic={started && !manualIntro && !reduced} onStart={started ? undefined : startInvitation}/>
        </div>
        <div className="scene names-chapter" aria-hidden="true" inert>
          <img className="chapter-ornament" src={asset('ornaments/gold-divider.png')} alt="" width="220" height="70"/>
          <p className="chapter-line">Together with<br/>their families</p>
        </div>
        <div className="scene names-chapter" aria-hidden="true" inert>
          <p className="eyebrow">With love and joy</p>
          <h2 className="intro-names">{wedding.names}</h2>
        </div>
        <div className="scene names-chapter" aria-hidden="true" inert>
          <p className="chapter-line">Invite you to share<br/>in their wedding day</p>
          <p className="eyebrow">{wedding.dateLabel}</p>
        </div>
        <div className="scene envelope-chapter" aria-hidden="true" inert>
          <p className="eyebrow">An invitation, with love</p>
          <Envelope ready={ready} reduced={Boolean(reduced)} onOpening={() => {
            automaticScroll.current?.kill();
            openingRef.current = true;
            setOpening(true);
          }} onComplete={reveal}/>
        </div>

      </div>
    </section> : <motion.section className="reveal" initial={{opacity: 0}} animate={{opacity: 1}}
      transition={{duration: reduced ? 0 : 1.6}}>
      <article className="invitation" aria-labelledby="invitation-title">
        <div className="invitation-copy">
          <p className="eyebrow">Together with their families</p>
          <h1 ref={heading} id="invitation-title" tabIndex={-1}>{wedding.names}</h1>
          <p className="invitation-welcome">Joyfully invite you<br/>to celebrate their wedding</p>
          <img className="invitation-divider" src={asset('ornaments/gold-divider.png')} alt="" width="200" height="60"/>
          <p className="date">Saturday, 9 January</p>
          <p className="year">2027</p>
          <p className="venue">{wedding.venue}</p>
        </div>
      </article>
      <Countdown/>

      <p className="scroll-cue">A new chapter awaits<span aria-hidden="true">⌄</span></p>
      <OurStory/>
      <EventDetails/>
      <Rsvp/>
      <footer className="thank-you">
        <img src={asset('ornaments/gold-hearts.png')} alt="" loading="lazy" width="90" height="70"/>
        <p className="eyebrow">With love</p>
        <p className="signature">{wedding.names}</p>
        <button className="quiet" onClick={replay}>Replay invitation</button>
      </footer>
    </motion.section>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{(window.location.pathname === '/admin' || (import.meta.env.DEV && window.location.pathname === '/qa/admin.html')) ? <Suspense fallback={<p className="section-intro">Opening dashboard…</p>}><Admin/></Suspense> : <App/>}</StrictMode>);
