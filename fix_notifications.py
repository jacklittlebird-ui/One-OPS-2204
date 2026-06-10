import sys

with open('src/pages/Notifications.tsx', 'r') as f:
    lines = f.readlines()

# Add imports
if 'TablePagination, usePagination' not in ''.join(lines[:10]):
    lines.insert(0, 'import { TablePagination, usePagination } from "@/components/ui/table-pagination";\n')

# Add usePagination
for i, line in enumerate(lines):
    if 'const filteredNotifications = notifications.filter((n) => {' in line:
        # find end of filter
        for j in range(i, len(lines)):
            if 'return true;' in lines[j] and '  });' in lines[j+1]:
                lines.insert(j + 2, '  const { pageRows, ...pag } = usePagination(filteredNotifications, { resetKey: [filterCategory, filterRead] });\n')
                break
        break

# Replace filteredNotifications.map
for i, line in enumerate(lines):
    if 'filteredNotifications.map' in line:
        lines[i] = line.replace('filteredNotifications.map', 'pageRows.map')

# Add TablePagination after the list
for i, line in enumerate(lines):
    if '{pageRows.map((n) => {' in line:
        # find end of list
        count = 0
        for j in range(i, len(lines)):
            if '{' in lines[j]: count += lines[j].count('{')
            if '}' in lines[j]: count -= lines[j].count('}')
            if count == 0:
                lines.insert(j + 1, '              <TablePagination {...pag} />\n')
                break
        break

with open('src/pages/Notifications.tsx', 'w') as f:
    f.writelines(lines)
