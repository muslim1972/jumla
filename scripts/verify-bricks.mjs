#!/usr/bin/env node
/**
 * محرك الإنفاذ الحتمي لإطار B.R.I.C.K (The Deterministic Sentinel Engine - OPS-03)
 * تطبيق منصة جملتي (Jumla) — استناداً إلى الورقة البحثية للباحث م. مسلم عقيل عبد الحسن العنزي
 * =========================================================================================
 * يفحص المسلمات الحتمية:
 * 1. مسلمة شمولية التغطية (Zero Orphans): تغطية 100% لكافة ملفات `src/` داخل سجل الأنوية (registry.json)
 * 2. مسلمة الحيازة الأحادية المطلقة (Exclusive Ownership): عدم وجود أي ملف يتيم أو متكرر الملكية بين نواتين
 * 3. التحقق الهيكلي من وجود كافة الملفات المسجلة فعلياً على القرص
 * 4. مسلمة مطابقة الحالة التشفيرية (Cryptographic State Invariant): مقارنة البصمات (fingerprints.json)
 *
 * الاستخدام:
 *   node scripts/verify-bricks.mjs
 *   node scripts/verify-bricks.mjs --snapshot  (لتحديث البصمات المعتمدة بعد إقرار التعديل)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REGISTRY_FILE = path.join(ROOT_DIR, 'bricks', 'registry.json');
const FINGERPRINTS_FILE = path.join(ROOT_DIR, 'bricks', 'fingerprints.json');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const updateSnapshot = process.argv.includes('--snapshot');

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(normalizePath(path.relative(ROOT_DIR, fullPath)));
    }
  }
  return arrayOfFiles;
}

function computeMd5(filePath) {
  const fullPath = path.join(ROOT_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;
  const content = fs.readFileSync(fullPath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function run() {
  console.log('\n=== محرك الإنفاذ الحتمي لإطار B.R.I.C.K (OPS-03 / Jumla) ===');

  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error(`❌ خطأ جسيم: سجل الأنوية المعمارية غير موجود: ${REGISTRY_FILE}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const bricks = registry.bricks || {};
  const brickIds = Object.keys(bricks);

  console.log(`عدد الأنوية المعمارية B.R.I.C.K المسجلة: ${brickIds.length}`);

  const registeredFiles = new Map();
  const fileOwnershipCount = new Map();
  const missingFiles = [];

  for (const [brickId, brick] of Object.entries(bricks)) {
    const files = brick.files || [];
    for (const f of files) {
      const norm = normalizePath(f);
      registeredFiles.set(norm, brickId);
      fileOwnershipCount.set(norm, (fileOwnershipCount.get(norm) || 0) + 1);

      const fullPath = path.join(ROOT_DIR, norm);
      if (!fs.existsSync(fullPath)) {
        missingFiles.push({ brickId, file: norm });
      }
    }
  }

  // 1. فحص الحيازة الأحادية ومنع الملكية المزدوجة (المسلمة 2)
  const duplicates = [];
  for (const [file, count] of fileOwnershipCount.entries()) {
    if (count > 1) {
      duplicates.push(file);
    }
  }

  // 2. فحص شمولية التغطية وانعدام الأيتام (المسلمة 1)
  const actualSrcFiles = getAllFiles(SRC_DIR);
  const orphanFiles = [];

  for (const f of actualSrcFiles) {
    if (!registeredFiles.has(f)) {
      orphanFiles.push(f);
    }
  }

  // طباعة التقارير
  console.log(`تغطية src: ${actualSrcFiles.length - orphanFiles.length}/${actualSrcFiles.length} (${orphanFiles.length === 0 ? '100%' : 'ناقصة'})`);

  let hasErrors = false;

  if (duplicates.length > 0) {
    console.error('\n❌ خطأ: ملفات تتنازع عليها أكثر من نواة معمارية B.R.I.C.K (انتهاك المسلمة 2):');
    duplicates.forEach(d => console.error(`  - ${d}`));
    hasErrors = true;
  }

  if (missingFiles.length > 0) {
    console.error('\n❌ خطأ: ملفات معلنة في سجل الأنوية ولكنها غير موجودة على القرص:');
    missingFiles.forEach(m => console.error(`  - [${m.brickId}] ${m.file}`));
    hasErrors = true;
  }

  if (orphanFiles.length > 0) {
    console.error('\n❌ خطأ: ملفات جديدة في src غير منسوبة لأي نواة معمارية في bricks/registry.json (انتهاك المسلمة 1):');
    orphanFiles.forEach(o => console.error(`  - ${o}`));
    hasErrors = true;
  }

  // 3. فحص البصمات ومطابقة الحالة التشفيرية (المسلمة 3)
  if (updateSnapshot) {
    const newFingerprints = {};
    for (const f of actualSrcFiles) {
      newFingerprints[f] = computeMd5(f);
    }
    fs.writeFileSync(FINGERPRINTS_FILE, JSON.stringify(newFingerprints, null, 2), 'utf-8');
    console.log(`\n📸 تم تحديث البصمات التشفيرية بنجاح (${actualSrcFiles.length} ملف) في bricks/fingerprints.json`);
  } else {
    if (fs.existsSync(FINGERPRINTS_FILE)) {
      const savedFingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS_FILE, 'utf-8'));
      let changedFilesCount = 0;
      for (const f of actualSrcFiles) {
        const currentHash = computeMd5(f);
        if (savedFingerprints[f] !== currentHash) {
          changedFilesCount++;
        }
      }
      if (changedFilesCount > 0) {
        console.log(`ℹ ملاحظة: ${changedFilesCount} ملفات معدلة عن آخر بصمة معتمدة (طبيعي أثناء التطوير؛ حدّث بـ --snapshot بعد الاعتماد).`);
      }
    } else {
      console.log('ℹ لا يوجد ملف بصمات سابق. شغّل --snapshot لإنشاء نقطة الأساس.');
    }
  }

  if (hasErrors) {
    console.error('\n❌ فشل فحص محرك الإنفاذ الحتمي لإطار B.R.I.C.K! صحّح الأخطاء أعلاه قبل المتابعة.\n');
    process.exit(1);
  }

  console.log('\n✓ نجح فحص محرك الإنفاذ الحتمي لإطار B.R.I.C.K: كافة ملفات النظام محصية ومعزولة سيادياً دون أي تداخل.\n');
}

run();
