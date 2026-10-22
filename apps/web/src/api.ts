export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {method, headers: body === undefined ? {'X-Evalot-Request':'1'} : {'Content-Type': 'application/json','X-Evalot-Request':'1'}, body: body === undefined ? undefined : JSON.stringify(body)});
  if(res.status===204)return undefined as T;
  const data = await res.json();
  if(res.status===401 && !path.startsWith('/auth'))window.dispatchEvent(new Event('evalot:session-expired'));
  if (!res.ok) throw new Error(data.error ?? 'Unable to complete request.');
  return data;
}
