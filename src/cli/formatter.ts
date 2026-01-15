import { Lexer, Token, TokenType } from '../compiler/lexer.js';

export interface FormatterOptions {
  indentSize?: number;
  maxLineLength?: number;
  insertFinalNewline?: boolean;
}

export class Formatter {
  private options: FormatterOptions;
  private indent: number = 0;
  private output: string[] = [];

  constructor(options: FormatterOptions = {}) {
    this.options = {
      indentSize: 2,
      maxLineLength: 100,
      insertFinalNewline: true,
      ...options
    };
  }

  format(source: string): string {
    const lexer = new Lexer(source);
    const { tokens, errors } = lexer.tokenize();

    if (errors.length > 0) {
      return source;
    }

    this.output = [];
    this.indent = 0;

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.EOF) break;

      if (token.type === TokenType.COMPONENT) {
        i = this.formatComponent(tokens, i);
      } else {
        i++;
      }
    }

    let result = this.output.join('\n');
    
    if (this.options.insertFinalNewline && !result.endsWith('\n')) {
      result += '\n';
    }

    return result;
  }

  private formatComponent(tokens: Token[], start: number): number {
    let i = start;
    const componentToken = tokens[i++];
    const nameToken = tokens[i++];

    this.emit(`component ${nameToken.value}:`);
    this.indent++;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.COMPONENT || token.type === TokenType.EOF) {
        break;
      }

      if (token.type === TokenType.STATE) {
        i = this.formatState(tokens, i);
      } else if (token.type === TokenType.COMPUTED) {
        i = this.formatComputed(tokens, i);
      } else if (token.type === TokenType.EFFECT) {
        i = this.formatEffect(tokens, i);
      } else if (token.type === TokenType.ON) {
        i = this.formatEventHandler(tokens, i);
      } else if (token.type === TokenType.ANIMATE) {
        i = this.formatAnimation(tokens, i);
      } else if (token.type === TokenType.ROLE) {
        i = this.formatRole(tokens, i);
      } else if (token.type === TokenType.LABEL) {
        i = this.formatLabel(tokens, i);
      } else if (token.type === TokenType.IDENTIFIER) {
        i = this.formatElement(tokens, i);
      } else {
        i++;
      }
    }

    this.indent--;
    this.emit('');
    return i;
  }

  private formatState(tokens: Token[], start: number): number {
    let i = start + 1;
    const nameToken = tokens[i++];
    i++;
    
    const valueTokens: Token[] = [];
    while (i < tokens.length && !this.isStatementEnd(tokens[i])) {
      valueTokens.push(tokens[i]);
      i++;
    }

    const value = valueTokens.map(t => t.value).join(' ');
    this.emit(`state ${nameToken.value} = ${value}`);

    return i;
  }

  private formatComputed(tokens: Token[], start: number): number {
    let i = start + 1;
    const nameToken = tokens[i++];
    i++;
    
    const exprTokens: Token[] = [];
    while (i < tokens.length && !this.isStatementEnd(tokens[i])) {
      exprTokens.push(tokens[i]);
      i++;
    }

    const expr = exprTokens.map(t => t.value).join(' ');
    this.emit(`computed ${nameToken.value} = ${expr}`);

    return i;
  }

  private formatEffect(tokens: Token[], start: number): number {
    let i = start + 1;
    i++;
    
    const deps: string[] = [];
    while (tokens[i].type !== TokenType.RPAREN) {
      if (tokens[i].type === TokenType.IDENTIFIER) {
        deps.push(tokens[i].value);
      }
      i++;
    }
    i++;
    i++;

    this.emit(`effect (${deps.join(', ')}) =>`);

    return i;
  }

  private formatEventHandler(tokens: Token[], start: number): number {
    let i = start + 1;
    const eventToken = tokens[i++];
    i++;
    
    const handlerTokens: Token[] = [];
    while (i < tokens.length && !this.isStatementEnd(tokens[i])) {
      handlerTokens.push(tokens[i]);
      i++;
    }

    const handler = handlerTokens.map(t => t.value).join(' ');
    this.emit(`on ${eventToken.value} => ${handler}`);

    return i;
  }

  private formatAnimation(tokens: Token[], start: number): number {
    let i = start + 1;
    const triggerToken = tokens[i++];
    i++;

    this.emit(`animate ${triggerToken.value}:`);
    this.indent++;

    while (i < tokens.length && tokens[i].type === TokenType.IDENTIFIER) {
      const propToken = tokens[i++];
      i++;
      
      const valueTokens: Token[] = [];
      while (i < tokens.length && tokens[i].type !== TokenType.COMMA && !this.isStatementEnd(tokens[i])) {
        valueTokens.push(tokens[i]);
        i++;
      }

      const value = valueTokens.map(t => t.value).join(' ');
      this.emit(`${propToken.value}: ${value}`);

      if (tokens[i].type === TokenType.COMMA) {
        i++;
      } else {
        break;
      }
    }

    this.indent--;
    return i;
  }

  private formatRole(tokens: Token[], start: number): number {
    let i = start + 1;
    const valueToken = tokens[i++];
    this.emit(`role ${valueToken.value}`);
    return i;
  }

  private formatLabel(tokens: Token[], start: number): number {
    let i = start + 1;
    const valueToken = tokens[i++];
    this.emit(`label ${valueToken.value}`);
    return i;
  }

  private formatElement(tokens: Token[], start: number): number {
    let i = start;
    const tagToken = tokens[i++];

    const attrs: string[] = [];
    while (i < tokens.length && tokens[i].type === TokenType.IDENTIFIER && tokens[i + 1]?.type === TokenType.EQUALS) {
      const attrName = tokens[i++].value;
      i++;
      const attrValue = tokens[i++].value;
      attrs.push(`${attrName}=${attrValue}`);
    }

    if (tokens[i]?.type === TokenType.COLON) {
      i++;
      const content = tokens[i];
      
      if (content.type === TokenType.STRING) {
        const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
        this.emit(`${tagToken.value}${attrsStr}: ${content.value}`);
        i++;
      } else {
        const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
        this.emit(`${tagToken.value}${attrsStr}:`);
        this.indent++;
        
        while (i < tokens.length && tokens[i].type === TokenType.IDENTIFIER) {
          i = this.formatElement(tokens, i);
        }
        
        this.indent--;
      }
    } else {
      const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
      this.emit(`${tagToken.value}${attrsStr}`);
    }

    return i;
  }

  private emit(line: string): void {
    const indentation = ' '.repeat(this.indent * (this.options.indentSize || 2));
    this.output.push(indentation + line);
  }

  private isStatementEnd(token: Token): boolean {
    return token.type === TokenType.NEWLINE ||
           token.type === TokenType.EOF ||
           token.type === TokenType.COMPONENT ||
           token.type === TokenType.STATE ||
           token.type === TokenType.COMPUTED ||
           token.type === TokenType.EFFECT ||
           token.type === TokenType.ON ||
           token.type === TokenType.ANIMATE ||
           token.type === TokenType.ROLE ||
           token.type === TokenType.LABEL;
  }
}
