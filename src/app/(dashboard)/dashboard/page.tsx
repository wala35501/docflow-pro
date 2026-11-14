'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Search, CheckCircle2, Building2, Loader2, UserPlus, X, Copy, Check } from 'lucide-react';

interface DocumentRecord {
    id: string;
    clientName: string;
    documentType: string;
    documentDate: string;
    fileName: string;
    summary: string;
    createdAt: string;
}

interface RawDocumentItem {
    id: string;
    document_type: string;
    extracted_client_name?: string;
    document_date?: string;
    suggested_file_name: string;
    summary: string;
    created_at: string;
    clients?: {
        name?: string;
        email?: string;
    };
}

export default function DashboardPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [submittingClient, setSubmittingClient] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchDocuments() {
            try {
                const res = await fetch('/api/v1/documents/list');
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Errore di caricamento');
                }

                const formattedDocs = data.documents.map((item: RawDocumentItem) => ({
                    id: item.id,
                    clientName: item.clients?.name || item.extracted_client_name || 'Cliente Sconosciuto',
                    documentType: item.document_type,
                    documentDate: item.document_date || 'N/D',
                    fileName: item.suggested_file_name,
                    summary: item.summary,
                    createdAt: item.created_at,
                }));

                setDocuments(formattedDocs);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Impossibile caricare i documenti';
                setError(msg);
            } finally {
                setLoading(false);
            }
        }

        fetchDocuments();
    }, []);

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName) return;

        setSubmittingClient(true);
        try {
            const res = await fetch('/api/v1/clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clientName, email: clientEmail }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Errore durante la creazione');

            const link = `${window.location.origin}/upload/${data.client.upload_token}`;
            setGeneratedLink(link);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Errore');
        } finally {
            setSubmittingClient(false);
        }
    };

    const copyToClipboard = (link: string) => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredDocuments = documents.filter(
        (doc) =>
            doc.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-slate-100 text-slate-900 p-6 sm:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <div className="flex items-center space-x-2 text-blue-600 font-semibold text-sm">
                            <Building2 className="w-5 h-5" />
                            <span>Studio Commerciale / Legale - Area Gestione</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                            Cruscotto dei documenti ricevuti
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => { setIsModalOpen(true); setGeneratedLink(null); setClientName(''); setClientEmail(''); }}
                            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Nuovo cliente &amp; Link di invio</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cerca per cliente, tipo di documento o nome file..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                    <th className="py-3 px-4">Cliente / Mittente</th>
                                    <th className="py-3 px-4">Tipo</th>
                                    <th className="py-3 px-4">Nome normalizzato (PDF)</th>
                                    <th className="py-3 px-4">Data documento</th>
                                    <th className="py-3 px-4">Riepilogo</th>
                                    <th className="py-3 px-4 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-500">
                                            <div className="flex justify-center items-center space-x-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                                <span>Caricamento dati da Supabase...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredDocuments.length > 0 ? (
                                    filteredDocuments.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-slate-900">
                                                {doc.clientName}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                                    {doc.documentType}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-blue-600 font-medium flex items-center space-x-1.5">
                                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-xs">{doc.fileName}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">{doc.documentDate}</td>
                                            <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{doc.summary}</td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => alert(`Download del file : ${doc.fileName}`)}
                                                    className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>PDF</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-500">
                                            {"Nessun documento trovato nell'archivio. Crea un cliente per ottenere il suo link di caricamento!"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-6 shadow-xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Aggiungi un nuovo cliente</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {"Genera un link di caricamento sicuro e unico che il tuo cliente potr\u00e0 utilizzare per trasmettere i documenti."}
                            </p>
                        </div>

                        {!generatedLink ? (
                            <form onSubmit={handleCreateClient} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {"Nome dell'azienda o del cliente *"}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Es: Studio Rossi S.R.L."
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email del cliente (opzionale)</label>
                                    <input
                                        type="email"
                                        placeholder="cliente@example.it"
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-900"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingClient}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex justify-center items-center"
                                >
                                    {submittingClient ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Genera link unico'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-xs text-green-800 space-y-1">
                                    <p className="font-bold flex items-center">
                                        <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                                        Cliente creato con successo!
                                    </p>
                                    <p className="truncate"><strong>Link per {clientName} :</strong></p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedLink}
                                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 select-all"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(generatedLink)}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        <span>{copied ? 'Copiato !' : 'Copia'}</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setGeneratedLink(null);
                                        setClientName('');
                                        setClientEmail('');
                                    }}
                                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors flex justify-center items-center space-x-1.5"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Aggiungi un altro cliente in sequenza...</span>
                                </button>

                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Termina e chiudi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}