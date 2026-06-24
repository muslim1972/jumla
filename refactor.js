const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const componentsDir = path.join(srcDir, 'components');
const featuresDir = path.join(srcDir, 'features');

// Mapping of filename to new relative directory (from src/)
const moveMap = {
  // Global
  'floating-app-menu.tsx': 'components/global',
  'floating-menu-provider.tsx': 'components/global',
  'floating-contact-button.tsx': 'components/global',
  'floating-top-right.tsx': 'components/global',
  'scroll-to-top.tsx': 'components/global',
  'theme-provider.tsx': 'components/global',
  'mode-toggle.tsx': 'components/global',
  'sign-out-button.tsx': 'components/global',
  'top-announcement-bar.tsx': 'components/global',
  'promo-banners.tsx': 'components/global',
  
  // Products
  'product-card.tsx': 'features/products/components',
  'product-explorer.tsx': 'features/products/components',
  
  // Cart
  'add-to-cart-button.tsx': 'features/cart/components',
  
  // Orders
  'invoice-preview.tsx': 'features/orders/components',
  'checkout-dialog.tsx': 'features/orders/components',
  'my-orders.tsx': 'features/orders/components',
  'archive-dialog.tsx': 'features/orders/components',
  
  // Merchant
  'merchant-settings.tsx': 'features/merchant/components',
  'merchant-billing-admin.tsx': 'features/merchant/components',
  'merchant-tabs.tsx': 'features/merchant/components',
  'realtime-billing-listener.tsx': 'features/merchant/components',
  
  // Admin
  'audit-log-viewer.tsx': 'features/admin/components',
  
  // User
  'user-profile-modal.tsx': 'features/user/components'
};

// 1. Create directories and move files
for (const [filename, newRelDir] of Object.entries(moveMap)) {
  const oldPath = path.join(componentsDir, filename);
  const newDirPath = path.join(srcDir, newRelDir);
  const newPath = path.join(newDirPath, filename);
  
  if (fs.existsSync(oldPath)) {
    if (!fs.existsSync(newDirPath)) {
      fs.mkdirSync(newDirPath, { recursive: true });
    }
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${filename} to ${newRelDir}`);
  }
}

// 2. Update imports in all .ts and .tsx files
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  for (const [filename, newRelDir] of Object.entries(moveMap)) {
    const basename = filename.replace('.tsx', '');
    
    // We want to replace `@/components/basename` with `@/${newRelDir}/basename`
    const oldImport1 = `\\@/components/${basename}`;
    const newImport1 = `@/${newRelDir}/${basename}`;
    
    const regex1 = new RegExp(oldImport1, 'g');
    if (regex1.test(content)) {
      content = content.replace(regex1, newImport1);
      hasChanges = true;
    }
    
    // Also handle relative imports if any exist, like `../components/basename`
    if (file.includes('components')) {
      const oldImport2 = `\\./${basename}`;
      const regex2 = new RegExp(oldImport2, 'g');
      if (regex2.test(content)) {
         content = content.replace(regex2, `@/${newRelDir}/${basename}`);
         hasChanges = true;
      }
      const oldImport3 = `\\.\\./components/${basename}`;
      const regex3 = new RegExp(oldImport3, 'g');
      if (regex3.test(content)) {
         content = content.replace(regex3, `@/${newRelDir}/${basename}`);
         hasChanges = true;
      }
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  }
}

console.log("Refactoring complete.");
