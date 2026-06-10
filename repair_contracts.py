import sys

content = open("src/pages/Contracts.tsx").read()
lines = content.splitlines()

# 1. Remove duplicate import at line 3
if "import { TablePagination, usePagination } from \"@/components/ui/table-pagination\";" in lines[2]:
    lines.pop(2)

# 2. Fix onClick at line 174 (now 173)
for i, line in enumerate(lines):
    if "onClick={() => { setActiveTab(tab.key);  }" in line:
        lines[i] = line.replace("onClick={() => { setActiveTab(tab.key);  }", "onClick={() => setActiveTab(tab.key)}")

# 3. Fix Search input at line 217 (now around 216)
for i, line in enumerate(lines):
    if 'onChange={e => { setSearch(e.target.value);  }' in line:
        lines[i] = line.replace('onChange={e => { setSearch(e.target.value);  }', 'onChange={e => setSearch(e.target.value)}')

# 4. Fix status filter select at line 220
for i, line in enumerate(lines):
    if 'onChange={e => { setStatusFilter(e.target.value);  }' in line:
        lines[i] = line.replace('onChange={e => { setStatusFilter(e.target.value);  }', 'onChange={e => setStatusFilter(e.target.value)}')

# 5. Fix index at line 242
for i, line in enumerate(lines):
    if '{(page - 1) * PAGE_SIZE + i + 1}' in line:
        lines[i] = line.replace('{(page - 1) * PAGE_SIZE + i + 1}', '{pag.page * pag.pageSize + i + 1}')

# 6. Fix line 270 and restore missing parts
# Line 270 current: <TablePagination {...pag} /> {
# We need to find this line and replace it with the closing logic and the new component signature.

new_lines = []
skip = False
for i, line in enumerate(lines):
    if '<TablePagination {...pag} /> {' in line:
        new_lines.append('        <TablePagination {...pag} />')
        new_lines.append('      </div>')
        new_lines.append('')
        new_lines.append('      {showAdd && (')
        new_lines.append('        <ContractFormModal')
        new_lines.append('          title="New Contract"')
        new_lines.append('          data={newContract}')
        new_lines.append('          onChange={setNewContract}')
        new_lines.append('          onCancel={() => setShowAdd(false)}')
        new_lines.append('          onSave={saveNew}')
        new_lines.append('          isSaving={isAdding}')
        new_lines.append('          serviceRates={newServiceRates}')
        new_lines.append('          onServiceRatesChange={setNewServiceRates}')
        new_lines.append('        />')
        new_lines.append('      )}')
        new_lines.append('')
        new_lines.append('      {editId && (')
        new_lines.append('        <ContractFormModal')
        new_lines.append('          title="Edit Contract"')
        new_lines.append('          data={editData}')
        new_lines.append('          onChange={setEditData}')
        new_lines.append('          onCancel={() => setEditId(null)}')
        new_lines.append('          onSave={saveEdit}')
        new_lines.append('          isSaving={isUpdating}')
        new_lines.append('          serviceRates={[]}')
        new_lines.append('          onServiceRatesChange={() => {}}')
        new_lines.append('        />')
        new_lines.append('      )}')
        new_lines.append('')
        new_lines.append('      {viewContract && (')
        new_lines.append('        <ContractDetailModal')
        new_lines.append('          contract={viewContract}')
        new_lines.append('          isOpen={!!viewContract}')
        new_lines.append('          onClose={() => setViewContract(null)}')
        new_lines.append('        />')
        new_lines.append('      )}')
        new_lines.append('')
        new_lines.append('      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>')
        new_lines.append('        <AlertDialogContent>')
        new_lines.append('          <AlertDialogHeader>')
        new_lines.append('            <AlertDialogTitle>Are you sure?</AlertDialogTitle>')
        new_lines.append('            <AlertDialogDescription>This will permanently delete the contract and all associated rates.</AlertDialogDescription>')
        new_lines.append('          </AlertDialogHeader>')
        new_lines.append('          <AlertDialogFooter>')
        new_lines.append('            <AlertDialogCancel>Cancel</AlertDialogCancel>')
        new_lines.append('            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>')
        new_lines.append('          </AlertDialogFooter>')
        new_lines.append('        </AlertDialogContent>')
        new_lines.append('      </AlertDialog>')
        new_lines.append('    </div>')
        new_lines.append('  );')
        new_lines.append('}')
        new_lines.append('')
        new_lines.append('const inputCls = "w-full px-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";')
        new_lines.append('const selectCls = "w-full px-3 py-1.5 text-sm border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";')
        new_lines.append('const RATE_SERVICE_TYPES = ["Arrival", "Departure", "Turnaround", "Night Stop", "ADHOC", "Overtime", "Staffing"];')
        new_lines.append('const SERVICE_SCOPES_LIST = ["Ad-Hoc", "Arrival Only", "Departure Only", "Full Service", "Maintenance", "Supervision Only", "Turnaround"];')
        new_lines.append('')
        new_lines.append('const ContractFormModal = ({ data, onChange, onCancel, onSave, isSaving, title, serviceRates, onServiceRatesChange }: any) => {')
    elif 'onChange={e => {' in line and 'const a = airlines.find' in lines[i+1]:
        # Fix missing } at line 307
        new_lines.append(line)
        new_lines.append(lines[i+1])
        new_lines.append(lines[i+2])
        new_lines.append('                })')
        # Skip next two lines as we already added them
        # (This is a bit fragile, let's just use a more targeted replacement later)
        # Actually I'll just do a global replace for the known pattern.
        pass 
    else:
        new_lines.append(line)

# Targeted fix for line 307 pattern
final_content = "\n".join(new_lines)
final_content = final_content.replace('''                onChange={e => {
                  const a = airlines.find(x => x.name === e.target.value);
                  onChange({ ...data, airline: e.target.value, airline_iata: a?.iata_code || "" });
                }''', '''                onChange={e => {
                  const a = airlines.find(x => x.name === e.target.value);
                  onChange({ ...data, airline: e.target.value, airline_iata: a?.iata_code || "" });
                }}''')

# Fix SERVICE_SCOPES rename
final_content = final_content.replace('const SERVICE_SCOPES = [', '// const SERVICE_SCOPES = [') # Comment out the old one if needed, or just keep it.
# Actually I'll just use SERVICE_SCOPES_LIST in the component.

with open("src/pages/Contracts.tsx", "w") as f:
    f.write(final_content)
