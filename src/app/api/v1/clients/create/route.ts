import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { name, email } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Le nom du client est requis' }, { status: 400 });
        }

        // Generer un token unique securise
        const uploadToken = crypto.randomBytes(16).toString('hex');

        const { data, error } = await supabaseAdmin
            .from('clients')
            .insert({
                name,
                email: email || null,
                upload_token: uploadToken,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, client: data }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de la creation du client';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}