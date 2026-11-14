import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/core/image-processor';
import { createPdfFromImage } from '@/core/pdf-builder';
import { classifyAndRenameDocument } from '@/core/ai-classifier';
import { supabaseAdmin } from '@/lib/supabase';

// Identifiant de dossier : un par envoi du client (toutes ses photos ensemble)
function cleanBatchId(value: unknown): string {
    if (typeof value === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(value)) {
        return value;
    }
    return `${Date.now().toString(36)}-${Math.round(Math.random() * 1e6).toString(36)}`;
}

// Nom de fichier compatible avec le Storage Supabase (ASCII, sans espaces ni accents)
function cleanFileName(name: string | undefined, fallback: string): string {
    const source = (name || fallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120);
    const base = source.replace(/\.pdf$/i, '') || fallback.replace(/\.pdf$/i, '');
    return `${base}.pdf`;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const token = formData.get('token') as string;
        const batchId = cleanBatchId(formData.get('batchId'));

        if (!file || !token) {
            return NextResponse.json({ error: 'Fichier ou token manquant' }, { status: 400 });
        }

        // 1. Verifier le client dans Supabase grace au token (les clients archives sont refuses)
        const { data: clientData, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('upload_token', token)
            .is('archived_at', null)
            .single();

        if (clientError || !clientData) {
            return NextResponse.json({ error: 'Lien de transmission invalide ou expire' }, { status: 401 });
        }

        // 2. Traitement de l'image et conversion en PDF
        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        const cleanedImageBuffer = await processDocumentImage(inputBuffer);
        const pdfBuffer = await createPdfFromImage(cleanedImageBuffer);
        const metadata = await classifyAndRenameDocument(cleanedImageBuffer, file.type || 'image/jpeg');

        // 3. Nom de fichier et chemin de stockage : un dossier par envoi
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
        let fileName = cleanFileName(metadata.suggestedFileName, `Document_${uniqueSuffix}.pdf`);
        let storagePath = `${clientData.id}/${batchId}/${fileName}`;

        // 4. Upload du PDF dans le Storage Supabase (si le nom existe deja dans le dossier, on ajoute un numero)
        let uploadError: { message: string } | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
            const { error } = await supabaseAdmin.storage
                .from('documents')
                .upload(storagePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: false,
                });

            uploadError = error;
            if (!error) break;

            const message = error.message.toLowerCase();
            if (!message.includes('exist') && !message.includes('duplicate')) break;

            fileName = `${fileName.replace(/\.pdf$/i, '')}_${attempt + 2}.pdf`;
            storagePath = `${clientData.id}/${batchId}/${fileName}`;
        }

        if (uploadError) {
            console.error('Erreur Storage Supabase :', uploadError);
            throw new Error('Impossible d enregistrer le fichier dans le coffre-fort du cabinet.');
        }

        // 5. Enregistrement des metadonnees dans la table "documents"
        const { error: dbError } = await supabaseAdmin.from('documents').insert({
            client_id: clientData.id,
            document_type: metadata.documentType,
            extracted_client_name: metadata.clientName,
            document_date: metadata.documentDate,
            suggested_file_name: fileName,
            summary: metadata.summary,
            storage_path: storagePath,
            batch_id: batchId,
        });

        if (dbError) {
            console.error('Erreur Database Supabase :', dbError);
            throw new Error('Impossible d enregistrer les metadonnees du document.');
        }

        return NextResponse.json({
            success: true,
            message: 'Document traite et enregistre avec succes',
            metadata: { ...metadata, suggestedFileName: fileName },
            batchId,
            pdfSizeInBytes: pdfBuffer.length,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Erreur dans l'API de traitement :", error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
