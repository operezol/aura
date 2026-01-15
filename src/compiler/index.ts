import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import { CodeGenerator } from './codegen.js';
import { SemanticAnalyzer } from './semantic.js';

export interface CompileOptions {
  filename?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  target?: 'es2022' | 'es2020' | 'es2015';
  strict?: boolean;
  explain?: boolean;
}

export interface CompileResult {
  code: string;
  errors: CompileError[];
  warnings: CompileWarning[];
  ast?: any;
  explanation?: string;
}

export interface CompileError {
  message: string;
  line: number;
  column: number;
  severity: 'error';
}

export interface CompileWarning {
  message: string;
  line: number;
  column: number;
  severity: 'warning';
}

export class Compiler {
  compile(source: string, options: CompileOptions = {}): CompileResult {
    const errors: CompileError[] = [];
    const warnings: CompileWarning[] = [];

    const lexer = new Lexer(source);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    if (lexerErrors.length > 0) {
      errors.push(...lexerErrors.map(e => ({
        message: e.message,
        line: e.line,
        column: e.column,
        severity: 'error' as const
      })));
    }

    if (errors.length > 0) {
      return { code: '', errors, warnings };
    }

    const parser = new Parser(tokens);
    const { ast, errors: parserErrors } = parser.parse();

    if (parserErrors.length > 0) {
      errors.push(...parserErrors.map(e => ({
        message: e.message,
        line: e.line,
        column: e.column,
        severity: e.severity as 'error'
      })));
    }

    if (!ast || errors.length > 0) {
      return { code: '', errors, warnings };
    }

    if (options.strict) {
      const analyzer = new SemanticAnalyzer();
      const { errors: semanticErrors, warnings: semanticWarnings } = analyzer.analyze(ast);

      errors.push(...semanticErrors.map(e => ({
        message: e.message,
        line: e.line,
        column: e.column,
        severity: 'error' as const
      })));

      warnings.push(...semanticWarnings.map(w => ({
        message: w.message,
        line: w.line,
        column: w.column,
        severity: 'warning' as const
      })));
    }

    if (errors.length > 0) {
      return { code: '', errors, warnings, ast: options.explain ? ast : undefined };
    }

    const codegen = new CodeGenerator();
    const code = codegen.generate(ast, {
      minify: options.minify,
      sourceMaps: options.sourceMaps,
      target: options.target
    });

    const result: CompileResult = {
      code,
      errors,
      warnings
    };

    if (options.explain) {
      result.ast = ast;
      result.explanation = this.generateExplanation(ast, code);
    }

    return result;
  }

  private generateExplanation(ast: any, code: string): string {
    const lines: string[] = [];
    
    lines.push('=== Compilation Explanation ===\n');
    lines.push(`Components found: ${ast.components.length}\n`);
    
    for (const component of ast.components) {
      lines.push(`\nComponent: ${component.name}`);
      lines.push(`  - States: ${component.states.length}`);
      lines.push(`  - Computed: ${component.computed.length}`);
      lines.push(`  - Effects: ${component.effects.length}`);
      lines.push(`  - Event Handlers: ${component.handlers.length}`);
      lines.push(`  - Animations: ${component.animations.length}`);
      lines.push(`  - Elements: ${component.body.length}`);
      
      if (component.accessibility.role) {
        lines.push(`  - Accessibility Role: ${component.accessibility.role}`);
      }
    }
    
    lines.push('\n=== Generated Code ===\n');
    lines.push(code);
    
    return lines.join('\n');
  }
}

export function compile(source: string, options?: CompileOptions): CompileResult {
  const compiler = new Compiler();
  return compiler.compile(source, options);
}
