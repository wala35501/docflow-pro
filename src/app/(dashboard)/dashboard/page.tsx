'use client';

import { useState, useEffect } from 'react';
import {
    FileText, Download, Search, CheckCircle2, Building2, Loader2,
    UserPlus, X, Copy, Check, Archive, ArchiveRestore,
} from 'lucide-react';

const ARCHIVE_DAYS = 30;

type Tab = 'documents' | 'clients' | 'archived';

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

interface ClientRecord {
    id: string;
    name: string;
    email: string | null;
    upload_token: string;
    created_at: string;
    archived_at: string | null;
}

async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fallback ci-dessous
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

function buildLink(token: string): string {
    return `${window.location.origin}/upload/${token}`;
}

function daysLeft(archivedAt: string): number {
    const end = new Date(archivedAt).getTime() + ARCHIVE_DAYS * 86400000;
    return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('it-IT');
}

export default function DashboardPage() {
    const [tab, setTab] = useState<Tab>('documents');
    const [searchTerm, setSearchTerm] = useState('');

    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [clientsReload, setClientsReload] = useState(0);
    const [selected, setSelected] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [submittingClient, setSubmittingClient] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

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

    useEffect(() => {
        async function loadClients() {
            try {
                const res = await fetch('/api/v1/clients/list');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Errore di caricamento clienti');
                setClients(data.clients || []);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Impossibile caricare i clienti');
            } finally {
                setClientsLoading(false);
            }
        }

        loadClients();
    }, [clientsReload]);

    const fetchClients = () => setClientsReload((n) => n + 1);

    const changeTab = (next: Tab) => {
        setTab(next);
        setSelected([]);
        setSearchTerm('');
    };

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

            setGeneratedLink(buildLink(data.client.upload_token));
            fetchClients();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Errore');
        } finally {
            setSubmittingClient(false);
        }
    };

    const handleCopy = async (key: string, link: string) => {
        const ok = await copyText(link);
        if (ok) {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } else {
            alert('Copia automatica non disponibile. Seleziona il link e premi Ctrl+C.');
        }
    };

    const runBulk = async (ids: string[], archive: boolean) => {
        if (ids.length === 0) return;

        if (archive) {
            const ok = window.confirm(
                `Archiviare ${ids.length} cliente/i? Saranno eliminati definitivamente dopo ${ARCHIVE_DAYS} giorni, salvo ripristino.`
            );
            if (!ok) return;
        }

        setBusy(true);
        try {
            const res = await fetch('/api/v1/clients/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, archive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Operazione non riuscita');

            setSelected([]);
            fetchClients();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Errore');
        } finally {
            setBusy(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleAll = (list: ClientRecord[]) => {
        const ids = list.map((c) => c.id);
        const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
        setSelected(allSelected ? [] : ids);
    };

    const term = searchTerm.toLowerCase();

    const filteredDocuments = documents.filter(
        (doc) =>
            doc.clientName.toLowerCase().includes(term) ||
            doc.documentType.toLowerCase().includes(term) ||
            doc.fileName.toLowerCase().includes(term)
    );

    const matchClient = (c: ClientRecord) =>
        c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term);

    const activeClients = clients.filter((c) => !c.archived_at && matchClient(c));
    const archivedClients = clients.filter((c) => c.archived_at && matchClient(c));
    const activeCount = clients.filter((c) => !c.archived_at).length;
    const archivedCount = clients.filter((c) => c.archived_at).length;

    const renderClientsTable = (list: ClientRecord[], mode: 'active' | 'archived') => {
        const allSelected = list.length > 0 && list.every((c) => selected.includes(c.id));
        const selectedInList = list.filter((c) => selected.includes(c.id)).map((c) => c.id);
        const isActive = mode === 'active';

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <span className="text-sm text-slate-600">
                        {selectedInList.length} selezionati
                    </span>
                    <button
                        disabled={selectedInList.length === 0 || busy}
                        onClick={() => runBulk(selectedInList, isActive)}
                        className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    >
                        {isActive ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                        <span>{isActive ? 'Archivia selezionati' : 'Ripristina selezionati'}</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <th className="py-3 px-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => toggleAll(list)}
                                        className="w-4 h-4"
                                    />
                                </th>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Link di caricamento</th>
                                <th className="py-3 px-4">{isActive ? 'Creato il' : 'Eliminazione tra'}</th>
                                <th className="py-3 px-4 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {clientsLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        <div className="flex justify-center items-center space-x-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                            <span>Caricamento clienti...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : list.length > 0 ? (
                                list.map((c) => {
                                    const link = buildLink(c.upload_token);
                                    const key = `row-${c.id}`;
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(c.id)}
                                                    onChange={() => toggleSelect(c.id)}
                                                    className="w-4 h-4"
                                                />
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                                            <td className="py-3 px-4 text-slate-600">{c.email || '-'}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={link}
                                                        onFocus={(e) => e.currentTarget.select()}
                                                        className="w-64 px-2 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700"
                                                    />
                                                    <button
                                                        onClick={() => handleCopy(key, link)}
                                                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
                                                    >
                                                        {copiedKey === key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span>{copiedKey === key ? 'Copiato!' : 'Copia'}</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {isActive
                                                    ? formatDate(c.created_at)
                                                    : `${daysLeft(c.archived_at as string)} giorni`}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    disabled={busy}
                                                    onClick={() => runBulk([c.id], isActive)}
                                                    className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                                                >
                                                    {isActive ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                                                    <span>{isActive ? 'Archivia' : 'Ripristina'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-500">
                                        {isActive ? 'Nessun cliente attivo.' : 'Nessun cliente archiviato.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const tabClass = (t: Tab) =>
        `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
        }`;

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

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => changeTab('documents')} className={tabClass('documents')}>
                        Documenti ({documents.length})
                    </button>
                    <button onClick={() => changeTab('clients')} className={tabClass('clients')}>
                        Clienti ({activeCount})
                    </button>
                    <button onClick={() => changeTab('archived')} className={tabClass('archived')}>
                        Archiviati ({archivedCount})
                    </button>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                tab === 'documents'
                                    ? 'Cerca per cliente, tipo di documento o nome file...'
                                    : 'Cerca per nome o email del cliente...'
                            }
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

                {tab === 'documents' && (
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
                )}

                {tab === 'clients' && renderClientsTable(activeClients, 'active')}
                {tab === 'archived' && renderClientsTable(archivedClients, 'archived')}

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
                                        onFocus={(e) => e.currentTarget.select()}
                                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 select-all"
                                    />
                                    <button
                                        onClick={() => handleCopy('modal', generatedLink)}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
                                    >
                                        {copiedKey === 'modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        <span>{copiedKey === 'modal' ? 'Copiato !' : 'Copia'}</span>
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
                                    <span>Aggiungi un altro cliente in sequenza</span>
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