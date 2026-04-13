import { AiEngineError } from "@/lib/ai/errors";

/**
 * Foydalanuvchiga Telegramda ko‘rinadigan qisqa, tushunarli xabarlar.
 */
export function formatUserFacingError(error: unknown): string {
  if (error instanceof AiEngineError) {
    switch (error.code) {
      case "MISSING_API_KEY":
        return "Server sozlamasi to‘liq emas (API kalit). Administratorga murojaat qiling.";
      case "MISSING_PROVIDER":
        return "AI provayderi sozlanmagan. Administrator .env faylini tekshirsin.";
      case "HTTP_ERROR":
        return "AI xizmatiga ulanishda muammo bo‘ldi. Birozdan keyin qayta urinib ko‘ring.";
      case "EMPTY_CONTENT":
        return "AI bo‘sh javob qaytardi. Matningizni qisqartirib yoki boshqacha yozib yuboring.";
      case "INVALID_JSON":
        return "AI javobi noto‘g‘ri formatda keldi. Qayta urinib ko‘ring.";
      case "VALIDATION_FAILED":
        return "Sayt sxemasi tekshiruvidan o‘tmadi. Boshqa tasvir bilan qayta urinib ko‘ring.";
      case "TRANSCRIPTION_FAILED":
        return "Ovozni matnga aylantirishda muammo. Qisqaroq yozib yuboring yoki matn bilan qayta urinib ko‘ring.";
      default:
        return "Noma’lum texnik xato. Keyinroq urinib ko‘ring.";
    }
  }

  if (error instanceof Error) {
    return `Xato: ${error.message}`;
  }

  return "Kutilmagan xato yuz berdi. Keyinroq urinib ko‘ring.";
}
