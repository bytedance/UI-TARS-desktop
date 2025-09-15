import { toast } from 'react-toastify';

export async function getRespErrorMessage(resp: Response) {
  try {
    if (resp.headers.get('content-type') === 'application/json') {
      const data = await resp.json();
      return data.error ?? data;
    }

    return await resp.text();
  } catch (e) {
    //ignore err
    return resp.statusText;
  }
}

export function handleErrorNotification(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  toast.error(message);
}
