import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface AuthUser {
    id: string;
    email: string | undefined;
}

// Verifie le jeton envoye par le navigateur (Authorization: Bearer ...) et renvoie l'utilisateur
export async function requireUser(request: Request): Promise<AuthUser | null> {
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;

    return { id: data.user.id, email: data.user.email };
}

export function unauthorized() {
    return NextResponse.json({ error: 'Accesso non autorizzato. Effettua il login.' }, { status: 401 });
}
