export const invitationUrl: string;
export function createInvitationPdf(input: {emblem: Uint8Array; font: Uint8Array; guestNames?: string}): Promise<Uint8Array>;
