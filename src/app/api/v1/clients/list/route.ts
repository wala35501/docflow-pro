import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUser, unauthorized } from '@/lib/auth-server';

const RETENTION_DAYS = 30;

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        if (!user) return unauthorized();

        // Suppression definitive des clients archives depuis plus de 30 jours (uniquement ceux de ce studio)
        const limit = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
        const { error: purgeError } = await supabaseAdmin
            .from('clients')
            .delete()
            .eq('owner_id', user.id)
            .lt('archived_at', limit);

        if (purgeError) {
            console.error('Purge error:', purgeError.message);
        }

        const { data, error } = await supabaseAdmin
            .from('clients')
            .select('id, name, email, upload_token, created_at, archived_at')
            .eq('owner_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, clients: data }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de la recuperation des clients';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
