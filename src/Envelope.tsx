import {useEffect, useRef, useState} from 'react';
import gsap from 'gsap';
import {asset, wedding} from './wedding';

type Props = {ready: boolean; reduced: boolean; onOpening: () => void; onComplete: () => void};

export function Envelope({ready, reduced, onOpening, onComplete}: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState('');

  useEffect(() => () => { timeline.current?.kill(); }, []);

  function open() {
    if (busy.current || !ready || !stage.current) return;
    busy.current = true;
    onOpening();
    if (reduced) { onComplete(); return; }
    setStatus('Opening the envelope…');
    const el = stage.current;
    const select = (selector: string) => el.querySelector(selector);
    timeline.current = gsap.timeline({defaults: {ease: 'sine.inOut'}, onComplete})
      .to(select('.seal'), {scale: 0.96, duration: 0.35})
      .to(select('.seal'), {opacity: 0, y: -12, duration: 0.85})
      .to(select('.envelope-flap'), {rotationX: -180, duration: 2.2}, '+=0.2')
      .set(select('.envelope-flap'), {zIndex: 0})
      // The card cannot become visible before the flap has completely opened.
      .set(select('.paper-card'), {visibility: 'visible'})
      .call(() => setStatus('Revealing your invitation…'))
      .to(select('.paper-card'), {y: 0, duration: 3.2}, '+=0.5')
      .to(select('.envelope-shell'), {opacity: 0, y: 28, duration: 1.6}, '+=0.65')
      .to(select('.paper-card'), {scale: 1.035, duration: 1.6}, '<')
      .to({}, {duration: 0.5});
  }

  return <div className="envelope-presentation" aria-busy={busy.current}>
    <div className="envelope-stage" ref={stage} data-opening={busy.current}>
      <div className="envelope-shell">
        <div className="envelope-back">
          <img src={asset('envelope/envelope-body.png')} alt="" width="1100" height="733"/>
        </div>
        <div className="envelope-flap">
          <img className="flap-front" src={asset('envelope/envelope-flap.png')} alt="" width="1100" height="550"/>
          <img className="flap-lining" src={asset('envelope/envelope-interior.png')} alt="" width="1100" height="733"/>
        </div>
        <img className="envelope-pocket" src={asset('envelope/envelope-foreground-pocket.png')} alt="" width="1100" height="550"/>
        <button className="seal" onClick={open} disabled={!ready || busy.current} aria-label="Open wedding invitation">
          <img src={asset('envelope/wax-seal.png')} alt="" width="300" height="300"/>
        </button>
      </div>
      <div className="paper-window" aria-hidden="true">
        <div className="paper-card">
          <img src={asset('stationery/invitation-card.png')} alt="" width="1000" height="1094"/>
          <div className="paper-copy">
            <p className="eyebrow">The wedding of</p>
            <h2>{wedding.names}</h2>
            <p>9 January 2027</p>
            <p>Glee Hotel, Nairobi</p>
          </div>
        </div>
      </div>
    </div>
    <p className="envelope-caption" role="status" aria-live="polite">{status || 'A little seal. A beautiful beginning.'}</p>
    <button className="primary intro-open" onClick={open} disabled={!ready || busy.current}>
      {busy.current ? 'Opening your invitation…' : 'Open invitation'}
    </button>
  </div>;
}
