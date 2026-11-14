// Generateur de fichier ZIP minimal (sans compression), sans dependance externe.
// Les PDF sont deja compresses, donc le mode "stockage" suffit.

export interface ZipEntry {
    name: string;
    data: Uint8Array;
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(data: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; day: number } {
    const year = Math.max(date.getFullYear(), 1980);
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
}

export function buildZip(entries: ZipEntry[]) {
    const encoder = new TextEncoder();
    const { time, day } = dosDateTime(new Date());

    const prepared = entries.map((entry) => ({
        nameBytes: encoder.encode(entry.name),
        data: entry.data,
        crc: crc32(entry.data),
        offset: 0,
    }));

    let localSize = 0;
    let centralSize = 0;
    for (const p of prepared) {
        localSize += 30 + p.nameBytes.length + p.data.length;
        centralSize += 46 + p.nameBytes.length;
    }

    const out = new Uint8Array(localSize + centralSize + 22);
    const view = new DataView(out.buffer);
    let pos = 0;

    // En-tetes locaux + donnees
    for (const p of prepared) {
        p.offset = pos;
        view.setUint32(pos, 0x04034b50, true);
        view.setUint16(pos + 4, 20, true);
        view.setUint16(pos + 6, 0x0800, true); // noms en UTF-8
        view.setUint16(pos + 8, 0, true); // methode : stockage
        view.setUint16(pos + 10, time, true);
        view.setUint16(pos + 12, day, true);
        view.setUint32(pos + 14, p.crc, true);
        view.setUint32(pos + 18, p.data.length, true);
        view.setUint32(pos + 22, p.data.length, true);
        view.setUint16(pos + 26, p.nameBytes.length, true);
        view.setUint16(pos + 28, 0, true);
        pos += 30;
        out.set(p.nameBytes, pos);
        pos += p.nameBytes.length;
        out.set(p.data, pos);
        pos += p.data.length;
    }

    // Repertoire central
    const centralStart = pos;
    for (const p of prepared) {
        view.setUint32(pos, 0x02014b50, true);
        view.setUint16(pos + 4, 20, true);
        view.setUint16(pos + 6, 20, true);
        view.setUint16(pos + 8, 0x0800, true);
        view.setUint16(pos + 10, 0, true);
        view.setUint16(pos + 12, time, true);
        view.setUint16(pos + 14, day, true);
        view.setUint32(pos + 16, p.crc, true);
        view.setUint32(pos + 20, p.data.length, true);
        view.setUint32(pos + 24, p.data.length, true);
        view.setUint16(pos + 28, p.nameBytes.length, true);
        view.setUint16(pos + 30, 0, true);
        view.setUint16(pos + 32, 0, true);
        view.setUint16(pos + 34, 0, true);
        view.setUint16(pos + 36, 0, true);
        view.setUint32(pos + 38, 0, true);
        view.setUint32(pos + 42, p.offset, true);
        pos += 46;
        out.set(p.nameBytes, pos);
        pos += p.nameBytes.length;
    }

    // Fin du repertoire central
    view.setUint32(pos, 0x06054b50, true);
    view.setUint16(pos + 4, 0, true);
    view.setUint16(pos + 6, 0, true);
    view.setUint16(pos + 8, prepared.length, true);
    view.setUint16(pos + 10, prepared.length, true);
    view.setUint32(pos + 12, pos - centralStart, true);
    view.setUint32(pos + 16, centralStart, true);
    view.setUint16(pos + 20, 0, true);

    return out;
}
