'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Download, Search, CheckCircle2, Building2, Loader2,
    UserPlus, X, Copy, Check, Archive, ArchiveRestore,
    Folder, FolderOpen, ChevronRight, ChevronDown, Settings, Info,
} from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase-browser';
import { authedFetch, downloadFile } from '@/lib/authed-fetch';
import SettingsPanel from '@/components/SettingsPanel';
import AboutPanel from '@/components/AboutPanel';

const ARCHIVE_DAYS = 30;

type Tab = 'documents' | 'clients' | 'archived' | 'settings' | 'info';

interface DocumentRecord {
    id: string;
    clientName: string;
    documentType: string;
    documentDate: string;
    fileName: string;
    summary: string;
    createdAt: string;
    batchId: string | null;
}

interface FolderGroup {
    key: string;
    batchId: string | null;
    clientName: string;
    createdAt: string;
    docs: DocumentRecord[];
}

interface RawDocumentItem {
    id: string;
    batch_id?: string | null;
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

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function pdfUrl(id: string): string {
    return `/api/v1/documents/download?id=${encodeURIComponent(id)}`;
}

function folderUrl(batchId: string): string {
    return `/api/v1/documents/folder?batch=${encodeURIComponent(batchId)}`;
}

// Meme logique de nom que l'API du ZIP : Cartella_<Cliente>_<data>.zip
function zipNameFor(group: FolderGroup): string {
    const safe = group.clientName.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'Cliente';
    const stamp = new Date(group.createdAt).toISOString().slice(0, 10);
    return `Cartella_${safe}_${stamp}.zip`;
}

export default function DashboardPage() {
    const router = useRouter();
    const [authReady, setAuthReady] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [studioName, setStudioName] = useState('');
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
    const [openFolders, setOpenFolders] = useState<string[]>([]);
    const [zipGroup, setZipGroup] = useState<FolderGroup | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [submittingClient, setSubmittingClient] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    // Verifica del login : senza sessione si va alla pagina di accesso
    useEffect(() => {
        async function checkSession() {
            try {
                const supabase = await getBrowserClient();
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    router.replace('/login');
                    return;
                }
                setUserEmail(data.session.user.email || '');
                setStudioName(String(data.session.user.user_metadata?.studio_name || ''));
                setAuthReady(true);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Errore di accesso');
                setLoading(false);
                setClientsLoading(false);
            }
        }

        checkSession();
    }, [router]);

    useEffect(() => {
        if (!authReady) return;

        async function fetchDocuments() {
            try {
                const res = await authedFetch('/api/v1/documents/list');
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
                    batchId: item.batch_id || null,
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
    }, [authReady]);

    useEffect(() => {
        if (!authReady) return;

        async function loadClients() {
            try {
                const res = await authedFetch('/api/v1/clients/list');
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
    }, [clientsReload, authReady]);

    const fetchClients = () => setClientsReload((n) => n + 1);

    const changeTab = (next: Tab) => {
        setTab(next);
        setSelected([]);
        setSearchTerm('');
    };

    const handleCreateClient = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!clientName) return;

        setSubmittingClient(true);
        try {
            const res = await authedFetch('/api/v1/clients/create', {
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
            const res = await authedFetch('/api/v1/clients/archive', {
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

    const handleDownload = async (url: string, name: string) => {
        try {
            await downloadFile(url, name);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Download non riuscito');
        }
    };

    const toggleFolder = (key: string) => {
        setOpenFolders((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
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

    // Regroupement par dossier : un dossier = un envoi du client (toutes ses photos)
    const groups: FolderGroup[] = [];
    const byBatch = new Map<string, FolderGroup>();
    for (const doc of filteredDocuments) {
        if (doc.batchId) {
            let group = byBatch.get(doc.batchId);
            if (!group) {
                group = {
                    key: doc.batchId,
                    batchId: doc.batchId,
                    clientName: doc.clientName,
                    createdAt: doc.createdAt,
                    docs: [],
                };
                byBatch.set(doc.batchId, group);
                groups.push(group);
            }
            group.docs.push(doc);
        } else {
            groups.push({
                key: doc.id,
                batchId: null,
                clientName: doc.clientName,
                createdAt: doc.createdAt,
                docs: [doc],
            });
        }
    }
    for (const group of byBatch.values()) {
        // L'API renvoie du plus recent au plus ancien : on remet les photos dans l'ordre d'envoi
        group.docs.reverse();
        group.createdAt = group.docs[0].createdAt;
    }

    const matchClient = (c: ClientRecord) =>
        c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term);

    const activeClients = clients.filter((c) => !c.archived_at && matchClient(c));
    const archivedClients = clients.filter((c) => c.archived_at && matchClient(c));
    const activeCount = clients.filter((c) => !c.archived_at).length;
    const archivedCount = clients.filter((c) => c.archived_at).length;

    // Nuovo account senza clienti ne documenti : invito ad aggiungere il primo cliente (nessun errore)
    const isEmptyAccount = !loading && !clientsLoading && !error && clients.length === 0 && documents.length === 0;

    const renderWelcome = () => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <UserPlus className="w-7 h-7" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900">Benvenuto in DocFlowStudio!</h2>
                <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                    {"Non hai ancora nessun cliente. Aggiungi il tuo primo cliente per ottenere il suo link personale: potr\u00e0 inviarti le foto dei documenti dal telefono, senza creare un account."}
                </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                    onClick={() => { setIsModalOpen(true); setGeneratedLink(null); setClientName(''); setClientEmail(''); }}
                    className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Aggiungi il tuo primo cliente</span>
                </button>
                <button
                    onClick={() => changeTab('info')}
                    className="inline-flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Info className="w-4 h-4" />
                    <span>Come funziona</span>
                </button>
            </div>
        </div>
    );

    const renderDocRow = (doc: DocumentRecord, nested: boolean) => (
        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
            <td className={`py-3 font-semibold text-slate-900 ${nested ? 'pl-12 pr-4' : 'px-4'}`}>
                {doc.clientName}
            </td>
            <td className="py-3 px-4">
                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-medium">
                    {doc.documentType}
                </span>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center space-x-1.5 text-blue-600 font-medium">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate max-w-xs">{doc.fileName}</span>
                </div>
            </td>
            <td className="py-3 px-4 text-slate-600">{doc.documentDate}</td>
            <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{doc.summary}</td>
            <td className="py-3 px-4 text-right">
                <button
                    type="button"
                    onClick={() => handleDownload(pdfUrl(doc.id), doc.fileName)}
                    className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                </button>
            </td>
        </tr>
    );

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
                            <span>{studioName || 'Studio Commerciale / Legale - Area Gestione'}</span>
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
                    <button onClick={() => changeTab('settings')} className={`${tabClass('settings')} inline-flex items-center space-x-2`}>
                        <Settings className="w-4 h-4" />
                        <span>Impostazioni</span>
                    </button>
                    <button onClick={() => changeTab('info')} className={`${tabClass('info')} inline-flex items-center space-x-2`}>
                        <Info className="w-4 h-4" />
                        <span>Info sullo strumento</span>
                    </button>
                </div>

                {tab === 'settings' && (
                    <SettingsPanel email={userEmail} studioName={studioName} onStudioNameSaved={setStudioName} />
                )}
                {tab === 'info' && <AboutPanel />}

                {(tab === 'documents' || tab === 'clients' || tab === 'archived') && !isEmptyAccount && (
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
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {(tab === 'documents' || tab === 'clients') && isEmptyAccount && renderWelcome()}

                {tab === 'documents' && !isEmptyAccount && (
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
                                    ) : groups.length > 0 ? (
                                        groups.map((group) => {
                                            if (!group.batchId) {
                                                return renderDocRow(group.docs[0], false);
                                            }

                                            const isOpen = openFolders.includes(group.key) || term !== '';

                                            return (
                                                <Fragment key={group.key}>
                                                    <tr
                                                        className="bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                                                        onClick={() => toggleFolder(group.key)}
                                                    >
                                                        <td colSpan={5} className="py-3 px-4">
                                                            <div className="flex items-center space-x-2 font-semibold text-slate-900">
                                                                {isOpen
                                                                    ? <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                    : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                                                {isOpen
                                                                    ? <FolderOpen className="w-5 h-5 text-amber-500" />
                                                                    : <Folder className="w-5 h-5 text-amber-500" />}
                                                                <span>{group.clientName}</span>
                                                                <span className="text-xs font-normal text-slate-500">
                                                                    {`- ${formatDateTime(group.createdAt)} - ${group.docs.length} ${group.docs.length === 1 ? 'documento' : 'documenti'}`}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setZipGroup(group);
                                                                }}
                                                                className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                <span>Cartella ZIP</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isOpen && group.docs.map((doc) => renderDocRow(doc, true))}
                                                </Fragment>
                                            );
                                        })
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

                {tab === 'clients' && !isEmptyAccount && renderClientsTable(activeClients, 'active')}
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

            {zipGroup && zipGroup.batchId && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setZipGroup(null)}
                >
                    <div
                        className="bg-white rounded-xl max-w-md w-full p-6 space-y-6 shadow-xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setZipGroup(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            aria-label="Chiudi"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Cartella ZIP</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Tutti i documenti di questo invio, in un unico file.
                            </p>
                        </div>

                        <ul className="border border-slate-200 rounded-lg overflow-hidden text-sm max-h-72 overflow-y-auto">
                            <li className="flex items-center space-x-2 px-3 py-2 bg-slate-50 font-semibold text-slate-900">
                                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="truncate">{zipNameFor(zipGroup)}</span>
                            </li>
                            {zipGroup.docs.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="flex items-center space-x-2 pl-6 pr-3 py-2 border-t border-slate-200 text-slate-700"
                                >
                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="truncate">{doc.fileName}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    handleDownload(folderUrl(zipGroup.batchId as string), zipNameFor(zipGroup));
                                    setZipGroup(null);
                                }}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex justify-center items-center space-x-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Scarica la cartella</span>
                            </button>
                            <button
                                onClick={() => setZipGroup(null)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}