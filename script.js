const fs = require('fs');
const file = 'd:/jumla/src/app/(app)/admin/admin-client.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            <button 
              onClick={() => setActiveTab("merchantBilling")}
              className={cn(
                "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                activeTab === "merchantBilling" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              التحاسب والفواتير
            </button>
          </div>
        </div>`;

const replacement = `            <button 
              onClick={() => setActiveTab("merchantBilling")}
              className={cn(
                "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                activeTab === "merchantBilling" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              التحاسب والفواتير
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
          </div>
        </div>`;

content = content.replace(target, replacement);

const targetTabContent = `        {/* MERCHANT BILLING TAB */}
        {activeTab === "merchantBilling" && (
          <div className="animate-in fade-in duration-300">
            <MerchantBillingAdmin />
          </div>
        )}`;

const replacementTabContent = `        {/* MERCHANT BILLING TAB */}
        {activeTab === "merchantBilling" && (
          <div className="animate-in fade-in duration-300">
            <MerchantBillingAdmin />
          </div>
        )}

        {/* EMPLOYEE PRODUCTIVITY TAB */}
        {activeTab === "productivity" && (
          <div className="animate-in fade-in duration-300">
            <MaterialsProductivity />
          </div>
        )}`;

content = content.replace(targetTabContent, replacementTabContent);

fs.writeFileSync(file, content, 'utf8');
console.log('Tabs updated!');
