import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUser, unauthorized } from '@/lib/auth-server';

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        if (!user) return unauthorized();

        // "!inner" + filtre : seuls les documents des clients de CE studio sont renvoyes
        const { data, error } = await supabaseAdmin
            .from('documents')
            .select(`
        id,
        batch_id,
        document_type,
        extracted_client_name,
        document_date,
        suggested_file_name,
        summary,
        created_at,
        clients!inner (
          name,
          email,
          owner_id
        )
      `)
            .eq('clients.owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, documents: data }, { status: 200 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors de la recuperation des documents';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
