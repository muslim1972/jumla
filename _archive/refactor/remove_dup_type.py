path = r"src/app/(app)/admin/admin-client.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'export type AdminTab =' in line and 'AdminClientProps' not in line:
        # skip this line
        continue
    new_lines.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("REMOVED DUPLICATE TYPE DEFINITION")
