import {useEffect, useRef, useState, type FormEvent} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import {validateRsvp, type RsvpResponse} from '../shared/rsvp.mjs';
import {requestJson} from './request';

type Confirmation = {saved: true; attending: boolean; guestCount: number};
const empty: RsvpResponse = {name: '', partnerName: '', email: '', attending: true, dietary: '', song: ''};
export function Rsvp() {
  const reduced = useReducedMotion();
  const [availability, setAvailability] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [form, setForm] = useState(empty);
  const [couple, setCouple] = useState(false);
  const [attendance, setAttendance] = useState('');
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const thankYou = useRef<HTMLDialogElement>(null);
  const [showThanks, setShowThanks] = useState(false);
  useEffect(() => { if (showThanks && !thankYou.current?.open) thankYou.current?.showModal(); }, [showThanks]);
  const confirmedHeading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const update = (key: keyof RsvpResponse, value: string) => setForm(previous => ({...previous, [key]: value}));
  async function load(signal?: AbortSignal) {
    setAvailability('loading');
    try {
      const result = await requestJson('/api/rsvp', undefined, {signal});
      if (!mounted.current || signal?.aborted) return;
      setAvailability(result.available ? 'ready' : 'unavailable');
      if (result.response) {
        setForm({name: result.response.name, partnerName: result.response.partnerName, email: result.response.email, attending: result.response.attending, dietary: result.response.dietary, song: result.response.song}); setCouple(Boolean(result.response.partnerName));
        setAttendance(result.response.attending ? 'yes' : 'no'); setExisting(true);
      }
    } catch { if (mounted.current && !signal?.aborted) setAvailability('unavailable'); }
  }
  useEffect(() => {
    mounted.current = true; const controller = new AbortController(); void load(controller.signal);
    return () => {mounted.current = false; controller.abort();};
  }, []);
  useEffect(() => { if (confirmation) confirmedHeading.current?.focus({preventScroll: true}); }, [confirmation]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (couple && !form.partnerName.trim()) {setError('Please add your partner’s full name, or untick the couple option.'); return;}
    const checked = validateRsvp({action: 'submit', ...form, partnerName: couple ? form.partnerName : '', attending: attendance === 'yes' ? true : attendance === 'no' ? false : undefined});
    if (!checked.ok) {setError(checked.error); return;}
    setBusy(true);
    try {
      const saved = await requestJson('/api/rsvp', {action: 'submit', ...checked.value});
      if (saved.saved !== true || typeof saved.guestCount !== 'number') throw new Error('Your response could not be confirmed. Please try again.');
      if (mounted.current) {setConfirmation(saved); setExisting(true); setShowThanks(true);}
    } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <motion.section id="rsvp" className="detail-sheet rsvp-sheet" aria-labelledby="rsvp-title"
    initial={reduced ? false : {opacity: 0}} whileInView={{opacity: 1}} viewport={{once: true, amount: .12}} transition={{duration: reduced ? 0 : 1.2}}>
    <p className="eyebrow">A place in our celebration</p>
    <h2 id="rsvp-title" tabIndex={-1}>Will you join us?</h2>
    <p className="section-intro">We would love to celebrate with you.<br/>Reply for yourself, or add your partner’s name if you are coming as a couple.</p>
    {confirmation ? <div className="rsvp-confirmation" role="status">
      <span className="confirmation-mark" aria-hidden="true">✓</span>
      <h3 ref={confirmedHeading} tabIndex={-1}>{confirmation.attending ? 'We can’t wait to celebrate with you' : 'Thank you for letting us know'}</h3>
      <p>{form.name}{couple && form.partnerName ? ` & ${form.partnerName}` : ''}</p>
      <p>{confirmation.attending ? `${confirmation.guestCount === 2 ? 'Two places are' : 'One place is'} confirmed for our wedding day.` : 'We’ll miss you and appreciate your warm wishes.'}</p>
      <button className="quiet" onClick={() => {setConfirmation(null); setError('');}}>Edit my response</button>
    </div> : <form className="rsvp-form" onSubmit={submit} aria-busy={busy}>
      {existing && <p className="saved-response">Your saved response is below. You can update it here.</p>}
      <label htmlFor="guest-name">Your full name</label>
      <input id="guest-name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={e => update('name', e.target.value)}/>
      <label className="couple-choice"><input type="checkbox" checked={couple} onChange={e => setCouple(e.target.checked)}/>We are responding as a couple</label>
      {couple && <div className="partner-field"><label htmlFor="partner-name">Your partner’s full name</label><input id="partner-name" autoComplete="off" required minLength={2} maxLength={100} value={form.partnerName} onChange={e => update('partnerName', e.target.value)}/><p className="field-help">One additional name. This response covers both of you.</p></div>}
      <label htmlFor="guest-email">Email address</label>
      <input id="guest-email" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={form.email} onChange={e => update('email', e.target.value)} aria-describedby="email-help"/>
      <p id="email-help" className="field-help">One email per response. Return on this browser to make changes.</p>
      <fieldset><legend>Will you be joining us?</legend>
        <label className="attendance-choice"><input type="radio" name="attendance" required value="yes" checked={attendance === 'yes'} onChange={e => setAttendance(e.target.value)}/>Yes, {couple ? 'we' : 'I'} will be there to celebrate!</label>
        <label className="attendance-choice"><input type="radio" name="attendance" required value="no" checked={attendance === 'no'} onChange={e => setAttendance(e.target.value)}/>No, but {couple ? 'we' : 'I'} will be celebrating from afar.</label>
      </fieldset>
      {attendance === 'yes' && <>
        <label htmlFor="guest-dietary">Dietary requirements <span>(optional)</span></label>
        <textarea id="guest-dietary" maxLength={500} value={form.dietary} onChange={e => update('dietary', e.target.value)} placeholder="Please let us know of any allergies or dietary needs."/>
        <label htmlFor="guest-song">Dance floor request <span>(optional)</span></label>
        <input id="guest-song" maxLength={200} value={form.song} onChange={e => update('song', e.target.value)} placeholder="What song will get you dancing?"/>
      </>}
      {availability !== 'ready' && <div className="rsvp-notice" role="status">{availability === 'loading' ? 'Preparing your RSVP…' : <>RSVP is temporarily unavailable. Your response has not been sent. <button type="button" className="quiet" onClick={() => void load()}>Try again</button></>}</div>}
      {error && <p className="rsvp-error" role="alert">{error}</p>}
      <button className="primary" type="submit" disabled={busy || availability !== 'ready'}>{busy ? 'Saving your response…' : existing ? 'Update my RSVP' : 'Send my RSVP'}</button>
    </form>}
    <dialog ref={thankYou} className="rsvp-thank-you" aria-labelledby="thanks-title" onClose={()=>setShowThanks(false)}>
      <img src="/assets/branding/monogram-fa.png" alt="" width="100" height="100"/>
      <h3 id="thanks-title">Thank you, {form.name}!</h3>
      <p>{confirmation?.attending ? "We are delighted to share this beautiful chapter of our lives with you. Thank you for confirming your attendance." : "Thank you for letting us know. We will miss you and appreciate your warm wishes."}</p>
      <p>With love and gratitude,<br/><strong>Flois & Åge</strong></p>
      <button type="button" className="primary" onClick={()=>thankYou.current?.close()}>Close</button>
    </dialog>
    <p className="rsvp-privacy">Your details are shared only with the wedding organisers to plan the celebration. This browser remembers your response securely.</p>
  </motion.section>;
}
