import sharp from 'sharp';

export async function processDocumentImage(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // Pipeline de nettoyage et d'optimisation avec Sharp
    const processedImageBuffer = await sharp(inputBuffer)
      .rotate() // Redresse l'image automatiquement selon les métadonnées EXIF du smartphone
      .grayscale() // Convertit en noir et blanc pour éliminer les parasites de couleur et accentuer le texte
      .normalize() // Améliore dynamiquement le contraste (très utile pour les photos sombres)
      .sharpen() // Accentue les contours pour rendre les caractères plus nets pour l'OCR / IA
      .jpeg({ quality: 85 }) // Compresse légèrement pour garder un fichier léger et rapide à traiter
      .toBuffer();

    return processedImageBuffer;
  } catch (error) {
    console.error("Erreur lors du traitement de l'image :", error);
    throw new Error("Impossible de traiter l'image du document.");
  }
}