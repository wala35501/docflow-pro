// Lecture et renommage des documents avec Claude (API Anthropic, appel direct sans dependance)

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// Modele principal (precis) et modele de secours (tres rapide) : modifiables dans .env.production
const PRIMARY_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const FALLBACK_MODEL = process.env.CLAUDE_FALLBACK_MODEL || 'claude-haiku-5-5';

const REQUEST_TIMEOUT_MS = 45000;
const ATTEMPTS_PER_MODEL = 2;

const DOCUMENT_TYPES = [
    'Fattura',
    'Nota di credito',
    'Scontrino',
    'Ricevuta',
    'Bolletta',
    'F24',
    'Estratto conto',
    'Contratto',
    'Busta paga',
    "Documento d'identita",
    'Altro',
];

export interface DocumentMetadata {
    documentType: string;
    clientName: string;
    documentDate: string;
    suggestedFileName: string;
    summary: string;
    documentNumber?: string;
    totalAmount?: string;
    needsReview?: boolean;
}

const SYSTEM_PROMPT = `Sei l'assistente di archiviazione di uno studio commerciale italiano. Ricevi la foto di un documento contabile o fiscale e devi registrarne i dati con la massima precisione, perche il file verra rinominato automaticamente.

Regole:
- Leggi solo cio che e scritto sul documento. Non inventare e non dedurre: se un dato non e leggibile, lascialo vuoto e abbassa la confidenza.
- "issuer" e l'EMITTENTE: chi ha emesso il documento (il fornitore, il negozio, l'ente). Non e il destinatario. Scrivi la ragione sociale breve e pulita, senza indirizzo e senza forma estesa inutile (es. "Lenti & Montature Rossi S.r.l.").
- "recipient" e il destinatario/intestatario, se presente.
- "documentDate" e la data di EMISSIONE del documento (non la scadenza, non il periodo di competenza). Le date italiane sono giorno/mese/anno: convertile in AAAA-MM-GG.
- "documentNumber" e il numero del documento (es. numero fattura), se presente.
- "totalAmount" e il totale finale da pagare/pagato, con la virgola decimale e senza simbolo (es. "1512,80").
- "documentType": scegli il valore piu adatto dell'elenco. Se nessuno e adatto o il documento non e leggibile, usa "Altro".
- "confidence": "alta" solo se tipo, emittente e data sono chiaramente leggibili; "media" se un dato e dubbio; "bassa" se il documento e sfocato, tagliato o poco leggibile.
- "summary": una sola frase breve in italiano sul contenuto.`;

const TOOL = {
    name: 'registra_documento',
    description: 'Registra i dati letti dal documento.',
    input_schema: {
        type: 'object',
        properties: {
            documentType: { type: 'string', enum: DOCUMENT_TYPES },
            issuer: { type: 'string', description: "Emittente del documento (ragione sociale breve)" },
            recipient: { type: 'string', description: 'Destinatario o intestatario, se presente' },
            documentDate: { type: 'string', description: 'Data di emissione AAAA-MM-GG, vuota se illeggibile' },
            documentNumber: { type: 'string', description: 'Numero del documento, vuoto se assente' },
            totalAmount: { type: 'string', description: 'Totale con la virgola, es. 1512,80, vuoto se assente' },
            confidence: { type: 'string', enum: ['alta', 'media', 'bassa'] },
            summary: { type: 'string', description: 'Una frase breve in italiano' },
        },
        required: ['documentType', 'issuer', 'documentDate', 'confidence', 'summary'],
    },
};

class ApiError extends Error {
    status: number;
    retryAfterMs: number;
    constructor(message: string, status: number, retryAfterMs = 0) {
        super(message);
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}

function today(): string {
    return new Date().toISOString().split('T')[0];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fallbackMetadata(reason: string): DocumentMetadata {
    return {
        documentType: 'Altro',
        clientName: 'Sconosciuto',
        documentDate: today(),
        suggestedFileName: `Documento_${Date.now()}.pdf`,
        summary: reason,
        needsReview: true,
    };
}

// Image reduite a 1800 px max : lecture aussi precise, mais envoi et reponse plus rapides
async function prepareImage(imageBuffer: Buffer): Promise<{ data: string; mediaType: string }> {
    try {
        const sharp = (await import('sharp')).default;
        const resized = await sharp(imageBuffer)
            .rotate()
            .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 })
            .toBuffer();
        return { data: resized.toString('base64'), mediaType: 'image/jpeg' };
    } catch (error) {
        console.error('IA : preparation image impossible, envoi de l image brute :', error);
        return { data: imageBuffer.toString('base64'), mediaType: 'image/jpeg' };
    }
}

async function callClaude(model: string, image: { data: string; mediaType: string }): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': API_VERSION,
            },
            body: JSON.stringify({
                model,
                max_tokens: 700,
                system: SYSTEM_PROMPT,
                tools: [TOOL],
                tool_choice: { type: 'tool', name: TOOL.name },
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
                            { type: 'text', text: 'Registra i dati di questo documento.' },
                        ],
                    },
                ],
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            const retryAfter = Number(res.headers.get('retry-after')) || 0;
            throw new ApiError(`HTTP ${res.status} ${body.slice(0, 300)}`, res.status, retryAfter * 1000);
        }

        const json = (await res.json()) as { content?: { type: string; input?: Record<string, unknown> }[] };
        const block = (json.content || []).find((b) => b.type === 'tool_use');
        if (!block || !block.input) {
            throw new ApiError('Risposta senza dati strutturati', 502);
        }
        return block.input;
    } finally {
        clearTimeout(timer);
    }
}

// Erreurs qui valent la peine d'un nouvel essai (surcharge, limite de debit, panne temporaire, reseau)
function isRetryable(error: unknown): boolean {
    if (error instanceof ApiError) {
        return error.status === 429 || error.status === 529 || error.status >= 500;
    }
    return true; // timeout ou erreur reseau
}

async function askWithRetry(model: string, image: { data: string; mediaType: string }): Promise<Record<string, unknown>> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
        try {
            return await callClaude(model, image);
        } catch (error) {
            lastError = error;
            console.error(`IA : echec avec "${model}" (essai ${attempt}) :`, error instanceof Error ? error.message : error);
            if (!isRetryable(error) || attempt === ATTEMPTS_PER_MODEL) break;
            const wait = error instanceof ApiError && error.retryAfterMs ? Math.min(error.retryAfterMs, 5000) : 700 * attempt;
            await sleep(wait);
        }
    }
    throw lastError;
}

// Nom normalise : Tipo_AAAA-MM-GG_Emittente[_N-numero].pdf (ASCII, sans espaces ni accents)
function cleanPart(value: string, max: number): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, max)
        .replace(/-+$/g, '');
}

// "Rossi S.r.l." -> "Rossi" : la forme juridique alourdit le nom sans rien apporter
function shortIssuer(issuer: string): string {
    const stripped = issuer.replace(/[\s,]+(s\.?\s?r\.?\s?l\.?\s?s?|s\.?\s?p\.?\s?a|s\.?\s?n\.?\s?c|s\.?\s?a\.?\s?s)\.?\s*$/i, '').trim();
    return stripped || issuer;
}

function buildFileName(type: string, date: string, issuer: string, number: string): string {
    const parts = [
        cleanPart(type, 30) || 'Documento',
        date,
        cleanPart(shortIssuer(issuer), 40),
        number ? `N-${cleanPart(number, 20)}` : '',
    ].filter(Boolean);
    return `${parts.join('_')}.pdf`;
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function classifyAndRenameDocument(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg'
): Promise<DocumentMetadata> {
    void mimeType; // l'image est reconvertie en JPEG avant l'envoi

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('IA : ANTHROPIC_API_KEY manquante dans le fichier .env.production');
        return fallbackMetadata('Analisi IA non disponibile (chiave mancante) - da verificare');
    }

    const image = await prepareImage(imageBuffer);

    let raw: Record<string, unknown> | null = null;
    for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
        try {
            raw = await askWithRetry(model, image);
            break;
        } catch {
            // on essaie le modele de secours
        }
    }

    if (!raw) {
        return fallbackMetadata('Analisi IA non riuscita - da verificare');
    }

    const rawType = str(raw.documentType);
    const documentType = DOCUMENT_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) || 'Altro';
    const issuer = str(raw.issuer);
    const readDate = /^\d{4}-\d{2}-\d{2}$/.test(str(raw.documentDate)) ? str(raw.documentDate) : '';
    const number = str(raw.documentNumber);
    const confidence = str(raw.confidence).toLowerCase();

    const needsReview = confidence !== 'alta' || !issuer || !readDate || documentType === 'Altro';
    let summary = str(raw.summary) || 'Documento analizzato';
    if (needsReview) summary = `Da verificare - ${summary}`;

    return {
        documentType,
        clientName: issuer || 'Sconosciuto',
        documentDate: readDate || today(),
        suggestedFileName: buildFileName(documentType, readDate, issuer, number),
        summary,
        documentNumber: number || undefined,
        totalAmount: str(raw.totalAmount) || undefined,
        needsReview,
    };
}
