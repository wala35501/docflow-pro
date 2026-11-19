import Link from 'next/link';
import AboutPanel from '@/components/AboutPanel';

export default function InfoPage() {
    return (
        <main className="min-h-screen bg-slate-100 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        DocFlow<span className="text-blue-600">Studio</span>
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Ricezione e organizzazione dei documenti dei clienti per studi professionali
                    </p>
                </div>

                <AboutPanel />

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Link
                        href="/login"
                        className="text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
                    >
                        Accedi o crea un account
                    </Link>
                </div>

                <p className="text-center text-xs text-slate-500">
                    <Link href="/privacy" className="hover:underline">Informativa privacy</Link>
                </p>
            </div>
        </main>
    );
}
