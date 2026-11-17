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

// Les erreurs Supabase sont des objets simples (pas des "Error") : on en extrait le message pour l'afficher
export function errorMessage(error: unknown, fallback: string): string {
    let message = '';
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        message = (error as { message: string }).message;
    }

    if (!message) return fallback;
    if (message.includes('owner_id')) {
        return 'Database non aggiornato: esegui lo script SQL "supabase/accounts.sql" nell\'SQL Editor di Supabase.';
    }
    return message;
}
