import { getBrowserClient } from '@/lib/supabase-browser';

// fetch qui ajoute automatiquement le jeton de connexion
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const supabase = await getBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
        window.location.href = '/login';
        throw new Error('Sessione scaduta. Effettua di nuovo il login.');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(url, { ...init, headers });
    if (res.status === 401) {
        window.location.href = '/login';
    }
    return res;
}

// Telecharge un fichier protege (PDF ou ZIP) : un simple lien ne peut pas envoyer le jeton
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
    const res = await authedFetch(url);

    if (!res.ok) {
        const info = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(info.error || 'Download non riuscito');
    }

    const disposition = res.headers.get('content-disposition') || '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const name = match ? match[1] : fallbackName;

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
