import sys

with open('src/pages/IrregularityReports.tsx', 'r') as f:
    lines = f.readlines()

# Add imports
if 'TablePagination, usePagination' not in ''.join(lines[:10]):
    lines.insert(0, 'import { TablePagination, usePagination } from "@/components/ui/table-pagination";\n')

# Remove manual pagination variables
new_lines = []
for line in lines:
    if 'const PAGE_SIZE = 15;' in line: continue
    if 'const [page, setPage] = useState(1);' in line: continue
    if 'const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));' in line: continue
    if 'const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);' in line: continue
    line = line.replace('setPage(1);', '')
    new_lines.append(line)

lines = new_lines

# Add usePagination
for i, line in enumerate(lines):
    if 'const filtered = useMemo(() => {' in line:
        for j in range(i, len(lines)):
            if '}, [reports, statusFilter, search]);' in lines[j]:
                lines.insert(j + 1, '  const { pageRows, ...pag } = usePagination(filtered, { resetKey: [statusFilter, search] });\n')
                break
        break

# Replace pageData.map
for i, line in enumerate(lines):
    if 'pageData.map' in line:
        lines[i] = line.replace('pageData.map', 'pageRows.map')
    if 'pageData.length === 0' in line:
        lines[i] = line.replace('pageData.length === 0', 'pageRows.length === 0')

# Replace pagination footer
start_footer = -1
end_footer = -1
for i, line in enumerate(lines):
    if '{filtered.length > 0 && (' in line:
        start_footer = i
        count = 0
        for j in range(i, len(lines)):
            if '{' in lines[j]: count += lines[j].count('{')
            if '}' in lines[j]: count -= lines[j].count('}')
            if count == 0:
                end_footer = j
                break
        break

if start_footer != -1:
    lines[start_footer:end_footer+1] = ['        <TablePagination {...pag} />\n']

with open('src/pages/IrregularityReports.tsx', 'w') as f:
    f.writelines(lines)
