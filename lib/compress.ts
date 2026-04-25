import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1600,
      fileType: 'image/webp',
      useWebWorker: true,
    });

    return new File([compressed], replaceExt(file.name, 'webp'), {
      type: 'image/webp',
    });
  } catch (err) {
    console.warn('image compression failed, using original', err);
    return file;
  }
}

function replaceExt(name: string, newExt: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.${newExt}`;
}
