import os

path = r"c:\Users\IRC009\Desktop\webexplorapp\dashboard-cliente\src\pages\Settings\StaffManager.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update initial state of selectedBranches from ['all'] to []
content = content.replace("const [selectedBranches, setSelectedBranches] = useState(['all']);", "const [selectedBranches, setSelectedBranches] = useState([]);")

# 2. Update handleToggleBranch to not use 'all' logic
old_toggle_branch = """  const handleToggleBranch = (bId) => {
    if (bId === 'all') {
      setSelectedBranches(['all']);
    } else {
      const newBranches = selectedBranches.includes(bId)
        ? selectedBranches.filter(x => x !== bId)
        : [...selectedBranches.filter(x => x !== 'all'), bId];
      setSelectedBranches(newBranches.length === 0 ? ['all'] : newBranches);
    }
  };"""

# We can replace it using a more standard format or regex. Let's do it cleanly:
new_toggle_branch = """  const handleToggleBranch = (bId) => {
    const newBranches = selectedBranches.includes(bId)
      ? selectedBranches.filter(x => x !== bId)
      : [...selectedBranches, bId];
    setSelectedBranches(newBranches);
  };"""

# Find and replace it
if "const handleToggleBranch = (bId) => {" in content:
    # Let's replace the whole handleToggleBranch block using regex to avoid formatting issues
    import re
    content, count = re.subn(r'const handleToggleBranch = \(bId\) => \{[\s\S]*?\n  \};', new_toggle_branch, content)
    print(f"Updated handleToggleBranch: {count} matches.")

# 3. Remove 'Todas las sedes' chip from options-grid
# Let's inspect the code block:
#                   <button 
#                     type="button" 
#                     className={`option-chip ${selectedBranches.includes('all') ? 'active' : ''}`}
#                     onClick={() => handleToggleBranch('all')}
#                   >
#                     Todas las sedes
#                   </button>
target_chip_regex = r'\s*<button \s*type="button" \s*className=\{\`option-chip \$\{selectedBranches\.includes\(\'all\'\) \? \'active\' : \'\'\}\`\} \s*onClick=\{\(\) => handleToggleBranch\(\'all\'\)\} \s*> \s*Todas las sedes \s*</button>'
content, count = re.subn(target_chip_regex, '', content)
print(f"Removed 'Todas las sedes' chip: {count} matches.")

# If regex did not match due to subtle changes, let's do a substring replace
if count == 0:
    # Fallback to string replace
    target_str = """                  <button 
                    type="button" 
                    className={`option-chip ${selectedBranches.includes('all') ? 'active' : ''}`}
                    onClick={() => handleToggleBranch('all')}
                  >
                    Todas las sedes
                  </button>"""
    if target_str in content:
        content = content.replace(target_str, "")
        print("Removed 'Todas las sedes' chip using string replace.")
    else:
        # Normalize linebreaks and search
        content_norm = content.replace("\r\n", "\n")
        target_norm = target_str.replace("\r\n", "\n")
        if target_norm in content_norm:
            content_norm = content_norm.replace(target_norm, "")
            content = content_norm
            print("Removed 'Todas las sedes' chip after normalization.")
        else:
            print("Could not find 'Todas las sedes' chip target.")

# 4. In active users table, remove fallback display for 'all' (line 231)
# member.branches?.includes('all') 
#   ? <span className="badge badge-success">Todas</span> 
#   : <span className="badge badge-neutral">{member.branches?.length || 0} sedes</span>
# We can keep it or change it, but it's better to display actual number of branches. Let's simplify:
content = content.replace(
    "member.branches?.includes('all') \n                              ? <span className=\"badge badge-success\">Todas</span> \n                              : <span className=\"badge badge-neutral\">{member.branches?.length || 0} sedes</span>",
    "<span className=\"badge badge-neutral\">{member.branches?.length || 0} sedes</span>"
)
content = content.replace(
    "member.branches?.includes('all') \r\n                              ? <span className=\"badge badge-success\">Todas</span> \r\n                              : <span className=\"badge badge-neutral\">{member.branches?.length || 0} sedes</span>",
    "<span className=\"badge badge-neutral\">{member.branches?.length || 0} sedes</span>"
)

with open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
