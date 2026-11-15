const fs = require('fs');

const txt = fs.readFileSync('C:/Users/User/.gemini/antigravity/scratch/school-padlet/scripts/step_1857_dump.txt', 'utf8');

// Find all JSON arrays or objects in step 1857
let jsonStart = txt.indexOf('[');
if (jsonStart !== -1) {
  let jsonStr = txt.substring(jsonStart).trim();
  // Sometimes there is trailing text
  let jsonEnd = jsonStr.lastIndexOf(']');
  if (jsonEnd !== -1) {
    jsonStr = jsonStr.substring(0, jsonEnd + 1);
  }
  try {
    const posts = JSON.parse(jsonStr);
    console.log('Total posts in step 1857:', posts.length);
    posts.forEach((p, idx) => {
      console.log(`[${idx}] id: ${p.id} | col: ${p.column_name || p.column_id} | title: "${p.title}" | link: ${p.link_url || 'none'} | content preview: "${(p.content || '').substring(0, 60).replace(/\n/g, ' ')}"`);
    });
  } catch (e) {
    console.log('JSON parse error:', e.message);
  }
} else {
  console.log('No [ found');
}
