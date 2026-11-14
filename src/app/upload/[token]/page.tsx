'use client';

import { useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle2, Loader2, FileText, X } from 'lucide-react';
import type { DocumentMetadata } from '@/core/ai-classifier';

interface ProcessedResult {
    fileName: string;
    metadata: DocumentMetadata;
}

interface FilePreview {
    file: File;
    previewUrl: string;
}

function UploadContent() {
    const params = useParams();
    const token = params.token;

    const [fileList, setFileList] = useState<FilePreview[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<ProcessedResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map((file) => ({
                file,
                previewUrl: URL.createObjectURL(file),
            }));
            setFileList((prev) => [...prev, ...newFiles]);
            setResults([]);
            setError(null);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFileList((prev) => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].previewUrl);
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (fileList.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const processedResults: ProcessedResult[] = [];

            for (const item of fileList) {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('token', token as string);

                const res = await fetch('/api/v1/documents/process', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erreur lors du traitement du document');
                }

                processedResults.push({
                    fileName: item.file.name,
                    metadata: data.metadata,
                });
            }

            setResults(processedResults);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Une erreur est survenue lors de l'envoi.";
            setError(message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-lg w-full mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    DocFlow Pro
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                    Espace de transmission securise pour votre cabinet comptable
                </p>
            </div>

            <div className="bg-white py-8 px-6 shadow-md rounded-xl border border-slate-200">
                {results.length === 0 ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Prenez en photo ou selectionnez vos documents
                            </label>
                            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-blue-500 transition-colors bg-slate-50">
                                <div className="space-y-2 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-blue-500" />
                                    <div className="flex text-sm text-slate-600 justify-center">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer bg-white py-1 px-3 border border-slate-300 rounded-md font-medium text-blue-600 hover:bg-slate-50 focus-within:outline-none shadow-sm"
                                        >
                                            <span>Parcourir (multiples)</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                capture="environment"
                                                className="sr-only"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-500">Factures, recus, documents (PNG, JPG)</p>
                                </div>
                            </div>
                        </div>

                        {fileList.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-700">
                                    Apercu des documents selectionnes ({fileList.length}) :
                                </p>
                                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                                    {fileList.map((item, index) => (
                                        <div key={index} className="relative group bg-slate-100 border border-slate-200 rounded-lg p-2 flex flex-col items-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.previewUrl}
                                                alt={item.file.name}
                                                className="h-24 w-full object-contain rounded mb-1 bg-black"
                                            />
                                            <span className="text-[10px] text-slate-600 truncate w-full text-center">
                                                {item.file.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(index)}
                                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                                                title="Retirer ce fichier"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={fileList.length === 0 || uploading}
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                    Traitement & IA en cours...
                                </>
                            ) : (
                                'Envoyer au cabinet'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                            <h3 className="text-lg font-bold text-slate-900">Documents transmis avec succes !</h3>
                            <p className="text-xs text-slate-500">Analyses et classes par intelligence artificielle</p>
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {results.map((item, index) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 border border-slate-200 text-slate-700">
                                    <div className="flex items-center font-semibold text-blue-600 pb-1 border-b border-slate-200">
                                        <FileText className="w-4 h-4 mr-1.5" />
                                        {item.metadata.suggestedFileName}
                                    </div>
                                    <p><strong>Type :</strong> {item.metadata.documentType}</p>
                                    <p><strong>Emetteur/Client :</strong> {item.metadata.clientName}</p>
                                    <p><strong>Date :</strong> {item.metadata.documentDate}</p>
                                    <p><strong>Resume :</strong> {item.metadata.summary}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => { setFileList([]); setResults([]); }}
                            className="w-full py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                            Envoyer de nouveaux documents
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ClientUploadPage() {
    return (
        <main className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="text-center text-slate-500">Chargement de lespace securise...</div>}>
                <UploadContent />
            </Suspense>
        </main>
    );
}