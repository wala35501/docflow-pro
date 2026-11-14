import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/core/image-processor';
import { createPdfFromImage } from '@/core/pdf-builder';
import { classifyAndRenameDocument } from '@/core/ai-classifier';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const token = formData.get('token') as string;

        if (!file || !token) {
            return NextResponse.json({ error: 'Fichier ou token manquant' }, { status: 400 });
        }

        // 1. Verifier le client dans Supabase grace au token
        const { data: clientData, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('upload_token', token)
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

        // 3. Nom de fichier et chemin de stockage unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
        const fileName = metadata.suggestedFileName || `Document_${uniqueSuffix}.pdf`;
        const storagePath = `${clientData.id}/${fileName}`;

        // 4. Upload du PDF dans le Storage Supabase
        const { error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(storagePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

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
        });

        if (dbError) {
            console.error('Erreur Database Supabase :', dbError);
            throw new Error('Impossible d enregistrer les metadonnees du document.');
        }

        return NextResponse.json({
            success: true,
            message: 'Document traite et enregistre avec succes',
            metadata,
            pdfSizeInBytes: pdfBuffer.length,
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Erreur dans l'API de traitement :", error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}