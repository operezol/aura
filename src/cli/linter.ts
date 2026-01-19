import { Lexer } from '../compiler/lexer.js';
import { Parser } from '../compiler/parser.js';
import { SemanticAnalyzer } from '../compiler/semantic.js';

export interface LintResult {
  errors: LintError[];
  warnings: LintWarning[];
}

export interface LintError {
  message: string;
  line: number;
  column: number;
  rule: string;
}

export interface LintWarning {
  message: string;
  line: number;
  column: number;
  rule: string;
}

export interface LintOptions {
  filename?: string;
  rules?: Record<string, boolean>;
}

export class Linter {
  private defaultRules = {
    'no-unused-state': true,
    'no-missing-aria': true,
    'no-duplicate-keys': true,
    'require-alt-text': true,
    'no-empty-handlers': true,
    'prefer-computed': true
  };

  lint(source: string, options: LintOptions = {}): LintResult {
    const errors: LintError[] = [];
    const warnings: LintWarning[] = [];
    const rules = { ...this.defaultRules, ...options.rules };

    const lexer = new Lexer(source);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    lexerErrors.forEach(error => {
      errors.push({
        message: error.message,
        line: error.line,
        column: error.column,
        rule: 'syntax-error'
      });
    });

    if (errors.length > 0) {
      return { errors, warnings };
    }

    const parser = new Parser(tokens);
    const { ast, errors: parserErrors } = parser.parse();

    parserErrors.forEach(error => {
      errors.push({
        message: error.message,
        line: error.line,
        column: error.column,
        rule: 'parse-error'
      });
    });

    if (!ast || errors.length > 0) {
      return { errors, warnings };
    }

    const analyzer = new SemanticAnalyzer();
    const { errors: semanticErrors, warnings: semanticWarnings } = analyzer.analyze(ast);

    semanticErrors.forEach(error => {
      errors.push({
        message: error.message,
        line: error.line,
        column: error.column,
        rule: 'semantic-error'
      });
    });

    semanticWarnings.forEach(warning => {
      warnings.push({
        message: warning.message,
        line: warning.line,
        column: warning.column,
        rule: 'semantic-warning'
      });
    });

    if (rules['no-unused-state']) {
      this.checkUnusedState(ast, warnings);
    }

    if (rules['no-empty-handlers']) {
      this.checkEmptyHandlers(ast, warnings);
    }

    return { errors, warnings };
  }

  private checkUnusedState(ast: any, warnings: LintWarning[]): void {
    for (const component of ast.components) {
      const declaredStates = new Set<string>(component.states.map((s: any) => s.name));
      const usedStates = new Set<string>();

      const collectUsedStates = (node: any) => {
        if (!node) return;

        if (node.type === 'IDENTIFIER' && declaredStates.has(node.name)) {
          usedStates.add(node.name);
        }

        if (typeof node === 'object') {
          Object.values(node).forEach(value => {
            if (Array.isArray(value)) {
              value.forEach(collectUsedStates);
            } else if (typeof value === 'object') {
              collectUsedStates(value);
            }
          });
        }
      };

      collectUsedStates(component);

      declaredStates.forEach(state => {
        if (!usedStates.has(state)) {
          const stateDecl = component.states.find((s: any) => s.name === state);
          warnings.push({
            message: `State '${state}' is declared but never used`,
            line: stateDecl.line,
            column: stateDecl.column,
            rule: 'no-unused-state'
          });
        }
      });
    }
  }

  private checkEmptyHandlers(ast: any, warnings: LintWarning[]): void {
    for (const component of ast.components) {
      for (const handler of component.handlers) {
        if (handler.handler.body && typeof handler.handler.body === 'object') {
          const body = handler.handler.body;
          if (Array.isArray(body) && body.length === 0) {
            warnings.push({
              message: `Event handler '${handler.event}' has empty body`,
              line: handler.line,
              column: handler.column,
              rule: 'no-empty-handlers'
            });
          }
        }
      }
    }
  }
}
