import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PDFDocument, PDFName, PDFDict} from 'pdf-lib';
import {createInvitationPdf, invitationUrl} from '../shared/invitation-pdf.mjs';

test('invitation is one A5 page with embedded artwork/font and the exact clickable wedding URL', async () => {
  const bytes = await createInvitationPdf({emblem: readFileSync(new URL('../public/assets/branding/monogram-fa.png', import.meta.url)), font: readFileSync(new URL('../public/assets/fonts/DejaVuSerif.ttf', import.meta.url)), guestNames: 'Demo Guest & Demo Partner'});
  const doc = await PDFDocument.load(bytes); assert.equal(doc.getPageCount(), 1); assert.equal(doc.getPage(0).getWidth(), 420);
  const annotation = doc.getPage(0).node.Annots().lookup(0, PDFDict);
  assert.equal(annotation.lookup(PDFName.of('A'), PDFDict).lookup(PDFName.of('URI')).decodeText(), invitationUrl);
  assert.equal(invitationUrl, 'https://flois-and-age.vercel.app/'); assert.match(doc.getTitle(), /Flois & Åge/);
});
