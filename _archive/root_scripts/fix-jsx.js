const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

// The faulty injection is:
/*
        </CardContent>
        
        {/* نافذة إضافة مادة مركزية جديدة (خاصية مشتركة مع إدارة المواد) *}
        <Dialog open={showCreateMasterModal} onOpenChange={setShowCreateMasterModal}>
          ...
        </Dialog>
      )}
*/

// I need to move it outside the )} block
const dialogRegex = /        \{\/\* نافذة إضافة مادة مركزية جديدة \(خاصية مشتركة مع إدارة المواد\) \*\/\}([\s\S]*?)<\/Dialog>\n      \)\}/g;

content = content.replace(dialogRegex, (match, dialogContent) => {
  return `      )}\n        {/* نافذة إضافة مادة مركزية جديدة (خاصية مشتركة مع إدارة المواد) */}${dialogContent}</Dialog>`;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed JSX structure!');
