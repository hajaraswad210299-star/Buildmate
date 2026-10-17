/**
 * Ambil status transaksi langsung dari Midtrans (server-side only).
 * Return null kalau server key tidak ada atau request gagal.
 */
export async function getMidtransTransactionStatus(providerOrderId: string): Promise<any | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey === "dummy-midtrans-server-key") return null;
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  try {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(providerOrderId)}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: "Basic " + Buffer.from(serverKey + ":").toString("base64"),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("getMidtransTransactionStatus error:", err);
    return null;
  }
}
