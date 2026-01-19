export enum TokenType {
  COMPONENT = 'COMPONENT',
  STATE = 'STATE',
  COMPUTED = 'COMPUTED',
  EFFECT = 'EFFECT',
  ON = 'ON',
  ANIMATE = 'ANIMATE',
  WHEN = 'WHEN',
  EACH = 'EACH',
  SLOT = 'SLOT',
  EMIT = 'EMIT',
  ROLE = 'ROLE',
  LABEL = 'LABEL',
  DESCRIBE = 'DESCRIBE',
  SPACE = 'SPACE',
  STYLE = 'STYLE',

  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',

  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  ARROW = 'ARROW',
  EQUALS = 'EQUALS',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  BANG = 'BANG',
  LT = 'LT',
  GT = 'GT',
  LE = 'LE',
  GE = 'GE',
  EQ = 'EQ',
  NE = 'NE',
  AND = 'AND',
  OR = 'OR',
  QUESTION = 'QUESTION',

  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  EOF = 'EOF',
  ILLEGAL = 'ILLEGAL'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export interface LexerError {
  message: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  'component': TokenType.COMPONENT,
  'state': TokenType.STATE,
  'computed': TokenType.COMPUTED,
  'effect': TokenType.EFFECT,
  'on': TokenType.ON,
  'animate': TokenType.ANIMATE,
  'when': TokenType.WHEN,
  'each': TokenType.EACH,
  'slot': TokenType.SLOT,
  'emit': TokenType.EMIT,
  'role': TokenType.ROLE,
  'label': TokenType.LABEL,
  'describe': TokenType.DESCRIBE,
  'space': TokenType.SPACE,
  'style': TokenType.STYLE,
  'true': TokenType.BOOLEAN,
  'false': TokenType.BOOLEAN
};

export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private indentStack: number[] = [0];
  private tokens: Token[] = [];
  private errors: LexerError[] = [];
  private pendingDedents: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): { tokens: Token[]; errors: LexerError[] } {
    while (this.position < this.input.length) {
      this.skipWhitespaceExceptNewline();

      if (this.position >= this.input.length) break;

      const char = this.input[this.position];

      if (char === '\n') {
        this.handleNewline();
        continue;
      }

      if (char === '#') {
        this.skipComment();
        continue;
      }

      if (this.isLetter(char) || char === '_') {
        this.readIdentifierOrKeyword();
        continue;
      }

      if (this.isDigit(char)) {
        this.readNumber();
        continue;
      }

      if (char === '"' || char === "'") {
        this.readString(char);
        continue;
      }

      if (this.readOperator()) {
        continue;
      }

      this.errors.push({
        message: `Illegal character: ${char}`,
        line: this.line,
        column: this.column
      });
      this.advance();
    }

    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken(TokenType.DEDENT, '');
    }

    this.addToken(TokenType.EOF, '');
    return { tokens: this.tokens, errors: this.errors };
  }

  private handleNewline(): void {
    this.addToken(TokenType.NEWLINE, '\n');
    this.advance();
    this.line++;
    this.column = 1;

    const indentLevel = this.measureIndent();
    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indentLevel > currentIndent) {
      this.indentStack.push(indentLevel);
      this.addToken(TokenType.INDENT, '');
    } else if (indentLevel < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indentLevel) {
        this.indentStack.pop();
        this.addToken(TokenType.DEDENT, '');
      }

      if (this.indentStack[this.indentStack.length - 1] !== indentLevel) {
        this.errors.push({
          message: 'Indentation error: inconsistent indentation',
          line: this.line,
          column: this.column
        });
      }
    }
  }

  private measureIndent(): number {
    let indent = 0;
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (char === ' ') {
        indent++;
        this.position++;
        this.column++;
      } else if (char === '\t') {
        indent += 4;
        this.position++;
        this.column++;
      } else {
        break;
      }
    }
    return indent;
  }

  private skipWhitespaceExceptNewline(): void {
    while (this.position < this.input.length) {
      const char = this.input[this.position];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    while (this.position < this.input.length && this.input[this.position] !== '\n') {
      this.advance();
    }
  }

  private readIdentifierOrKeyword(): void {
    const start = this.position;
    const startColumn = this.column;

    while (this.position < this.input.length && (this.isAlphanumeric(this.input[this.position]) || this.input[this.position] === '_')) {
      this.advance();
    }

    const value = this.input.substring(start, this.position);
    const type = KEYWORDS[value] || TokenType.IDENTIFIER;

    this.tokens.push({
      type,
      value,
      line: this.line,
      column: startColumn
    });
  }

  private readNumber(): void {
    const start = this.position;
    const startColumn = this.column;

    while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
      this.advance();
    }

    if (this.position < this.input.length && this.input[this.position] === '.') {
      this.advance();
      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        this.advance();
      }
    }

    const value = this.input.substring(start, this.position);
    this.tokens.push({
      type: TokenType.NUMBER,
      value,
      line: this.line,
      column: startColumn
    });
  }

  private readString(quote: string): void {
    const startColumn = this.column;
    this.advance();

    let value = '';
    let escaped = false;

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (escaped) {
        switch (char) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default: value += char;
        }
        escaped = false;
        this.advance();
      } else if (char === '\\') {
        escaped = true;
        this.advance();
      } else if (char === quote) {
        this.advance();
        this.tokens.push({
          type: TokenType.STRING,
          value,
          line: this.line,
          column: startColumn
        });
        return;
      } else {
        value += char;
        this.advance();
      }
    }

    this.errors.push({
      message: 'Unterminated string',
      line: this.line,
      column: startColumn
    });
  }

  private readOperator(): boolean {
    const startColumn = this.column;
    const char = this.input[this.position];
    const nextChar = this.position + 1 < this.input.length ? this.input[this.position + 1] : '';

    const twoChar = char + nextChar;

    const twoCharOps: Record<string, TokenType> = {
      '==': TokenType.EQ,
      '!=': TokenType.NE,
      '<=': TokenType.LE,
      '>=': TokenType.GE,
      '&&': TokenType.AND,
      '||': TokenType.OR,
      '=>': TokenType.ARROW
    };

    if (twoCharOps[twoChar]) {
      this.advance();
      this.advance();
      this.addToken(twoCharOps[twoChar], twoChar, startColumn);
      return true;
    }

    const singleCharOps: Record<string, TokenType> = {
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ':': TokenType.COLON,
      ';': TokenType.SEMICOLON,
      ',': TokenType.COMMA,
      '.': TokenType.DOT,
      '=': TokenType.EQUALS,
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.STAR,
      '/': TokenType.SLASH,
      '!': TokenType.BANG,
      '<': TokenType.LT,
      '>': TokenType.GT,
      '?': TokenType.QUESTION
    };

    if (singleCharOps[char]) {
      this.advance();
      this.addToken(singleCharOps[char], char, startColumn);
      return true;
    }

    return false;
  }

  private addToken(type: TokenType, value: string, column?: number): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: column ?? this.column
    });
  }

  private advance(): void {
    this.position++;
    this.column++;
  }

  private isLetter(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlphanumeric(char: string): boolean {
    return this.isLetter(char) || this.isDigit(char);
  }
}
