'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase-browser';

type Mode = 'login' | 'signup' | 'reset';

function translateError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('invalid login')) return 'Email o password non corretti.';
    if (m.includes('already registered')) return 'Esiste gi\u00e0 un account con questa email. Prova ad accedere.';
    if (m.includes('email not confirmed')) return 'Conferma prima la tua email: ti abbiamo inviato un messaggio.';
    if (m.includes('password should be')) return 'La password deve avere almeno 6 caratteri.';
    if (m.includes('rate limit')) return 'Troppi tentativi. Riprova tra qualche minuto.';
    return message;
}

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('login');
    const [studioName, setStudioName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    // Deja connecte : on va directement au tableau de bord
    useEffect(() => {
        async function check() {
            try {
                const supabase = await getBrowserClient();
                const { data } = await supabase.auth.getSession();
                if (data.session) router.replace('/dashboard');
            } catch {
                // la configuration sera signalee au moment du clic
            }
        }
        check();
    }, [router]);

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setInfo(null);
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        setInfo(null);

        try {
            const supabase = await getBrowserClient();

            if (mode === 'login') {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
                router.replace('/dashboard');
            } else if (mode === 'signup') {
                const { data, error: err } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { studio_name: studioName.trim() },
                        emailRedirectTo: `${window.location.origin}/dashboard`,
                    },
                });
                if (err) throw err;
                if (data.session) {
                    router.replace('/dashboard');
                } else {
                    setInfo('Account creato. Controlla la tua email e clicca sul link di conferma, poi accedi.');
                    setMode('login');
                }
            } else {
                const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/dashboard`,
                });
                if (err) throw err;
                setInfo('Ti abbiamo inviato un link per reimpostare la password.');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Si \u00e8 verificato un errore.';
            setError(translateError(message));
        } finally {
            setBusy(false);
        }
    };

    const handleGoogle = async () => {
        setError(null);
        try {
            const supabase = await getBrowserClient();
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/dashboard` },
            });
            if (err) throw err;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Accesso con Google non disponibile.';
            setError(translateError(message));
        }
    };

    const title = mode === 'login' ? 'Accedi al tuo studio' : mode === 'signup' ? 'Crea il tuo account' : 'Reimposta la password';

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        DocFlow<span className="text-blue-600">Studio</span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Area di gestione per il vostro studio professionale
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow-md rounded-xl border border-slate-200 space-y-6">
                    <h2 className="text-lg font-bold text-center">{title}</h2>

                    {info && (
                        <div className="flex items-start space-x-2 text-sm bg-green-50 text-green-800 border border-green-200 p-3 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{info}</span>
                        </div>
                    )}

                    {mode !== 'reset' && (
                        <>
                            <button
                                type="button"
                                onClick={handleGoogle}
                                className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
                                    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z" />
                                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                                </svg>
                                <span>Continua con Google</span>
                            </button>

                            <div className="flex items-center space-x-3 text-xs text-slate-400">
                                <div className="flex-1 border-t border-slate-200" />
                                <span>oppure con la tua email</span>
                                <div className="flex-1 border-t border-slate-200" />
                            </div>
                        </>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Nome dello studio
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Es: Studio Rossi & Associati"
                                    value={studioName}
                                    onChange={(e) => setStudioName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="nome@studio.it"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                                />
                            </div>
                        </div>

                        {mode !== 'reset' && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                        placeholder="Almeno 6 caratteri"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 bg-white"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : mode === 'login' ? (
                                'Accedi'
                            ) : mode === 'signup' ? (
                                'Crea account'
                            ) : (
                                'Invia link'
                            )}
                        </button>
                    </form>

                    <div className="text-center text-xs text-slate-600 space-y-2">
                        {mode === 'login' && (
                            <>
                                <p>
                                    Non hai un account?{' '}
                                    <button type="button" onClick={() => switchMode('signup')} className="text-blue-600 font-semibold hover:underline">
                                        Registrati
                                    </button>
                                </p>
                                <p>
                                    <button type="button" onClick={() => switchMode('reset')} className="text-slate-500 hover:underline">
                                        Password dimenticata?
                                    </button>
                                </p>
                            </>
                        )}
                        {mode !== 'login' && (
                            <p>
                                <button type="button" onClick={() => switchMode('login')} className="text-blue-600 font-semibold hover:underline">
                                    Torna al login
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-center text-xs text-slate-500 space-y-2">
                    <p>{"I tuoi clienti non hanno bisogno di un account: usano solo il loro link personale."}</p>
                    <p>
                        <Link href="/info" className="text-blue-600 font-semibold hover:underline">
                            Scopri a cosa serve DocFlowStudio e come funziona
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
