import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Modele principal et modele de secours (modifiables dans .env.production sans toucher au code)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

const DOCUMENT_TYPES = [
    'Fattura',
    'Scontrino',
    'Bolletta',
    'F24',
    'Estratto conto',
    'Contratto',
    "Carta d'identita",
    'Altro',
];

export interface DocumentMetadata {
    documentType: string;
    clientName: string;
    documentDate: string;
    suggestedFileName: string;
    summary: string;
}

const PROMPT = `
Sei un assistente di uno studio commerciale italiano. Analizza la foto di questo documento contabile o fiscale.
Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, con questi campi:
{
  "documentType": uno tra: ${DOCUMENT_TYPES.map((t) => `"${t}"`).join(', ')},
  "clientName": "nome dell'emittente (azienda o persona che ha emesso il documento); \\"Sconosciuto\\" se illeggibile",
  "documentDate": "data del documento nel formato YYYY-MM-DD, oppure stringa vuota se non si legge",
  "totalAmount": "importo totale con la virgola, es. 1512,80 (stringa vuota se assente)",
  "summary": "una sola frase breve in italiano che descrive il contenuto"
}
Non inventare dati: se un'informazione non e leggibile, lasciala vuota.
`;

function today(): string {
    return new Date().toISOString().split('T')[0];
}

function fallbackMetadata(reason: string): DocumentMetadata {
    return {
        documentType: 'Altro',
        clientName: 'Sconosciuto',
        documentDate: today(),
        suggestedFileName: `Documento_${Date.now()}.pdf`,
        summary: reason,
    };
}

// Nom normalise : Tipo_YYYY-MM-DD_Emittente.pdf (ASCII, sans accents ni espaces)
function buildFileName(type: string, date: string, sender: string): string {
    const clean = (value: string) =>
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);

    const parts = [clean(type) || 'Documento', date || today(), clean(sender)].filter(Boolean);
    return `${parts.join('_')}.pdf`;
}

function parseModelJson(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) {
        throw new Error('Risposta IA senza JSON');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
}

async function askModel(modelName: string, imageBuffer: Buffer, mimeType: string): Promise<Record<string, unknown>> {
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
        },
    });

    const result = await model.generateContent([
        PROMPT,
        { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    ]);

    return parseModelJson(result.response.text());
}

export async function classifyAndRenameDocument(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg'
): Promise<DocumentMetadata> {
    if (!process.env.GEMINI_API_KEY) {
        console.error('IA : GEMINI_API_KEY manquante dans le fichier .env.production');
        return fallbackMetadata('Analisi IA non disponibile (chiave mancante)');
    }

    let raw: Record<string, unknown> | null = null;

    for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
        try {
            raw = await askModel(modelName, imageBuffer, mimeType);
            break;
        } catch (error) {
            console.error(`IA : echec avec le modele "${modelName}" :`, error);
        }
    }

    if (!raw) {
        return fallbackMetadata('Analisi IA non riuscita');
    }

    const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

    const rawType = str(raw.documentType);
    const documentType = DOCUMENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) || 'Altro';

    const sender = str(raw.clientName) || 'Sconosciuto';
    const rawDate = str(raw.documentDate);
    const documentDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today();
    const summary = str(raw.summary) || 'Documento analizzato';

    return {
        documentType,
        clientName: sender,
        documentDate,
        suggestedFileName: buildFileName(documentType, documentDate, sender),
        summary,
    };
}
