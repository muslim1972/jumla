const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

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
  
  // Find relative imports that were looking for ./ui/ and change them to @/components/ui/
  if (content.includes('./ui/')) {
    content = content.replace(/\.\/ui\//g, '@/components/ui/');
    hasChanges = true;
  }
  if (content.includes('../ui/')) {
    content = content.replace(/\.\.\/ui\//g, '@/components/ui/');
    hasChanges = true;
  }
  
  if (hasChanges) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated UI imports in ${file}`);
  }
}

console.log("UI imports fixed.");
