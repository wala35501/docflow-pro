import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
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
        clients (
          name,
          email
        )
      `)
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