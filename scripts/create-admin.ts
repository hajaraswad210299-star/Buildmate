import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// 1. Load .env.local manually if not in process.env
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL || "jonathanhuang88@proton.me";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const sendResetFlag = process.argv.includes("--send-reset");

async function main() {
  console.log("==========================================");
  console.log("BuildMate — Create Admin Account Script");
  console.log("==========================================");
  console.log(`Target Admin Email : ${adminEmail}`);
  console.log(`Site URL           : ${siteUrl}`);
  console.log(`Flag --send-reset  : ${sendResetFlag ? "Ya" : "Tidak"}`);

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes("dummy") || serviceRoleKey.includes("dummy")) {
    console.error("\n❌ [ERROR] Supabase credentials belum dikonfigurasi di .env.local!");
    console.error("Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY berisi nilai nyata proyek Supabase kamu.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Cek apakah user sudah ada
    console.log("\nMemeriksa akun admin di auth.users...");
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      throw new Error(`Gagal membaca daftar pengguna: ${listError.message}`);
    }

    let existingUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );

    let isNewUser = false;

    if (!existingUser) {
      console.log(`Pengguna ${adminEmail} belum ada. Membuat akun admin baru...`);
      // Password acak 24 karakter, tidak dicetak dan tidak disimpan
      const randomPassword = crypto.randomBytes(18).toString("base64url").slice(0, 24) + "A1!";

      const { data: createdData, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        password: randomPassword,
        user_metadata: {
          full_name: "Super Admin",
          role: "admin",
        },
      });

      if (createError || !createdData.user) {
        throw new Error(`Gagal membuat akun: ${createError?.message}`);
      }

      existingUser = createdData.user;
      isNewUser = true;
      console.log("✅ Akun admin berhasil dibuat dengan email terkonfirmasi.");
    } else {
      console.log(`ℹ️ Akun ${adminEmail} sudah terdaftar (ID: ${existingUser.id}).`);
    }

    // 2. Pastikan profiles.role = 'admin'
    console.log("Memastikan role = 'admin' di public.profiles...");
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: existingUser.id,
        role: "admin",
        full_name: existingUser.user_metadata?.full_name || "Super Admin",
        onboarding_completed: true,
      }, { onConflict: "id" });

    if (profileError) {
      console.warn(`⚠️ Catatan profil: ${profileError.message}`);
    } else {
      console.log("✅ profiles.role terverifikasi sebagai 'admin'.");
    }

    // 3. Kirim email reset password jika baru dibuat atau ada flag --send-reset
    if (isNewUser || sendResetFlag) {
      console.log("\nMengirim email atur password...");
      const resetRedirectUrl = `${siteUrl}/auth/callback?next=/admin/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminEmail, {
        redirectTo: resetRedirectUrl,
      });

      if (resetError) {
        console.warn(`\n⚠️ Peringatan pengiriman email reset: ${resetError.message}`);
        console.log("Mencoba membuat link reset langsung via Supabase Admin API...");
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email: adminEmail,
          options: {
            redirectTo: resetRedirectUrl,
          },
        });

        if (linkError) {
          console.error("Gagal membuat link langsung:", linkError.message);
        } else if (linkData?.properties?.action_link) {
          console.log("\n==========================================");
          console.log("🔗 LINK ATUR PASSWORD LANGSUNG:");
          console.log(linkData.properties.action_link);
          console.log("==========================================");
        }
      } else {
        console.log(`✅ Email atur password berhasil dikirim ke ${adminEmail}!`);
        console.log(`Redirect URL: ${resetRedirectUrl}`);
      }
    } else {
      console.log("\nℹ️ Email reset tidak dikirim ulang karena akun sudah ada.");
      console.log("Jalankan dengan flag `--send-reset` untuk mengirim ulang link reset password:");
      console.log("  npx tsx scripts/create-admin.ts --send-reset");
    }

    console.log("\n==========================================");
    console.log("✅ Selesai! Akun admin siap digunakan.");
    console.log("==========================================");
  } catch (err: any) {
    console.error("\n❌ [ERROR]:", err.message || err);
    process.exit(1);
  }
}

main();
