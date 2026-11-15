const content = require('fs').readFileSync('src/app/board/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes("currentLayout === 'grid'") || l.includes("currentLayout === 'canvas'") || l.includes("currentLayout === 'kanban'")) {
    console.log(i + 1, l);
  }
});
