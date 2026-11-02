path = r"src/app/(app)/admin/admin-client.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix banners tab missing closing </div>
target_banners_close = """                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="h-9 w-9 cursor-pointer shrink-0"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}"""

replace_banners_close = """                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="h-9 w-9 cursor-pointer shrink-0"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}"""

code_norm = code.replace("\r\n", "\n")
target_norm = target_banners_close.replace("\r\n", "\n")
if target_norm in code_norm:
    code_norm = code_norm.replace(target_norm, replace_banners_close.replace("\r\n", "\n"), 1)
    print("FIX BANNERS CLOSE: SUCCESS")
else:
    print("FIX BANNERS CLOSE: TARGET NOT FOUND")

# 2. Fix JSX comment in users ternary
target_comment = """            ) : (
              {/* حاوية محددة الارتفاع مع ترويسة ثابتة وسكرول داخلي لقائمة المستخدمين */}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [scrollbar-width:thin] border border-border/60 rounded-xl">"""

replace_comment = """            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [scrollbar-width:thin] border border-border/60 rounded-xl">"""

target_c_norm = target_comment.replace("\r\n", "\n")
if target_c_norm in code_norm:
    code_norm = code_norm.replace(target_c_norm, replace_comment.replace("\r\n", "\n"), 1)
    print("FIX COMMENT: SUCCESS")
else:
    print("FIX COMMENT: TARGET NOT FOUND")

with open(path, "w", encoding="utf-8") as f:
    f.write(code_norm)
