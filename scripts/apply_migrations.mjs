import { Client } from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const REF = "mzdijbymqepnnqlnwezv";
const PASS = "S@ngboliewa";
const PASS_ENC = encodeURIComponent(PASS); // S%40ngboliewa

// Supabase connection pooler — plusieurs régions à essayer
const POOLER_HOSTS = [
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
  `aws-0-eu-west-1.pooler.supabase.com`,
];

const MIGRATIONS = [
  "schema_supabase_rls.sql",
  "migration_nouveaux_modules.sql",
  "migration_security_shared_links.sql",
  "seed_exam_glossary.sql",
];

async function tryConnect(host, port) {
  const connStr = `postgresql://postgres.${REF}:${PASS_ENC}@${host}:${port}/postgres`;
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

async function run() {
  let client = null;

  // Essayer chaque hôte pooler (port 5432 session mode)
  for (const host of POOLER_HOSTS) {
    console.log(`🔄 Tentative: ${host}:5432...`);
    try {
      client = await tryConnect(host, 5432);
      console.log(`✅ Connecté via ${host}:5432\n`);
      break;
    } catch (e) {
      console.log(`   ❌ ${e.message.split("\n")[0]}`);
    }
    // Essai port 6543 (transaction mode)
    try {
      client = await tryConnect(host, 6543);
      console.log(`✅ Connecté via ${host}:6543\n`);
      break;
    } catch (e) {
      console.log(`   ❌ port 6543: ${e.message.split("\n")[0]}`);
    }
  }

  if (!client) {
    console.log("\n⚠️  Impossible de se connecter via le pooler.");
    console.log("Le port PostgreSQL est probablement filtré sur ce réseau.\n");
    console.log("📋 Appliquer manuellement dans Supabase SQL Editor :");
    console.log("   https://supabase.com/dashboard/project/mzdijbymqepnnqlnwezv/sql/new\n");
    MIGRATIONS.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
    return;
  }

  // Appliquer les migrations
  for (const file of MIGRATIONS) {
    const filePath = join(ROOT, file);
    const sql = readFileSync(filePath, "utf8");
    console.log(`⏳ Application de ${file}...`);
    try {
      await client.query(sql);
      console.log(`✅ ${file} — OK\n`);
    } catch (err) {
      console.error(`❌ ${file} — ${err.message.slice(0, 200)}\n`);
    }
  }

  await client.end();
  console.log("🎉 Toutes les migrations appliquées !");
}

run().catch((e) => { console.error(e.message); process.exit(1); });
