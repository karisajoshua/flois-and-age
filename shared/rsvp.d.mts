export type RsvpResponse = {name: string; partnerName: string; email: string; attending: boolean; dietary: string; song: string};
export function validateRsvp(value: unknown): {ok: true; value: RsvpResponse} | {ok: false; error: string};
