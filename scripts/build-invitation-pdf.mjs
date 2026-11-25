import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createInvitationPdf} from '../shared/invitation-pdf.mjs';
const bytes = await createInvitationPdf({emblem: await readFile(new URL('../public/assets/branding/monogram-fa.png', import.meta.url)), font: await readFile(new URL('../public/assets/fonts/DejaVuSerif.ttf', import.meta.url))});
await mkdir(new URL('../public/assets/invitations/', import.meta.url), {recursive: true});
await writeFile(new URL('../public/assets/invitations/flois-and-age-invitation.pdf', import.meta.url), bytes);
console.log('Generated the invitation PDF with its clickable link and QR code.');
