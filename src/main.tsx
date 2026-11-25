import {OurStory} from './OurStory';
import {DownloadInvitation} from './DownloadInvitation';
import {StrictMode, Suspense, lazy, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {motion, useReducedMotion} from 'motion/react';
import {asset, wedding, daysUntilWedding} from './wedding';
import {Envelope} from './Envelope';
import {Storybook} from './Storybook';
import {OpeningTitle} from './OpeningTitle';
import {EventDetails} from './EventDetails';
import {Rsvp} from './Rsvp';
import './styles.css';

const Admin = lazy(() => import('./Admin').then(module => ({default: module.Admin})));
gsap.registerPlugin(ScrollTrigger);

function Countdown() {
  const [days, setDays] = useState(() => daysUntilWedding());
  useEffect(() => {
    const id = window.setInterval(() => setDays(daysUntilWedding()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return <p className="countdown" aria-label={`${days} days until the wedding day`}>
    <strong>{days}</strong><span>{days === 1 ? 'day' : 'days'} until we celebrate</span>
  </p>;
}

function App() {
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const entrance = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const openingRef = useRef(false);
  const reduced = useReducedMotion();
  const [jumpToRsvp, setJumpToRsvp] = useState(false);

  useEffect(() => {
    if (opened) {
      window.scrollTo({top: 0, behavior: 'instant'});
      heading.current?.focus({preventScroll: true});
    }
  }, [opened]);

  useEffect(() => {
    if (!opened || !jumpToRsvp) return;
    document.getElementById('rsvp')?.scrollIntoView({behavior: 'instant', block: 'start'});
    document.getElementById('rsvp-title')?.focus({preventScroll: true});
    setJumpToRsvp(false);
  }, [opened, jumpToRsvp]);

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
        const update = (progress: number) => {
          const active = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
          gsap.set(scenes, {opacity: i => i === active ? 1 : 0});
          activate(active, active === scenes.length - 1);
        };
        const trigger = ScrollTrigger.create({
          trigger: el, start: 'top top', end: 'bottom bottom',
          onUpdate: self => update(self.progress),
        });
        update(trigger.progress);
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
    audio.current?.pause();
  }

  function toggleMusic() {
    const player = audio.current;
    if (!player) return;
    setMusicError(false);
    if (!player.paused) { player.pause(); return; }
    player.volume = 0.35;
    void player.play().catch(() => setMusicError(true));
  }

  return <main className="experience">
    {wedding.music && <>
      <audio ref={audio} src={wedding.music} loop preload="none"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setMusicError(true); }}/>
      <button className="music quiet" onClick={toggleMusic} aria-pressed={playing}>
        {playing ? 'Pause music' : 'Play music'}
      </button>
      {musicError && <p className="music-error" role="status">Music is unavailable. Please try again.</p>}
    </>}
    {!opened ? <section className="entrance" ref={entrance} aria-label="Wedding introduction">
      <div className="pinned-scenes">
        <div className="scene intro-chapter">
          <OpeningTitle/>
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
            openingRef.current = true;
            setOpening(true);
          }} onComplete={reveal}/>
        </div>
        <div className="intro-shortcuts">
          <a className="quiet" href={wedding.directions} target="_blank" rel="noreferrer">Directions</a>
          <button className="quiet" onClick={() => {setJumpToRsvp(true); reveal();}}>RSVP</button>
          <button className="quiet" onClick={reveal}>{opening ? 'Skip animation' : 'Skip introduction'}</button>
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
      <div className="invitation-actions">
        <a className="primary" href="#rsvp" onClick={event => {
          event.preventDefault();
          document.getElementById('rsvp')?.scrollIntoView({behavior: reduced ? 'instant' : 'smooth', block: 'start'});
          document.getElementById('rsvp-title')?.focus({preventScroll: true});
        }}>RSVP</a>
        <a className="primary" href={wedding.directions} target="_blank" rel="noreferrer">Get directions</a>
        <a className="quiet" href="/flois-and-age-wedding.ics" download>Add wedding day to calendar</a>
        <DownloadInvitation/>
      </div>
      <p className="scroll-cue">A new chapter awaits<span aria-hidden="true">⌄</span></p>
      <OurStory/>
      <Storybook/>
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
