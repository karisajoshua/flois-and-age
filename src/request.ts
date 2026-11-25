export async function requestJson(path: string, body?: unknown, options: {signal?: AbortSignal} = {}) {
  const pending = new AbortController();
  const abort = () => pending.abort();
  options.signal?.addEventListener('abort', abort, {once: true});
  if (options.signal?.aborted) pending.abort();
  const timeout = window.setTimeout(abort, 15000);
  try {
    const response = await fetch(path, {method: body === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'same-origin', signal: pending.signal,
      ...(body === undefined ? {} : {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})});
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'Please try again.'), {status: response.status});
    return data;
  } catch (error) {
    if (pending.signal.aborted) throw new Error('This is taking longer than expected. Please try again.');
    throw error instanceof Error ? error : new Error('Please check your connection and try again.');
  } finally { window.clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}
