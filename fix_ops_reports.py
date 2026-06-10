import sys

with open('src/pages/OperationsReports.tsx', 'r') as f:
    lines = f.readlines()

# Add imports
if 'TablePagination, usePagination' not in ''.join(lines[:10]):
    lines.insert(0, 'import { TablePagination, usePagination } from "@/components/ui/table-pagination";\n')

# Find StatsTable and add pagination
new_lines = []
in_stats_table = False
for line in lines:
    if 'function StatsTable({' in line:
        in_stats_table = True
    
    if in_stats_table and 'const sorted = [...rows].sort((a, b) => b.count - a.count);' in line:
        new_lines.append(line)
        new_lines.append('  const { pageRows, ...pag } = usePagination(sorted, { resetKey: [sorted.length] });\n')
        continue
    
    if in_stats_table and 'sorted.map(r => (' in line:
        new_lines.append(line.replace('sorted.map', 'pageRows.map'))
        continue
    
    if in_stats_table and '</table>' in line:
        new_lines.append(line)
        new_lines.append('          </div>\n')
        new_lines.append('          <TablePagination {...pag} />\n')
        continue
    
    if in_stats_table and '</div>' in line and '          <div className="overflow-x-auto">' in ''.join(new_lines[-5:]):
         # This is the end of the table container
         pass

    new_lines.append(line)

# Clean up duplicate div closures if any
# Actually, I'll just use a more careful replacement for StatsTable rendering.
with open('src/pages/OperationsReports.tsx', 'w') as f:
    f.writelines(new_lines)
