const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoSizeInBytes = 5 * 1024 * 1024;

export async function validateRecommendationPhoto(file: File): Promise<string | null> {
  if (!allowedPhotoTypes.has(file.type)) {
    return "Envie uma foto JPG, PNG ou WebP.";
  }

  if (file.size > maxPhotoSizeInBytes) {
    return "A foto precisa ter no máximo 5 MB.";
  }

  if (!(await hasValidImageSignature(file))) {
    return "O arquivo enviado não parece ser uma imagem válida.";
  }

  return null;
}

export function getRecommendationPhotoExtension(file: File): string {
  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (file.type === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}
