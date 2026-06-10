import sys

with open('src/pages/OperationsReports.tsx', 'r') as f:
    content = f.read()

# Replace the messy part
import re
pattern = r'</table>\s+</div>\s+</div>\s+<TablePagination {\.\.\.pag} />\s+</div>\s+</div>'
# Wait, let's be more precise.
# I'll look for the end of the StatsTable.

# Better: just read lines and fix the sequence.
with open('src/pages/OperationsReports.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if '</table>' in line:
        new_lines.append(line)
        new_lines.append('            </div>\n')
        new_lines.append('            <TablePagination {...pag} />\n')
        # Skip next few lines if they are my previous mess
        j = i + 1
        while j < len(lines) and ('</div>' in lines[j] or '<TablePagination' in lines[j]):
            if ')}' in lines[j] or '</Card>' in lines[j]:
                break
            j += 1
        # Now we are at j
        # But wait, I need to keep the closing brackets for the if/map
        continue
    
    # Skip lines that were part of the mess
    if i > 0 and '</table>' in lines[i-1]:
        continue # handled above
    
    # Wait, this is getting complex. I'll just use a simpler replacement.
    new_lines.append(line)

# Let's just do a clean replacement of the StatsTable return block.
