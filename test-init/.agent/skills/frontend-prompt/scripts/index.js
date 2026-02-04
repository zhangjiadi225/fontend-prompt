const fs = require('fs');
const path = require('path');

// 数据目录路径 (相对于 scripts/ 目录)
const DATA_DIR = path.resolve(__dirname, '../resources/data');

function loadJSON(filename) {
  try {
    const content = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`加载失败 ${filename}: `, e.message);
    return [];
  }
}

const GUARDRAILS = loadJSON('guardrails.json');
const GATES = loadJSON('gates.json');
const QUESTIONS = loadJSON('questions.json');

// --- Search Logic ---

function calculateScore(text, queryTokens) {
  let score = 0;
  const lowerText = text.toLowerCase();
  for (const token of queryTokens) {
    if (lowerText.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function search(query) {
  if (!query) return [];
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const results = [];

  // Search Guardrails
  for (const item of GUARDRAILS) {
    const text = (item.description || '') + ' ' + (item.content || '');
    const score = calculateScore(text, tokens);
    if (score > 0) {
      results.push({ type: 'guardrail', score, ...item });
    }
  }

  // Search Gates
  if (Array.isArray(GATES)) {
      for (const item of GATES) {
          const text = (item.title || '') + ' ' + (item.when || '');
          const score = calculateScore(text, tokens);
          if (score > 0) {
              results.push({ type: 'gate', score, ...item });
          }
      }
  } else {
      // Gates is an object mapping task types to gate lists
      for (const [key, gateList] of Object.entries(GATES)) {
          for (const item of gateList) {
             const text = (item.title || '') + ' ' + (item.when || '');
             const score = calculateScore(text, tokens);
             if (score > 0) {
                 results.push({ type: 'gate', taskType: key, score, ...item });
             }
          }
      }
  }

  // Search Questions
  for (const item of QUESTIONS) {
    const text = (item.id || '') + ' ' + (item.question || '');
    const score = calculateScore(text, tokens);
    if (score > 0) {
      results.push({ type: 'question', score, ...item });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// --- CLI Entry ---

const args = process.argv.slice(2);
const command = args[0];

if (command === 'search') {
  const query = args.slice(1).join(' ');
  const results = search(query);
  console.log(JSON.stringify(results, null, 2));
} else if (command === '--help' || command === '-h') {
  console.log(`
Frontend Prompt Skill - 本地数据搜索脚本

用法:
  node index.js search <关键词>    搜索 guardrails、gates 和 questions
  node index.js --help             显示帮助信息

示例:
  node index.js search security    搜索包含 "security" 的规范
  node index.js search 审批        搜索包含 "审批" 的规范

数据来源:
  - guardrails.json  前端开发守则
  - gates.json       审批关口定义
  - questions.json   澄清问题列表
`);
} else {
  console.log('用法: node index.js search <关键词>');
  console.log('      node index.js --help');
}
