/**
 * WhatsApp templates according to B15
 */

export function createWaUrl(phone: string, text: string): string {
  // Normalize phone to format like 628xxx
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export const WA_TEMPLATES = {
  adminToWorkerOffer: ({
    workerName,
    orderCode,
    packageName,
    serviceArea,
    date,
    timeSlot,
    portalUrl = "https://buildmate.id/mitra",
  }: {
    workerName: string;
    orderCode: string;
    packageName: string;
    serviceArea: string;
    date: string;
    timeSlot: string;
    portalUrl?: string;
  }) =>
    `Halo Pak/Bu ${workerName}, ada pesanan BuildMate ${orderCode}: ${packageName} di ${serviceArea} untuk ${date}, ${timeSlot}. Silakan buka portal mitra untuk menerima: ${portalUrl}. (Jika belum punya akun, balas pesan ini untuk konfirmasi.)`,

  adminToCustomer: ({
    customerName,
    orderCode,
    workerName,
    date,
    timeSlot,
  }: {
    customerName: string;
    orderCode: string;
    workerName: string;
    date: string;
    timeSlot: string;
  }) =>
    `Halo ${customerName}, pesanan BuildMate ${orderCode} sudah kami terima. Tukang ${workerName} akan datang ${date}, ${timeSlot}.`,

  workerToCustomer: ({
    customerName,
    workerName,
    orderCode,
    date,
    timeSlot,
  }: {
    customerName: string;
    workerName: string;
    orderCode: string;
    date: string;
    timeSlot: string;
  }) =>
    `Halo ${customerName}, saya ${workerName} dari BuildMate untuk pesanan ${orderCode}. Saya akan datang ${date}, ${timeSlot}.`,

  customerToAdmin: ({ orderCode }: { orderCode: string }) =>
    `Halo BuildMate, saya butuh bantuan untuk pesanan ${orderCode}.`,
};
