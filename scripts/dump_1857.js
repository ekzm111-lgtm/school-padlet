const fs = require('fs');

const p = 'C:/Users/User/.gemini/antigravity/brain/624aeb15-129a-4170-91b6-183884e84e05/.system_generated/steps/1857/output.txt';
const txt = fs.readFileSync(p, 'utf8');

// Find all matches of "title": or "content":
const lines = txt.split('\n');
console.log('Total lines in 1857:', lines.length);

// Let's write the raw output to a file in scratch so we can examine it
fs.writeFileSync('C:/Users/User/.gemini/antigravity/scratch/school-padlet/scripts/step_1857_dump.txt', txt);
console.log('Dumped step 1857 to step_1857_dump.txt');
