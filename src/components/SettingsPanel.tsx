'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Monitor, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase-browser';
import { getStoredTheme, saveTheme, type ThemeChoice } from '@/lib/theme';

interface SettingsPanelProps {
    email: string;
    studioName: string;
    onStudioNameSaved: (name: string) => void;
}

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Chiaro', icon: Sun },
    { value: 'dark', label: 'Scuro', icon: Moon },
    { value: 'system', label: 'Come il dispositivo', icon: Monitor },
];

export default function SettingsPanel({ email, studioName, onStudioNameSaved }: SettingsPanelProps) {
    const router = useRouter();
    const [theme, setTheme] = useState<ThemeChoice>(() => getStoredTheme());
    const [name, setName] = useState(studioName);
    const [savingName, setSavingName] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    const chooseTheme = (value: ThemeChoice) => {
        setTheme(value);
        saveTheme(value);
    };

    const saveName = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingName(true);
        setMessage(null);
        try {
            const supabase = await getBrowserClient();
            const { error } = await supabase.auth.updateUser({ data: { studio_name: name.trim() } });
            if (error) throw error;
            onStudioNameSaved(name.trim());
            setMessage({ kind: 'ok', text: 'Nome dello studio salvato.' });
        } catch (err: unknown) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Salvataggio non riuscito.' });
        } finally {
            setSavingName(false);
        }
    };

    const savePassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingPassword(true);
        setMessage(null);
        try {
            const supabase = await getBrowserClient();
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setMessage({ kind: 'ok', text: 'Password aggiornata.' });
        } catch (err: unknown) {
            setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Aggiornamento non riuscito.' });
        } finally {
            setSavingPassword(false);
        }
    };

    const logout = async () => {
        try {
            const supabase = await getBrowserClient();
            await supabase.auth.signOut();
        } finally {
            router.replace('/login');
        }
    };

    const inputClass =
        'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900 bg-white';
    const cardClass = 'bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4';

    return (
        <div className="space-y-6 max-w-3xl">
            {message && (
                <div
                    className={`flex items-center space-x-2 text-sm p-3 rounded-xl border ${message.kind === 'ok'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                >
                    {message.kind === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className={cardClass}>
                <div>
                    <h2 className="text-base font-bold text-slate-900">Aspetto</h2>
                    <p className="text-xs text-slate-500 mt-1">Scegli il tema dello schermo. Viene ricordato su questo dispositivo.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {THEMES.map((item) => {
                        const Icon = item.icon;
                        const active = theme === item.value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => chooseTheme(item.value)}
                                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${active
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={cardClass}>
                <div>
                    <h2 className="text-base font-bold text-slate-900">Studio</h2>
                    <p className="text-xs text-slate-500 mt-1">Account: {email}</p>
                </div>
                <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome dello studio"
                        className={inputClass}
                    />
                    <button
                        type="submit"
                        disabled={savingName}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shrink-0 flex items-center justify-center"
                    >
                        {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
                    </button>
                </form>
            </div>

            <div className={cardClass}>
                <div>
                    <h2 className="text-base font-bold text-slate-900">Sicurezza</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {"Cambia la password di accesso. Se hai effettuato l'accesso con Google, usa il tuo account Google."}
                    </p>
                </div>
                <form onSubmit={savePassword} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="password"
                        minLength={6}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nuova password (almeno 6 caratteri)"
                        autoComplete="new-password"
                        className={inputClass}
                    />
                    <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-sm font-medium shrink-0 flex items-center justify-center"
                    >
                        {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiorna'}
                    </button>
                </form>
            </div>

            <div className={cardClass}>
                <div>
                    <h2 className="text-base font-bold text-slate-900">Archivio clienti</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {"I clienti archiviati restano recuperabili per 30 giorni, poi vengono eliminati definitivamente."}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={logout}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
                <LogOut className="w-4 h-4" />
                <span>Esci</span>
            </button>
        </div>
    );
}
