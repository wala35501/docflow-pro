import Link from 'next/link';

export const metadata = {
    title: 'Informativa privacy - DocFlowStudio',
};

// DA COMPLETARE prima della pubblicazione: i campi tra parentesi quadre.
const TITOLARE = '[Ragione sociale / Nome e cognome]';
const INDIRIZZO = '[Indirizzo completo]';
const PIVA = '[P.IVA]';
const EMAIL = '[email privacy, es. privacy@docflowstudio.it]';

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-slate-100 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <Link href="/info" className="text-sm text-blue-600 hover:underline">
                        &larr; DocFlowStudio
                    </Link>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Informativa sulla privacy</h1>
                    <p className="mt-1 text-sm text-slate-600">
                        ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) &middot; Ultimo aggiornamento: 20 novembre 2026
                    </p>
                </div>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">1. Titolare del trattamento</h2>
                    <p className="text-sm leading-relaxed">
                        {TITOLARE}, {INDIRIZZO}, {PIVA}. Contatto per la privacy: {EMAIL}.
                    </p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">2. Chi siamo e quali dati trattiamo</h2>
                    <p className="text-sm leading-relaxed">DocFlowStudio &egrave; un servizio che permette agli studi professionali di ricevere e organizzare i documenti inviati dai propri clienti. Trattiamo dati in tre situazioni diverse.</p>
                    <h3 className="text-sm font-bold">a) Studi professionali che usano il servizio (account)</h3>
                    <p className="text-sm leading-relaxed">Email, nome dello studio, dati di accesso (anche tramite Google), elenco dei clienti inseriti e impostazioni. Finalit&agrave;: creare e gestire l&apos;account ed erogare il servizio. Base giuridica: esecuzione del contratto o di misure precontrattuali (art. 6.1.b GDPR).</p>
                    <h3 className="text-sm font-bold">b) Documenti caricati dai clienti degli studi</h3>
                    <p className="text-sm leading-relaxed">Le foto e i file inviati tramite il link dello studio, e i dati in essi contenuti. In questo caso lo studio &egrave; il titolare del trattamento e DocFlowStudio agisce come responsabile del trattamento ai sensi dell&apos;art. 28 GDPR, secondo le istruzioni dello studio. [Accordo di nomina da predisporre con ogni studio.]</p>
                    <h3 className="text-sm font-bold">c) Contatti commerciali con studi professionali</h3>
                    <p className="text-sm leading-relaxed">Per presentare il servizio utilizziamo i dati di contatto professionali pubblicati dagli studi sul proprio sito o su elenchi pubblici (denominazione, indirizzo, telefono, indirizzo email generico dello studio) e, se ci contattate, i dati che ci fornite (nome, studio, email, telefono, messaggio, anche tramite il modulo di richiesta demo). Finalit&agrave;: rispondere alle richieste e proporre una dimostrazione del servizio. Base giuridica: la vostra richiesta (art. 6.1.b) oppure, per i contatti iniziali, il legittimo interesse (art. 6.1.f) nei limiti consentiti dalla normativa sulle comunicazioni elettroniche; i messaggi promozionali via email sono inviati solo ove vi sia il consenso o un altro presupposto di legge.</p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">3. Come vengono elaborati i documenti</h2>
                    <p className="text-sm leading-relaxed">Le immagini dei documenti vengono migliorate, convertite in PDF e analizzate con un sistema di intelligenza artificiale per riconoscere tipo, emittente e data e proporre il nome del file. L&apos;analisi serve solo a organizzare i documenti: non produce decisioni automatizzate con effetti giuridici sulle persone.</p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">4. Destinatari e fornitori</h2>
                    <p className="text-sm leading-relaxed">I dati possono essere trattati dai seguenti fornitori, nominati responsabili del trattamento, solo per le finalit&agrave; sopra indicate:</p>
                    <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1">
                        <li>Supabase (autenticazione, database e archiviazione dei file);</li>
                        <li>Anthropic (analisi dei documenti tramite intelligenza artificiale);</li>
                        <li>il fornitore del server su cui &egrave; ospitato il servizio [indicare];</li>
                        <li>Google (accesso con Google, posta elettronica) e gli strumenti di gestione dei contatti commerciali [indicare, es. Airtable];</li>
                        <li>consulenti professionali, ove necessario.</li>
                    </ul>
                    <p className="text-sm leading-relaxed">Alcuni fornitori possono trattare dati fuori dallo Spazio Economico Europeo; in tal caso il trasferimento avviene con le garanzie previste dal GDPR (decisione di adeguatezza o clausole contrattuali tipo). [Verificare localizzazione e garanzie di ciascun fornitore.]</p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">5. Conservazione</h2>
                    <p className="text-sm leading-relaxed">I dati dell&apos;account e i documenti sono conservati finch&eacute; l&apos;account &egrave; attivo e, dopo la cancellazione, per il tempo strettamente necessario agli obblighi di legge [indicare]. I dati dei contatti commerciali sono conservati per [12] mesi dall&apos;ultimo contatto, salvo che si instauri un rapporto contrattuale, e cancellati subito se ne viene chiesta l&apos;opposizione.</p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">6. I suoi diritti</h2>
                    <p className="text-sm leading-relaxed">Pu&ograve; chiedere in qualsiasi momento accesso, rettifica, cancellazione, limitazione, portabilit&agrave; dei dati e opporsi al trattamento, scrivendo a {EMAIL}. Pu&ograve; opporsi in ogni momento alle comunicazioni commerciali rispondendo &quot;NO&quot; a un nostro messaggio: non la contatteremo pi&ugrave;. Ha inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).</p>
                </section>

                <section className="bg-white rounded-xl shadow-sm p-6 space-y-3">
                    <h2 className="text-lg font-bold">7. Cookie</h2>
                    <p className="text-sm leading-relaxed">Il sito utilizza solo cookie e archiviazione locale tecnici, necessari all&apos;accesso e alla memorizzazione delle preferenze (ad esempio il tema chiaro/scuro). Non usiamo cookie di profilazione n&eacute; strumenti di tracciamento pubblicitario.</p>
                </section>

                <p className="text-xs text-slate-500 text-center">Documento da far verificare da un consulente privacy prima della pubblicazione.</p>
            </div>
        </main>
    );
}
