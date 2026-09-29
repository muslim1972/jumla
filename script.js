const fs = require('fs');
const file = 'd:/jumla/src/app/(app)/admin/admin-client.tsx';
let content = fs.readFileSync(file, 'utf8');

// Inject the button
content = content.replace(
  /التحاسب والفواتير\s*<\/button>\s*<\/div>/,
  `التحاسب والفواتير
            </button>
            <button 
              onClick={() => setActiveTab("productivity")}
              className={cn(
                "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                activeTab === "productivity" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              أداء الموظفين
            </button>
          </div>`
);

// Inject the tab content
content = content.replace(
  /<MerchantBillingAdmin \/>\s*<\/div>\s*\)}/,
  `<MerchantBillingAdmin />
          </div>
        )}

        {/* EMPLOYEE PRODUCTIVITY TAB */}
        {activeTab === "productivity" && (
          <div className="animate-in fade-in duration-300">
            <MaterialsProductivity />
          </div>
        )}`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed tabs!');
