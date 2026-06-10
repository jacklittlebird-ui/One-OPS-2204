import sys

with open('src/pages/AllClearanceFlights.tsx', 'r') as f:
    lines = f.readlines()

# Fix imports
if 'import { TablePagination, usePagination }' not in lines[0]:
    lines.insert(0, 'import { TablePagination, usePagination } from "@/components/ui/table-pagination";\n')

# Find filtered declaration and add usePagination
for i, line in enumerate(lines):
    if 'const filtered = useMemo(() => {' in line:
        # find the end of useMemo
        for j in range(i, len(lines)):
            if '}, [scopedFlights, search, statusFilter, typeFilter, airlineMap]);' in lines[j]:
                lines.insert(j + 1, '\n  const { pageRows, ...pag } = usePagination(filtered, { resetKey: [search, statusFilter, typeFilter] });\n')
                break
        break

# Replace filtered.map with pageRows.map
for i, line in enumerate(lines):
    if 'filtered.map' in line and 'const allTypes' not in line:
        lines[i] = line.replace('filtered.map', 'pageRows.map')

# Add TablePagination after table
# Remove any mess from previous sed
new_lines = []
skip = False
for i, line in enumerate(lines):
    if '</table>' in line:
        new_lines.append(line)
        new_lines.append('        </div>\n')
        new_lines.append('        <TablePagination {...pag} />\n')
        skip = True
    elif skip and '</div>' in line:
        # Skip the next </div> if it was part of the mess
        skip = False
        continue
    elif skip and '<TablePagination' in line:
        continue
    else:
        new_lines.append(line)

with open('src/pages/AllClearanceFlights.tsx', 'w') as f:
    f.writelines(new_lines)
