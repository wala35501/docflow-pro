import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 30;

export async function GET() {
    try {
        // Suppression definitive des clients archives depuis plus de 30 jours
        const limit = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
        const { error: purgeError } = await supabaseAdmin
            .from('clients')
            .delete()
            .lt('archived_at', limit);

        if (purgeError) {
            console.error('Purge error:', purgeError.message);
        }

        const { data, error } = await supabaseAdmin
            .from('clients')
            .select('id, name, email, upload_token, created_at, archived_at')
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