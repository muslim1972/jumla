const fs = require('fs');
const file = 'd:/jumla/src/features/warehouse/components/warehouse-add-item.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => pickMaster(p)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:border-brand-orange/50 hover:bg-brand-orange/5 text-right transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold truncate">{p.name}</span>
                        {p.origin === 'merchant' && (
                          <span className="text-[9px] font-bold bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full border border-brand-orange/30">🌱</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.units.map(u => u.type).join(" · ")}{p.category_name ? \` — \${p.category_name}\` : ""}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-brand-orange shrink-0" />
                  </button>
                ))}
              </div>`;

const replacement = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.map(p => {
                  const isLinked = linkedMasterIds.has(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isLinked && pickMaster(p)}
                      disabled={isLinked}
                      className={\`flex items-center gap-3 p-3 rounded-xl border text-right transition-colors \${isLinked ? 'border-border/40 bg-muted/30 opacity-70 cursor-not-allowed' : 'border-border/70 hover:border-brand-orange/50 hover:bg-brand-orange/5'}\`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          : <Package className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold truncate">{p.name}</span>
                          {p.origin === 'merchant' && (
                            <span className="text-[9px] font-bold bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full border border-brand-orange/30">🌱</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.units.map(u => u.type).join(" · ")}{p.category_name ? \` — \${p.category_name}\` : ""}
                        </div>
                      </div>
                      {isLinked ? (
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md shrink-0">
                          مضافة مسبقاً
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-brand-orange shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Results UI updated');
