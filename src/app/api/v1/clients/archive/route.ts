import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUser, unauthorized, errorMessage } from '@/lib/auth-server';

export async function POST(req: Request) {
    try {
        const user = await requireUser(req);
        if (!user) return unauthorized();

        const body = await req.json();
        const ids: unknown = body.ids;
        const archive: boolean = body.archive !== false;

        if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== 'string')) {
            return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 });
        }

        if (archive) {
            const { error } = await supabaseAdmin
                .from('clients')
                .update({ archived_at: new Date().toISOString() })
                .eq('owner_id', user.id)
                .in('id', ids as string[])
                .is('archived_at', null);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from('clients')
                .update({ archived_at: null })
                .eq('owner_id', user.id)
                .in('id', ids as string[]);
            if (error) throw error;
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
        const message = errorMessage(error, 'Erreur archivage');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
