import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface DocumentMetadata {
    documentType: string;
    clientName: string;
    documentDate: string;
    suggestedFileName: string;
    summary: string;
}

export async function classifyAndRenameDocument(imageBuffer: Buffer, mimeType: string = 'image/jpeg'): Promise<DocumentMetadata> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: mimeType,
            },
        };

        const prompt = `
      Analyse ce document comptable ou fiscal (provenant d'un client en Italie).
      Extrais les informations suivantes au format JSON strict (sans markdown autour, uniquement du JSON valide) :
      {
        "documentType": "Type de document (ex: Fattura, Scontrino, F24, Carta d'identita, Altro)",
        "clientName": "Nom de l'emetteur ou du client (Nom de l'entreprise ou de la personne)",
        "documentDate": "Date du document au format YYYY-MM-DD (ou vide si introuvable)",
        "suggestedFileName": "Un nom de fichier professionnel normalise et propre sans caracteres speciaux (ex: Fattura_2026-11-12_NomClient.pdf)",
        "summary": "Une description tres courte en une phrase du contenu"
      }
    `;

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const metadata: DocumentMetadata = JSON.parse(cleanJsonText);

        return metadata;
    } catch (error) {
        console.error("Erreur lors de l'analyse IA du document :", error);
        return {
            documentType: "Altro",
            clientName: "Inconnu",
            documentDate: new Date().toISOString().split('T')[0],
            suggestedFileName: `Document_${Date.now()}.pdf`,
            summary: "Document non analyse automatiquement"
        };
    }
}