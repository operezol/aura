import * as fs from 'fs';
import * as path from 'path';
import { Compiler } from '../compiler/index.js';
import { SemanticAnalyzer } from '../compiler/semantic.js';
import { Parser } from '../compiler/parser.js';
import { Lexer } from '../compiler/lexer.js';

export class Auditor {
    async audit(files: string[]): Promise<boolean> {
        console.log('🔍 Starting Aura Audit...\n');
        let hasErrors = false;
        let totalIssues = 0;

        for (const file of files) {
            const source = fs.readFileSync(file, 'utf-8');

            // We manually run the pipeline to get access to semantic analyzer directly if needed, 
            // although Compiler.compile() does it too. But here we might want to run independent checks.
            const lexer = new Lexer(source);
            const { tokens, errors: lexerErrors } = lexer.tokenize();
            const parser = new Parser(tokens);
            const { ast, errors: parseErrors } = parser.parse();

            if (lexerErrors.length > 0) {
                console.error(`❌ Lexer errors in ${file}:`);
                lexerErrors.forEach(e => console.error(`  ${e.line}:${e.column} ${e.message}`));
                hasErrors = true;
                continue;
            }

            if (parseErrors.length > 0) {
                console.error(`❌ Parse errors in ${file}:`);
                parseErrors.forEach(e => console.error(`  ${e.line}:${e.column} ${e.message}`));
                hasErrors = true;
                continue;
            }

            if (!ast) continue;

            const analyzer = new SemanticAnalyzer();
            const { errors, warnings } = analyzer.analyze(ast);

            if (errors.length > 0 || warnings.length > 0) {
                console.log(`📄 ${file}:`);

                errors.forEach(e => {
                    console.error(`  ❌ [Error] ${e.line}:${e.column}: ${e.message}`);
                    totalIssues++;
                });

                warnings.forEach(w => {
                    console.warn(`  ⚠️  [Warning] ${w.line}:${w.column}: ${w.message}`);
                    totalIssues++;
                });
                console.log('');
            }

            if (errors.length > 0) hasErrors = true;
        }

        if (totalIssues === 0) {
            console.log('✅ Audit passed! No issues found.');
            return true;
        } else {
            console.log(`🏁 Audit finished. Found ${totalIssues} issues.`);
            return !hasErrors;
        }
    }
}
