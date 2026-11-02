import { assert } from "./platform.js";

export function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "").replace(/^00/, "");
  if (/^0\d{9}$/.test(digits)) return `255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `255${digits}`;
  if (/^2550\d{9}$/.test(digits)) return `255${digits.slice(4)}`;
  return digits;
}
export function validPhone(value: string) {
  const phone = normalizePhone(value);
  assert(
    /^[1-9]\d{8,14}$/.test(phone),
    400,
    "Weka namba sahihi, pamoja na country code kwa namba ya nje.",
  );
  return phone;
}
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(
        u.hostname,
      ) ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export function attachmentKind(bytes: Uint8Array, mime: string) {
  const ascii = (start: number, end: number) =>
    Buffer.from(bytes.slice(start, end)).toString("ascii");
  if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image";
  if (
    mime === "image/png" &&
    Buffer.from(bytes.slice(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image";
  if (mime === "image/webp" && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image";
  if (
    mime === "audio/webm" &&
    Buffer.from(bytes.slice(0, 4)).equals(Buffer.from([26, 69, 223, 163]))
  )
    return "audio";
  if (mime === "audio/ogg" && ascii(0, 4) === "OggS") return "audio";
  if ((mime === "audio/mp4" || mime === "audio/x-m4a") && ascii(4, 8) === "ftyp") return "audio";
  if (
    mime === "audio/mpeg" &&
    (ascii(0, 3) === "ID3" || (bytes[0] === 255 && ((bytes[1] || 0) & 224) === 224))
  )
    return "audio";
  if (
    (mime === "audio/wav" || mime === "audio/x-wav") &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 12) === "WAVE"
  )
    return "audio";
  assert(
    false,
    415,
    "Faili halitambuliki. Tumia JPG, PNG, WebP au sauti ya WebM, MP3, M4A, OGG, WAV.",
  );
}
