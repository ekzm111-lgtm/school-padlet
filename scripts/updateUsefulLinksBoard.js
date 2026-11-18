const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'usefulSchoolLinksBoard.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const logoMap = {
  'link-quizn': '/logos/quizn.svg',
  'link-zep-quiz': '/logos/zep-quiz.svg',
  'link-classpoint': '/logos/classpoint.svg',
  'link-kahoot': '/logos/kahoot.svg',
  'link-thinkerbell': '/logos/thinkerbell.svg',
  'link-entry': '/logos/entry.svg',
  'link-scratch': '/logos/scratch.svg',
  'link-hourofcode': '/logos/hourofcode.svg',
  'link-lightbot': '/logos/lightbot.svg',
  'link-rodocodo': '/logos/rodocodo.svg',
  'link-teachable-machine': '/logos/teachable-machine.svg',
  'link-toctocmath': '/logos/toctocmath.svg',
  'link-algeomath': '/logos/algeomath.svg',
  'link-polysmath': '/logos/khan-academy.svg',
  'link-geogebra': '/logos/geogebra.svg',
  'link-desmos': '/logos/desmos.svg',
  'link-ebsmath': '/logos/ebsmath.svg',
  'link-phet': '/logos/phet.svg',
  'link-stellarium': '/logos/stellarium.svg',
  'link-scienceall': '/logos/scienceall.svg',
  'link-whalespace': '/logos/whalespace.svg',
  'link-whaleclass': '/logos/whaleclass.svg',
  'link-google-classroom': '/logos/google-classroom.svg',
  'link-ms-teams': '/logos/ms-teams.svg',
  'link-digital-textbook': '/logos/digital-textbook.svg',
  'link-miricanvas': '/logos/miricanvas.svg',
  'link-padlet': '/logos/padlet.svg',
  'link-google-trends': '/logos/google-trends.svg',
  'link-greeninet': '/logos/greeninet.svg',
  'link-ai-ethics': '/logos/ai-ethics.svg'
};

for (const [id, logoUrl] of Object.entries(logoMap)) {
  // Regex to find the post object by id and replace imageUrl and color
  const regex = new RegExp(`(id:\\s*['"]${id}['"][\\s\\S]*?imageUrl:\\s*['"])([^'"]+)(['"][\\s\\S]*?color:\\s*['"])([^'"]+)(['"])`, 'g');
  content = content.replace(regex, (match, p1, oldImg, p2, oldColor, p3) => {
    return `${p1}${logoUrl}${p2}white${p3}`;
  });
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated usefulSchoolLinksBoard.ts successfully');
