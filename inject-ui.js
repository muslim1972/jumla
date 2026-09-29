const fs = require('fs');
const file = 'd:/jumla/src/features/materials/components/materials-manager.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetUI = `<Input id={\`\${formId}-description\`} name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>`;

const replacementUI = `<Input id={\`\${formId}-description\`} name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      
      {/* نافذة التنبيه الذكية للمواد المتشابهة */}
      {similarProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
            <AlertCircle className="w-4 h-4" />
            تنبيه: توجد مواد متشابهة بالاسم
          </div>
          <p className="text-xs text-amber-600 mb-2">
            يرجى التأكد من أنك لا تقوم بإدخال مادة مكررة. هذه المواد مسجلة مسبقاً:
          </p>
          <ul className="space-y-1">
            {similarProducts.map((p, i) => (
              <li key={i} className="text-xs bg-white/50 p-1.5 rounded flex flex-col sm:flex-row sm:items-center justify-between border border-amber-100">
                <span className="font-semibold text-gray-800">{p.name} <span className="font-normal text-gray-600">{p.description ? \`- \${p.description}\` : ''}</span></span>
                {p.barcode && <span className="text-gray-500 text-[10px] bg-gray-100 px-1.5 rounded">باركود: {p.barcode}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}`;

content = content.replace(targetUI, replacementUI);
fs.writeFileSync(file, content, 'utf8');
console.log('Injected UI warning!');
