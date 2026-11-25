import {useEffect, useRef, useState, type FormEvent} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {invitationToken, validateRsvp} from '../shared/rsvp.mjs';

type SavedResponse = {name: string; email: string; attending: boolean; dietary: string; guestCount: number};
type Invitation = {guestName: string; response: SavedResponse | null};
type Confirmation = {saved: true; attending: boolean; guestCount: number};

export function Rsvp() {
  const reduced = useReducedMotion();
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [code, setCode] = useState(() => invitationToken(window.location.href));
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState('');
  const [dietary, setDietary] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const detailsHeading = useRef<HTMLHeadingElement>(null);

  async function checkAvailability() {
    controller.current?.abort();
    const pending = new AbortController();
    controller.current = pending;
    const timeout = window.setTimeout(() => pending.abort(), 10000);
    setAvailability('loading');
    try {
      const response = await fetch('/api/rsvp', {cache: 'no-store', signal: pending.signal});
      const body = await response.json();
      if (mounted.current && controller.current === pending) setAvailability(response.ok && body.available === true ? 'ready' : 'unavailable');
    } catch { if (mounted.current && controller.current === pending) setAvailability('unavailable'); }
    finally { window.clearTimeout(timeout); }
  }

  useEffect(() => {
    mounted.current = true;
    void checkAvailability();
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  useEffect(() => { if (confirmation) confirmationHeading.current?.focus({preventScroll: true}); }, [confirmation]);
  useEffect(() => { if (invitation && !confirmation) detailsHeading.current?.focus({preventScroll: true}); }, [invitation, confirmation]);

  async function send(body: Record<string, unknown>) {
    controller.current?.abort();
    const pending = new AbortController();
    controller.current = pending;
    const timeout = window.setTimeout(() => pending.abort(), 12000);
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
        signal: pending.signal, cache: 'no-store',
      });
      const result = await response.json().catch(() => { throw new Error('RSVP is temporarily unavailable. Your response has not been sent.'); });
      if (!response.ok) throw new Error(result.error || 'Your response has not been sent. Please try again.');
      return result;
    } catch (reason) {
      if (pending.signal.aborted) throw new Error('This is taking longer than expected. Please try again.');
      throw reason;
    } finally { window.clearTimeout(timeout); }
  }

  async function findInvitation(event: FormEvent) {
    event.preventDefault();
    const selectedToken = invitationToken(code);
    if (!selectedToken) { setError('Please paste the personal invitation link or code provided by the couple.'); return; }
    setBusy(true); setError('');
    try {
      const found: Invitation = await send({action: 'lookup', token: selectedToken});
      if (typeof found.guestName !== 'string') throw new Error('We could not open your invitation. Please try again.');
      setToken(selectedToken); setInvitation(found);
      setName(found.response?.name || found.guestName);
      setEmail(found.response?.email || '');
      setAttending(found.response ? found.response.attending ? 'yes' : 'no' : '');
      setDietary(found.response?.dietary || '');
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'We could not open your invitation. Please try again.');
    } finally { if (mounted.current) setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const checked = validateRsvp({action: 'submit', token, name, email, attending: attending === 'yes' ? true : attending === 'no' ? false : undefined, dietary});
    if (!checked.ok) { setError(checked.error); return; }
    setBusy(true); setError('');
    try {
      const saved = await send({action: 'submit', ...checked.value});
      if (saved.saved !== true || saved.guestCount !== (checked.value.attending ? 1 : 0)) throw new Error('We could not confirm your response. Please try again.');
      setConfirmation(saved);
      setInvitation(current => current ? {...current, response: {...checked.value, guestCount: saved.guestCount}} : current);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Your response has not been sent. Please try again.');
    } finally { if (mounted.current) setBusy(false); }
  }

  return <motion.section className="detail-sheet rsvp-sheet" id="rsvp" aria-labelledby="rsvp-title" tabIndex={-1}
    initial={reduced ? false : {opacity: 0, y: 16}} whileInView={{opacity: 1, y: 0}}
    viewport={{once: true, amount: 0.1}} transition={{duration: reduced ? 0 : 1.1}}>
    <p className="eyebrow">Your place at our celebration</p><h2 id="rsvp-title" tabIndex={-1}>Kindly reply</h2>
    <p className="section-intro">We would love to celebrate with you. Each personal invitation reserves a place for <strong>one named guest</strong>.</p>
    {availability === 'loading' && <p className="rsvp-notice" role="status">Opening RSVP…</p>}
    {availability === 'unavailable' && <div className="rsvp-notice" role="status">
      <p>RSVP is being prepared. Please check back for your personal invitation link.</p>
      <button className="quiet" onClick={() => void checkAvailability()}>Check again</button>
    </div>}
    {availability === 'ready' && !invitation && <form className="rsvp-form" onSubmit={findInvitation} aria-busy={busy}>
      <label htmlFor="invitation-code">Personal invitation link or code</label>
      <p className="field-help" id="invitation-code-help">Use the link or code sent to you by the couple. Please keep it private.</p>
      <input id="invitation-code" name="invitation-code" value={code} onChange={event => setCode(event.target.value)} required maxLength={512}
        autoCapitalize="none" autoComplete="off" spellCheck={false} aria-describedby="invitation-code-help" disabled={busy}/>
      <button className="primary" disabled={busy}>{busy ? 'Opening your invitation…' : 'Continue to RSVP'}</button>
    </form>}
    {availability === 'ready' && invitation && confirmation && <div className="rsvp-confirmation" role="status">
      <span className="confirmation-mark" aria-hidden="true">✓</span>
      <h3 ref={confirmationHeading} tabIndex={-1}>{confirmation.attending ? 'Your place is confirmed' : 'Thank you for letting us know'}</h3>
      <p>{confirmation.attending ? `We look forward to celebrating with you, ${name}. Your response is saved for one guest.` : `Your response has been saved, ${name}. We’ll miss celebrating with you.`}</p>
      <button className="quiet" onClick={() => setConfirmation(null)}>Update my response</button>
    </div>}
    {availability === 'ready' && invitation && !confirmation && <form className="rsvp-form" onSubmit={submit} aria-busy={busy}>
      <h3 ref={detailsHeading} tabIndex={-1}>An invitation for {invitation.guestName}</h3>
      <p className="rsvp-allocation">One invitation · one guest · no additional guests</p>
      {invitation.response && <p className="saved-response">Your {invitation.response.attending ? 'acceptance' : 'decline'} is saved. You may update it below.</p>}
      <fieldset disabled={busy}>
        <legend>Will you be joining us?</legend>
        <label className="attendance-choice"><input type="radio" name="attendance" value="yes" checked={attending === 'yes'} onChange={() => setAttending('yes')} required/>Joyfully accepts</label>
        <label className="attendance-choice"><input type="radio" name="attendance" value="no" checked={attending === 'no'} onChange={() => setAttending('no')} required/>Regretfully declines</label>
      </fieldset>
      <label htmlFor="rsvp-name">Your full name</label>
      <input id="rsvp-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy}/>
      <label htmlFor="rsvp-email">Email address</label>
      <input id="rsvp-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/>
      {attending === 'yes' && <><label htmlFor="rsvp-dietary">Dietary requests <span className="optional">(optional)</span></label>
        <textarea id="rsvp-dietary" name="dietary" rows={3} maxLength={500} value={dietary} onChange={event => setDietary(event.target.value)} disabled={busy}/></>}
      <p className="field-help">Your response is shared with the wedding organisers to plan attendance and catering.</p>
      <button className="primary" disabled={busy}>{busy ? 'Saving your response…' : invitation.response ? 'Save updated response' : 'Send my RSVP'}</button>
      <button className="quiet" type="button" disabled={busy} onClick={() => {setInvitation(null); setConfirmation(null); setCode(''); setToken(''); setError('');}}>Use another invitation</button>
    </form>}
    {error && <p className="rsvp-error" role="alert">{error}</p>}
  </motion.section>;
}
