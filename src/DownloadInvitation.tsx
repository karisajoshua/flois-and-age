import {useState} from 'react';
export function DownloadInvitation({guestNames = '', className = 'quiet'}: {guestNames?: string; className?: string}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!guestNames) return <a className={className} href="/assets/invitations/flois-and-age-invitation.pdf" download="Flois-and-Age-Invitation.pdf">Download invitation PDF</a>;
  async function download() {
    setBusy(true); setError('');
    try {
      const [{createInvitationPdf}, mark, font] = await Promise.all([
        import('../shared/invitation-pdf.mjs'), fetch('/assets/branding/monogram-fa.png'), fetch('/assets/fonts/DejaVuSerif.ttf'),
      ]);
      if (!mark.ok || !font.ok) throw new Error('Invitation artwork is temporarily unavailable. Please try again.');
      const bytes = await createInvitationPdf({emblem: new Uint8Array(await mark.arrayBuffer()), font: new Uint8Array(await font.arrayBuffer()), guestNames});
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/pdf'}));
      const link = document.createElement('a'); link.href = url; link.download = 'Flois-and-Age-Invitation.pdf'; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (reason) {setError(reason instanceof Error ? reason.message : 'Please try the download again.');}
    finally {setBusy(false);}
  }
  return <span className="pdf-download"><button className={className} onClick={() => void download()} disabled={busy}>{busy ? 'Preparing PDF…' : 'Download invitation PDF'}</button>{error && <span className="download-error" role="alert">{error}</span>}</span>;
}
