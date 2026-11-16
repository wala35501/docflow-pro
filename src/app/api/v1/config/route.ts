import { NextResponse } from 'next/server';

// Cles publiques necessaires au navigateur pour la connexion (la cle "anon" est faite pour etre publique)
export async function GET(request: Request) {
    // Lire un en-tete rend la route dynamique : les valeurs viennent du serveur en marche, pas du build
    const host = request.headers.get('host') || '';

    return NextResponse.json(
        {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
            host,
        },
        { headers: { 'Cache-Control': 'no-store' } }
    );
}
