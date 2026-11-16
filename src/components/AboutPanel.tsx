import { Link2, Sparkles, FolderOpen, Archive, ShieldCheck } from 'lucide-react';

const STEPS = [
    {
        icon: Link2,
        title: 'Un link personale per ogni cliente',
        text: "Crei un cliente e ottieni un link unico. Il cliente lo apre dal telefono e invia le foto dei documenti, senza creare account n\u00e9 installare nulla.",
    },
    {
        icon: Sparkles,
        title: 'Foto pulite e documenti riconosciuti',
        text: "Ogni foto viene migliorata (orientamento, contrasto, nitidezza), trasformata in PDF e analizzata dall'intelligenza artificiale, che riconosce il tipo di documento, l'emittente e la data.",
    },
    {
        icon: FolderOpen,
        title: 'File rinominati e in ordine',
        text: "I file ricevono un nome standard (es. Fattura_2026-11-12_Rossi.pdf) e ogni invio del cliente viene raccolto in una cartella, scaricabile in ZIP.",
    },
    {
        icon: Archive,
        title: 'Archivio ordinato',
        text: "Puoi archiviare i clienti non pi\u00f9 attivi: restano recuperabili per 30 giorni, poi vengono eliminati definitivamente.",
    },
];

export default function AboutPanel() {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">
                    A cosa serve ComPro
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {"ComPro \u00e8 pensato per gli studi commerciali e legali: elimina la rincorsa ai documenti dei clienti. Il cliente invia le foto, lo studio le riceve gi\u00e0 pulite, classificate e rinominate, pronte da archiviare."}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STEPS.map((step) => {
                    const Icon = step.icon;
                    return (
                        <div key={step.title} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex space-x-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex space-x-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Ogni studio vede solo i propri dati</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {"Ogni studio ha il proprio account e il proprio cruscotto: clienti e documenti non sono visibili agli altri studi. ComPro \u00e8 una versione di prova (nome provvisorio): le funzioni possono cambiare."}
                    </p>
                </div>
            </div>
        </div>
    );
}
