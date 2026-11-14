import { PDFDocument } from 'pdf-lib';

export async function createPdfFromImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
        const pdfDoc = await PDFDocument.create();

        const image = await pdfDoc.embedJpg(imageBuffer);
        const imgDims = image.scale(1);

        const page = pdfDoc.addPage([imgDims.width, imgDims.height]);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width: imgDims.width,
            height: imgDims.height,
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error("Erreur lors de la generation du PDF :", error);
        throw new Error("Impossible de convertir l'image en PDF.");
    }
}