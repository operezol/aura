const fs = require('fs');
const { Lexer } = require('./dist/compiler/lexer.js');

const content = fs.readFileSync('src/examples/Features.aura', 'utf-8');
const lexer = new Lexer(content);
const { tokens } = lexer.tokenize();

console.log(tokens.map(t => `${t.line}:${t.column} ${t.type} ${t.value}`).join('\n'));
