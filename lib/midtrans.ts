import crypto from "crypto";

export interface SnapTransactionParams {
  orderId: string; // e.g. ORD-BM-241012-0007 or SUB-uuid
  grossAmount: number;
  customerDetails: {
    first_name: string;
    email: string;
    phone: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface SnapTransactionResult {
  token?: string;
  redirect_url?: string;
  error?: string;
}

/**
 * Creates a real Midtrans Snap transaction via Midtrans API.
 * Follows SPEC_CUSTOMER.md section B12 & B20.
 */
export async function createMidtransSnapTransaction(
  params: SnapTransactionParams
): Promise<SnapTransactionResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey === "dummy-midtrans-server-key") {
    console.warn("MIDTRANS_SERVER_KEY is not configured or is placeholder in .env.local");
    return {
      error:
        "MIDTRANS_SERVER_KEY belum dikonfigurasi. Masukkan Server Key Midtrans Sandbox di .env.local.",
    };
  }

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const endpoint = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const authHeader =
    "Basic " + Buffer.from(serverKey + ":").toString("base64");

  // Midtrans rule: sum of item_details must equal gross_amount
  const sumItems = params.itemDetails.reduce(
    (acc, it) => acc + it.price * it.quantity,
    0
  );

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: sumItems === params.grossAmount ? params.grossAmount : sumItems,
    },
    item_details: params.itemDetails,
    customer_details: {
      first_name: params.customerDetails.first_name || "Pelanggan",
      email: params.customerDetails.email || "pelanggan@buildmate.id",
      phone: params.customerDetails.phone || "081200000000",
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      const errorMsg =
        (Array.isArray(data.error_messages) && data.error_messages.join(", ")) ||
        data.message ||
        `Gagal membuat transaksi Midtrans (HTTP ${res.status})`;
      console.error("Midtrans Snap error response:", data);
      return { error: errorMsg };
    }

    return {
      token: data.token,
      redirect_url: data.redirect_url,
    };
  } catch (err: any) {
    console.error("Midtrans Snap fetch failed:", err);
    return {
      error: err?.message || "Gagal menghubungi server Midtrans Snap.",
    };
  }
}

/**
 * Verifies Midtrans Webhook signature:
 * signature_key = sha512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;

  const expected = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");

  return expected === signatureKey;
}
