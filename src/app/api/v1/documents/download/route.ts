import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function safeName(name: string): string {
    const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'documento';
    return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

export async function GET(request: Request) {
    try {
        const id = new URL(request.url).searchParams.get('id') || '';

        if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) {
            return NextResponse.json({ error: 'Identificativo documento non valido' }, { status: 400 });
        }

        const { data: doc, error } = await supabaseAdmin
            .from('documents')
            .select('storage_path, suggested_file_name')
            .eq('id', id)
            .single();

        if (error || !doc || !doc.storage_path) {
            return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 });
        }

        const { data: blob, error: downloadError } = await supabaseAdmin.storage
            .from('documents')
            .download(doc.storage_path);

        if (downloadError || !blob) {
            console.error('Erreur download Storage :', downloadError);
            return NextResponse.json({ error: 'File non trovato nel coffre-fort' }, { status: 404 });
        }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fileName = safeName(doc.suggested_file_name || 'documento.pdf');

        return new Response(bytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(bytes.length),
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur lors du telechargement';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
