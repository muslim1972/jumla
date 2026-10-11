#!/usr/bin/env node
/**
 * حارس الطابوق المعماري لنظام جملتي (Jumla Brick Guard)
 * ======================================================
 * يفحص:
 * 1. تغطية 100% لكافة ملفات `src/` داخل سجل الطابوق (registry.json)
 * 2. عدم وجود أي ملف يتيم أو متكرر الملكية بين طابوقتين
 * 3. وجود كافة الملفات المسجلة فعلياً على القرص
 * 4. مقارنة البصمات (fingerprints.json) لكشف التغييرات غير المعتمدة
 *
 * الاستخدام:
 *   node scripts/verify-bricks.mjs
 *   node scripts/verify-bricks.mjs --snapshot  (لتحديث بصمات الملفات بعد الاعتماد)
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
  console.log('\n=== حارس الطابوق لنظام جملتي (OPS-JUMLA-01) ===');

  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error(`❌ خطأ جسيم: سجل الطابوق غير موجود: ${REGISTRY_FILE}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const bricks = registry.bricks || {};
  const brickIds = Object.keys(bricks);

  console.log(`عدد الطابوقات المسجلة: ${brickIds.length}`);

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

  // 1. فحص الملكية المزدوجة
  const duplicates = [];
  for (const [file, count] of fileOwnershipCount.entries()) {
    if (count > 1) {
      duplicates.push(file);
    }
  }

  // 2. فحص ملفات src الحالية
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
    console.error('\n❌ خطأ: ملفات تتنازع عليها أكثر من طابوقة:');
    duplicates.forEach(d => console.error(`  - ${d}`));
    hasErrors = true;
  }

  if (missingFiles.length > 0) {
    console.error('\n❌ خطأ: ملفات مسجلة في الطابوق ولكنها غير موجودة على القرص:');
    missingFiles.forEach(m => console.error(`  - [${m.brickId}] ${m.file}`));
    hasErrors = true;
  }

  if (orphanFiles.length > 0) {
    console.error('\n❌ خطأ: ملفات جديدة في src غير منسوبة لأي طابوقة في bricks/registry.json:');
    orphanFiles.forEach(o => console.error(`  - ${o}`));
    hasErrors = true;
  }

  // 3. فحص البصمات
  if (updateSnapshot) {
    const newFingerprints = {};
    for (const f of actualSrcFiles) {
      newFingerprints[f] = computeMd5(f);
    }
    fs.writeFileSync(FINGERPRINTS_FILE, JSON.stringify(newFingerprints, null, 2), 'utf-8');
    console.log(`\n📸 تم تحديث البصمات بنجاح (${actualSrcFiles.length} ملف) في bricks/fingerprints.json`);
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
    console.error('\n❌ فشل فحص حارس الطابوق! صحّح الأخطاء أعلاه قبل المتابعة.\n');
    process.exit(1);
  }

  console.log('\n✓ نجح فحص حارس الطابوق: كافة ملفات النظام محصية ومعزولة بدون أي تداخل.\n');
}

run();
