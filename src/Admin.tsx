import {useEffect, useState, type FormEvent} from 'react';
import {requestJson} from './request';
import {DownloadGuestList} from './DownloadGuestList';
import {responsesCsv} from '../shared/csv.mjs';
import type {Story, StoryPhoto} from './OurStory';

type Guest = {id: string; name: string; partnerName: string; email: string; attending: boolean; guestCount: number; dietary: string; song: string; updatedAt: string};
const blankStory: Story = {title: 'Our story', body: '', photos: [], published: false};
export function Admin() {
  const [state, setState] = useState<'loading' | 'login' | 'ready'>('loading');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [story, setStory] = useState<Story>(blankStory);
  const [tab, setTab] = useState<'guests' | 'story'>('guests');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  async function load() {
    try {
      const result = await requestJson('/api/admin');
      setGuests(result.responses); setStory(result.story || blankStory); setState('ready'); setError('');
    } catch (reason) {
      setState('login'); setGuests([]); setStory(blankStory);
      if ((reason as {status?: number}).status !== 401) setError(reason instanceof Error ? reason.message : 'Please try again.');
    }
  }
  useEffect(() => {void load();}, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {await requestJson('/api/admin', {action: 'login', password}); setPassword(''); setShowPassword(false); await load();}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Please try again.');}
    finally {setBusy(false);}
  }
  async function logout() {
    setBusy(true); setError('');
    try {await requestJson('/api/admin', {action: 'logout'}); setGuests([]); setStory(blankStory); setState('login'); setNotice('');}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Please try again.');}
    finally {setBusy(false);}
  }
  async function saveStory(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice(''); setError('');
    try {
      const result = await requestJson('/api/admin', {action: 'story', title: story.title, text: story.body, photos: story.photos.map(({path, caption}) => ({path, caption})), published: story.published});
      setStory(result.story); setNotice(story.published ? 'Your story and photos are now published on the invitation.' : 'Draft saved. Guests will see the welcome section until you publish.');
    } catch (reason) {setError(reason instanceof Error ? reason.message : 'Please try again.');}
    finally {setBusy(false);}
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3000000) throw new Error('Choose a JPG, PNG or WebP photo smaller than 3 MB.');
      const response = await fetch('/api/photo', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': file.type}, body: file});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Photo upload failed.');
      setStory(previous => ({...previous, photos: [...previous.photos, result.photo]}));
      setNotice('Photo added to this draft. Add a description, then save your story.');
    } catch (reason) {setError(reason instanceof Error ? reason.message : 'Please try again.');}
    finally {setBusy(false);}
  }
  function movePhoto(index: number, direction: number) {
    setStory(previous => {const photos = [...previous.photos]; [photos[index], photos[index + direction]] = [photos[index + direction], photos[index]]; return {...previous, photos};});
  }
  function photoCaption(index: number, caption: string) {setStory(previous => ({...previous, photos: previous.photos.map((photo, i) => i === index ? {...photo, caption} : photo)}));}
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([responsesCsv(guests)], {type: 'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href = url; link.download = 'Flois-and-Age-RSVPs.csv'; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const matches = guests.filter(guest => (filter === 'all' || guest.attending === (filter === 'yes')) && `${guest.name} ${guest.partnerName} ${guest.email}`.toLowerCase().includes(query.toLowerCase()));
  const lastPage = Math.max(0, Math.ceil(matches.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  const shown = matches.slice(currentPage * 20, currentPage * 20 + 20);
  const accepted = guests.filter(g => g.attending);
  return <main className="admin-shell">
    <header className="admin-header"><a href="/" aria-label="Open wedding invitation"><img src="/assets/optimized/branding/monogram-fa.webp" alt="F & Å" width="70" height="70"/></a><div><p className="eyebrow">Flois &amp; Åge</p><h1>Wedding dashboard</h1></div>{state === 'ready' && <button className="quiet" onClick={() => void logout()} disabled={busy}>Sign out</button>}</header>
    {state === 'loading' ? <p role="status">Opening your dashboard…</p> : state === 'login' ? <section className="admin-login"><p className="eyebrow">For the organisers</p><h2>A little behind the scenes</h2><p>Sign in to view replies, share your story and prepare the confirmed guest list.</p><form className="rsvp-form" onSubmit={login}><label htmlFor="admin-password">Organiser password</label><div className="admin-password-field"><input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/><button type="button" className="admin-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>{showPassword && <path d="m3 3 18 18"/>}</svg></button></div><button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></section> : <>
      <div className="dashboard-stats"><div><strong>{guests.length}</strong><span>Responses</span></div><div><strong>{accepted.reduce((n, g) => n + g.guestCount, 0)}</strong><span>Guests attending</span></div><div><strong>{accepted.filter(g => g.partnerName).length}</strong><span>Couples attending</span></div><div><strong>{guests.length - accepted.length}</strong><span>Declined responses</span></div></div>
      <nav className="dashboard-tabs" aria-label="Dashboard sections"><button className={tab === 'guests' ? 'primary' : 'quiet'} aria-current={tab === 'guests' ? 'page' : undefined} onClick={() => setTab('guests')}>Guest responses</button><button className={tab === 'story' ? 'primary' : 'quiet'} aria-current={tab === 'story' ? 'page' : undefined} onClick={() => setTab('story')}>Our story &amp; photos</button></nav>
      {tab === 'guests' ? <section className="dashboard-panel" aria-label="Guest responses">
        <div className="dashboard-toolbar"><h2>With love, from your guests</h2><button className="quiet" onClick={() => void load()}>Refresh responses</button><button className="quiet" onClick={exportCsv}>Download all responses CSV</button><DownloadGuestList guests={guests}/></div>
        <p className="field-help">Couples appear together. The guest total counts both names on accepted replies.</p>
        <div className="dashboard-filters"><label>Search names or email<input type="search" value={query} onChange={e => {setQuery(e.target.value); setPage(0);}}/></label><label>Attendance<select value={filter} onChange={e => {setFilter(e.target.value); setPage(0);}}><option value="all">All responses</option><option value="yes">Attending</option><option value="no">Declined</option></select></label></div>
        {guests.length === 0 ? <p className="dashboard-empty">Your guest list begins here. Replies will appear as soon as guests RSVP.</p> : matches.length === 0 ? <p className="dashboard-empty">No replies match your search.</p> : <div className="guest-table-wrap"><table className="guest-table"><caption className="sr-only">Guest names, replies and requests</caption><thead><tr><th scope="col">Guest name(s)</th><th scope="col">Reply</th><th scope="col">Requests</th></tr></thead><tbody>{shown.map(guest => <tr key={guest.id}><td><strong>{guest.name}</strong>{guest.partnerName && <span>&amp; {guest.partnerName}</span>}<a href={`mailto:${guest.email}`}>{guest.email}</a></td><td><span className={`reply-badge ${guest.attending ? 'accepted' : ''}`}>{guest.attending ? 'Attending' : 'Declined'}</span><span>{guest.guestCount} {guest.guestCount === 1 ? 'place' : 'places'}</span></td><td>{guest.dietary && <p><strong>Dietary:</strong> {guest.dietary}</p>}{guest.song && <p><strong>Song:</strong> {guest.song}</p>}{!guest.dietary && !guest.song && <span>None shared</span>}</td></tr>)}</tbody></table></div>}
        {matches.length > 0 && <div className="dashboard-pagination"><button className="quiet" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage * 20 + 1}–{Math.min((currentPage + 1) * 20, matches.length)} of {matches.length}</span><button className="quiet" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></div>}
      </section> : <section className="dashboard-panel story-editor"><h2>Your story, in your words</h2><p>Add the story you would like to share, and up to six of your own photographs. The first photo becomes the main portrait; the others form the gallery.</p>
        <form className="rsvp-form" onSubmit={saveStory}><label htmlFor="story-title">Section title</label><input id="story-title" value={story.title} onChange={e => setStory({...story, title: e.target.value})} required minLength={2} maxLength={100}/><label htmlFor="story-body">Your story</label><textarea id="story-body" rows={10} maxLength={4000} value={story.body} onChange={e => setStory({...story, body: e.target.value})} placeholder="Tell your story in your own words. Leave a blank line between paragraphs."/><p className="field-help">{story.body.length}/4000 characters. Only publish details you want your guests to see.</p>
          <div className="photo-editor-list">{story.photos.map((photo: StoryPhoto, i) => <article className="photo-editor-card" key={photo.path}><img src={photo.url} alt={photo.caption || 'Uploaded story photograph'} width="160" height="200"/><div><label htmlFor={`caption-${i}`}>Photo {i + 1} description</label><input id={`caption-${i}`} value={photo.caption} onChange={e => photoCaption(i, e.target.value)} required minLength={2} maxLength={150}/><div className="photo-editor-actions"><button type="button" className="quiet" disabled={i === 0 || busy} onClick={() => movePhoto(i, -1)}>Move earlier</button><button type="button" className="quiet" disabled={i === story.photos.length - 1 || busy} onClick={() => movePhoto(i, 1)}>Move later</button><button type="button" className="quiet" disabled={busy} onClick={() => setStory({...story, photos: story.photos.filter(p => p.path !== photo.path)})}>Remove</button></div></div></article>)}</div>
          <label htmlFor="story-photo">Add a photo ({story.photos.length}/6)</label><input id="story-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || story.photos.length >= 6} onChange={e => {void upload(e.target.files?.[0]); e.target.value = '';}}/><p className="field-help">JPG, PNG or WebP, up to 3 MB each. Portrait photographs work beautifully. Uploaded photos are added to your draft until you save.</p>
          <label className="couple-choice"><input type="checkbox" checked={story.published} onChange={e => setStory({...story, published: e.target.checked})}/>Publish this story and these photos on the invitation</label><button className="primary" disabled={busy}>{busy ? 'Saving…' : story.published ? 'Save & publish story' : 'Save draft'}</button>
        </form>
      </section>}
    </>}
    {error && <p className="rsvp-error" role="alert">{error}</p>}{notice && <p className="saved-response" role="status">{notice}</p>}
    <footer className="admin-footer"><a className="quiet" href="/" target="_blank" rel="noreferrer">View wedding invitation</a></footer>
  </main>;
}
