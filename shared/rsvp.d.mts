export const INVITATION_TOKEN_PATTERN: RegExp;
export function invitationToken(value: string): string;
export type RsvpResponse = {token: string; name: string; email: string; attending: boolean; dietary: string};
export function validateRsvp(value: unknown): {ok: true; value: RsvpResponse} | {ok: false; error: string};
