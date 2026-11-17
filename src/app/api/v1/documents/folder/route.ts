import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUser, unauthorized, errorMessage } from '@/lib/auth-server';
import { buildZip, type ZipEntry } from '@/core/zip-builder';

function safeName(name: string, fallback: string): string {
    const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
    return cleaned || fallback;
}

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        if (!user) return unauthorized();

        const batch = new URL(request.url).searchParams.get('batch') || '';

        if (!/^[A-Za-z0-9_-]{6,64}$/.test(batch)) {
            return NextResponse.json({ error: 'Cartella non valida' }, { status: 400 });
        }

        const { data: rows, error } = await supabaseAdmin
            .from('documents')
            .select('client_id, suggested_file_name, storage_path, created_at, clients!inner(owner_id)')
            .eq('clients.owner_id', user.id)
            .eq('batch_id', batch)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Cartella vuota o non trovata' }, { status: 404 });
        }

        // Nom du client pour nommer le dossier
        let clientName = 'Cliente';
        const clientId = rows[0].client_id;
        if (clientId) {
            const { data: client } = await supabaseAdmin
                .from('clients')
                .select('name')
                .eq('id', clientId)
                .single();
            if (client && client.name) {
                clientName = String(client.name);
            }
        }

        // Telechargement des PDF du dossier
        const downloaded = await Promise.all(
            rows.map(async (row, index) => {
                if (!row.storage_path) return null;
                const { data: blob, error: downloadError } = await supabaseAdmin.storage
                    .from('documents')
                    .download(row.storage_path);
                if (downloadError || !blob) {
                    console.error('Erreur download Storage :', downloadError);
                    return null;
                }
                const data = new Uint8Array(await blob.arrayBuffer());
                const base = safeName(String(row.suggested_file_name || ''), `Documento_${index + 1}.pdf`);
                return { base, data };
            })
        );

        // Noms uniques dans le ZIP
        const used = new Map<string, number>();
        const entries: ZipEntry[] = [];
        for (const item of downloaded) {
            if (!item) continue;
            const withExt = item.base.toLowerCase().endsWith('.pdf') ? item.base : `${item.base}.pdf`;
            const count = used.get(withExt) || 0;
            used.set(withExt, count + 1);
            const name = count === 0 ? withExt : withExt.replace(/\.pdf$/i, `_${count + 1}.pdf`);
            entries.push({ name, data: item.data });
        }

        if (entries.length === 0) {
            return NextResponse.json({ error: 'Nessun file disponibile in questa cartella' }, { status: 404 });
        }

        const zipBytes = buildZip(entries);
        const stamp = new Date(rows[0].created_at).toISOString().slice(0, 10);
        const zipName = `Cartella_${safeName(clientName, 'Cliente')}_${stamp}.zip`;

        return new Response(zipBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipName}"`,
                'Content-Length': String(zipBytes.length),
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        const message = errorMessage(error, 'Erreur lors de la creation du dossier');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
