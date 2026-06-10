import sys

with open('src/pages/AuditLog.tsx', 'r') as f:
    lines = f.readlines()

# Add imports
if 'TablePagination, usePagination' not in ''.join(lines[:10]):
    lines.insert(0, 'import { TablePagination, usePagination } from "@/components/ui/table-pagination";\n')

# Remove manual pagination variables
new_lines = []
skip_query = False
for line in lines:
    if 'const [page, setPage] = useState(1);' in line: continue
    if 'const [pageSize, setPageSize] = useState(50);' in line: continue
    if 'setPage(1);' in line: continue
    if 'queryKey: ["audit_logs", "page", filters, page, pageSize],' in line:
        new_lines.append('    queryKey: ["audit_logs", filters],\n')
        continue
    if 'const from = (page - 1) * pageSize;' in line: continue
    if 'const to = from + pageSize - 1;' in line: continue
    if '.range(from, to)' in line: continue
    if '.select("*", { count: "exact" })' in line:
        new_lines.append('        .select("*")\n')
        continue
    if 'return { rows: (data || []) as AuditLogEntry[], total: count || 0 };' in line:
        new_lines.append('      return (data || []) as AuditLogEntry[];\n')
        continue
    if 'const rows = pageData?.rows || [];' in line: continue
    if 'const total = pageData?.total || 0;' in line:
        new_lines.append('  const allLogs = pageData || [];\n')
        new_lines.append('  const { pageRows, ...pag } = usePagination(allLogs, { resetKey: [filters] });\n')
        new_lines.append('  const total = allLogs.length;\n')
        continue
    if 'const totalPages = Math.max(1, Math.ceil(total / pageSize));' in line: continue
    if 'const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;' in line: continue
    if 'const toRow = Math.min(page * pageSize, total);' in line: continue
    if 'rows.map((log) => {' in line:
        new_lines.append(line.replace('rows.map', 'pageRows.map'))
        continue
    if 'rows.length === 0 ? (' in line:
        new_lines.append(line.replace('rows.length === 0', 'pageRows.length === 0'))
        continue
    new_lines.append(line)

lines = new_lines

# Replace pagination footer
start_footer = -1
end_footer = -1
for i, line in enumerate(lines):
    if '{/* Pagination footer */}' in line:
        start_footer = i
        # Find closing </div>
        count = 0
        for j in range(i + 1, len(lines)):
            if 'total > 0 && (' in lines[j]:
                inner_count = 1
                for k in range(j + 1, len(lines)):
                    if '{' in lines[k]: inner_count += lines[k].count('{')
                    if '}' in lines[k]: inner_count -= lines[k].count('}')
                    if inner_count == 0:
                        end_footer = k
                        break
                break
        break

if start_footer != -1 and end_footer != -1:
    lines[start_footer:end_footer+1] = ['          <TablePagination {...pag} />\n']

with open('src/pages/AuditLog.tsx', 'w') as f:
    f.writelines(lines)
