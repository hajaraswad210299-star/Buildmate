import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

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

async function setPassword(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    console.error("❌ Password minimal 8 karakter!");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Gagal membaca daftar user:", listError.message);
    process.exit(1);
  }

  const user = (usersData.users as any[]).find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  if (!user) {
    console.error(`❌ User ${adminEmail} tidak ditemukan di auth.users!`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error("❌ Gagal memperbarui password:", updateError.message);
    process.exit(1);
  }

  // Pastikan profile admin terdaftar
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      role: "admin",
      full_name: user.user_metadata?.full_name || "Super Admin",
      onboarding_completed: true,
    },
    { onConflict: "id" }
  );

  console.log("\n==========================================");
  console.log("✅ KATA SANDI ADMIN BERHASIL DIATUR!");
  console.log(`Email : ${adminEmail}`);
  console.log("Kamu sekarang bisa langsung login di:");
  console.log("👉 http://localhost:3000/admin/login");
  console.log("==========================================");
  process.exit(0);
}

const argPassword = process.argv[2];

if (argPassword) {
  setPassword(argPassword);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Masukkan password baru untuk admin: ", (answer) => {
    rl.close();
    setPassword(answer.trim());
  });
}
