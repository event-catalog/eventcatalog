interface ZipFile {
  name: string;
  content: string;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function writeU32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function createZipBlob(files: ZipFile[]): Blob {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);

    const localHeader = concatBytes([
      writeU32(0x04034b50),
      writeU16(20), // version needed
      writeU16(0), // flags
      writeU16(0), // compression (store)
      writeU16(0), // mod time
      writeU16(0), // mod date
      writeU32(checksum),
      writeU32(dataBytes.length),
      writeU32(dataBytes.length),
      writeU16(nameBytes.length),
      writeU16(0), // extra length
      nameBytes,
      dataBytes,
    ]);

    localChunks.push(localHeader);

    const centralHeader = concatBytes([
      writeU32(0x02014b50),
      writeU16(20), // version made by
      writeU16(20), // version needed
      writeU16(0), // flags
      writeU16(0), // compression
      writeU16(0), // mod time
      writeU16(0), // mod date
      writeU32(checksum),
      writeU32(dataBytes.length),
      writeU32(dataBytes.length),
      writeU16(nameBytes.length),
      writeU16(0), // extra length
      writeU16(0), // comment length
      writeU16(0), // disk number start
      writeU16(0), // internal attrs
      writeU32(0), // external attrs
      writeU32(localOffset),
      nameBytes,
    ]);

    centralChunks.push(centralHeader);
    localOffset += localHeader.length;
  }

  const localData = concatBytes(localChunks);
  const centralData = concatBytes(centralChunks);
  const endRecord = concatBytes([
    writeU32(0x06054b50),
    writeU16(0), // disk number
    writeU16(0), // central dir start disk
    writeU16(files.length),
    writeU16(files.length),
    writeU32(centralData.length),
    writeU32(localData.length),
    writeU16(0), // comment length
  ]);

  const archive = concatBytes([localData, centralData, endRecord]);
  return new Blob([archive], { type: 'application/zip' });
}
