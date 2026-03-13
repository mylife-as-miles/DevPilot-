import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Fix the duplicate tabs by replacing all Vision button injections and just adding one correctly
content = re.sub(r'<button onClick=\{\(\) => setCodeTab\(\'vision_analysis\'\)\}.*?<\/button>\n?', '', content)

# Inject correctly once
vision_tab = """\\1
                  <button onClick={(e) => { e.stopPropagation(); setCodeTab('vision_analysis'); }} className={`px-6 py-3 text-sm ${codeTab === 'vision_analysis' ? 'font-bold border-b-2 border-primary text-white' : 'font-medium text-slate-500 hover:text-white'}`}>Vision</button>"""
content = re.sub(r'(<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); setCodeTab\(\'terminal\'\); \}\}.*?<\/button>)', vision_tab, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
