import { Token, TokenType } from './lexer.js';
import * as AST from './ast.js';

export interface ParserError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParserError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => 
      t.type !== TokenType.NEWLINE && 
      t.type !== TokenType.INDENT && 
      t.type !== TokenType.DEDENT
    );
  }

  parse(): { ast: AST.Program | null; errors: ParserError[] } {
    const components: AST.ComponentNode[] = [];

    while (!this.isAtEnd()) {
      try {
        const component = this.parseComponent();
        if (component) {
          components.push(component);
        }
      } catch (error) {
        this.synchronize();
      }
    }

    const ast: AST.Program = {
      type: AST.NodeType.PROGRAM,
      components,
      line: 1,
      column: 1
    };

    return { ast: components.length > 0 ? ast : null, errors: this.errors };
  }

  private parseComponent(): AST.ComponentNode | null {
    if (!this.match(TokenType.COMPONENT)) {
      this.error('Expected component declaration');
      return null;
    }

    const token = this.previous();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected component name');

    const props: AST.PropertyDeclaration[] = [];
    const states: AST.StateDeclaration[] = [];
    const computed: AST.ComputedDeclaration[] = [];
    const effects: AST.EffectDeclaration[] = [];
    const handlers: AST.EventHandler[] = [];
    const animations: AST.AnimationDeclaration[] = [];
    const body: AST.ElementNode[] = [];
    const accessibility: AST.AccessibilityInfo = {};

    this.consume(TokenType.COLON, 'Expected : after component name');

    while (!this.isAtEnd() && !this.check(TokenType.COMPONENT)) {
      if (this.match(TokenType.STATE)) {
        const state = this.parseState();
        if (state) states.push(state);
      } else if (this.match(TokenType.COMPUTED)) {
        const comp = this.parseComputed();
        if (comp) computed.push(comp);
      } else if (this.match(TokenType.EFFECT)) {
        const effect = this.parseEffect();
        if (effect) effects.push(effect);
      } else if (this.match(TokenType.ON)) {
        const handler = this.parseEventHandler();
        if (handler) handlers.push(handler);
      } else if (this.match(TokenType.ANIMATE)) {
        const animation = this.parseAnimation();
        if (animation) animations.push(animation);
      } else if (this.match(TokenType.ROLE)) {
        accessibility.role = this.parseStringValue();
      } else if (this.match(TokenType.LABEL)) {
        accessibility.label = this.parseStringValue();
      } else if (this.match(TokenType.DESCRIBE)) {
        accessibility.description = this.parseStringValue();
      } else if (this.check(TokenType.IDENTIFIER)) {
        const element = this.parseElement();
        if (element) body.push(element);
      } else {
        this.advance();
      }
    }

    return {
      type: AST.NodeType.COMPONENT,
      name: name.value,
      props,
      states,
      computed,
      effects,
      handlers,
      animations,
      body,
      accessibility,
      line: token.line,
      column: token.column
    };
  }

  private parseState(): AST.StateDeclaration | null {
    const token = this.previous();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected state name');
    this.consume(TokenType.EQUALS, 'Expected = after state name');
    const initialValue = this.parseExpression();

    return {
      type: AST.NodeType.STATE_DECLARATION,
      name: name.value,
      initialValue,
      line: token.line,
      column: token.column
    };
  }

  private parseComputed(): AST.ComputedDeclaration | null {
    const token = this.previous();
    const name = this.consume(TokenType.IDENTIFIER, 'Expected computed name');
    this.consume(TokenType.EQUALS, 'Expected = after computed name');
    const expression = this.parseExpression();

    const dependencies = this.extractDependencies(expression);

    return {
      type: AST.NodeType.COMPUTED_DECLARATION,
      name: name.value,
      dependencies,
      expression,
      line: token.line,
      column: token.column
    };
  }

  private parseEffect(): AST.EffectDeclaration | null {
    const token = this.previous();
    this.consume(TokenType.LPAREN, 'Expected ( after effect');
    
    const dependencies: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const dep = this.consume(TokenType.IDENTIFIER, 'Expected dependency name');
        dependencies.push(dep.value);
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RPAREN, 'Expected ) after dependencies');
    this.consume(TokenType.ARROW, 'Expected => after effect dependencies');

    const body: AST.Statement[] = [];

    return {
      type: AST.NodeType.EFFECT_DECLARATION,
      dependencies,
      body,
      line: token.line,
      column: token.column
    };
  }

  private parseEventHandler(): AST.EventHandler | null {
    const token = this.previous();
    const event = this.consume(TokenType.IDENTIFIER, 'Expected event name');
    this.consume(TokenType.ARROW, 'Expected => after event name');
    
    const handler = this.parseArrowFunction();

    return {
      type: AST.NodeType.EVENT_HANDLER,
      event: event.value,
      handler,
      line: token.line,
      column: token.column
    };
  }

  private parseAnimation(): AST.AnimationDeclaration | null {
    const token = this.previous();
    const trigger = this.consume(TokenType.IDENTIFIER, 'Expected animation trigger');
    this.consume(TokenType.COLON, 'Expected : after animation trigger');

    const properties: AST.AnimationProperty[] = [];
    let duration = 300;
    let easing = 'ease-out';

    while (!this.isAtEnd() && this.check(TokenType.IDENTIFIER)) {
      const propName = this.advance().value;
      this.consume(TokenType.COLON, 'Expected : after property name');
      const to = this.parseExpression();
      
      properties.push({
        property: propName,
        to
      });

      if (!this.match(TokenType.COMMA)) break;
    }

    return {
      type: AST.NodeType.ANIMATION,
      trigger: trigger.value,
      properties,
      duration,
      easing,
      line: token.line,
      column: token.column
    };
  }

  private parseElement(): AST.ElementNode | null {
    const token = this.peek();
    const tag = this.consume(TokenType.IDENTIFIER, 'Expected element tag');

    const attributes: AST.Attribute[] = [];
    const children: (AST.ElementNode | AST.TextNode | AST.ConditionalNode | AST.LoopNode | AST.SlotNode)[] = [];

    while (this.check(TokenType.IDENTIFIER) && !this.checkNext(TokenType.COLON)) {
      const attrName = this.advance().value;
      this.consume(TokenType.EQUALS, 'Expected = after attribute name');
      const attrValue = this.parseExpression();
      attributes.push({ name: attrName, value: attrValue });
    }

    if (this.match(TokenType.COLON)) {
      if (this.match(TokenType.STRING)) {
        const text = this.previous();
        children.push({
          type: AST.NodeType.TEXT,
          content: text.value,
          interpolations: [],
          line: text.line,
          column: text.column
        });
      } else {
        while (!this.isAtEnd() && this.check(TokenType.IDENTIFIER)) {
          if (this.peek().value === 'when') {
            const cond = this.parseConditional();
            if (cond) children.push(cond);
          } else if (this.peek().value === 'each') {
            const loop = this.parseLoop();
            if (loop) children.push(loop);
          } else if (this.peek().value === 'slot') {
            const slot = this.parseSlot();
            if (slot) children.push(slot);
          } else {
            const child = this.parseElement();
            if (child) children.push(child);
            else break;
          }
        }
      }
    }

    return {
      type: AST.NodeType.ELEMENT,
      tag: tag.value,
      attributes,
      children,
      line: token.line,
      column: token.column
    };
  }

  private parseConditional(): AST.ConditionalNode | null {
    this.consume(TokenType.IDENTIFIER, 'Expected when');
    const token = this.previous();
    const condition = this.parseExpression();
    this.consume(TokenType.COLON, 'Expected : after condition');

    const consequent: (AST.ElementNode | AST.TextNode)[] = [];
    
    if (this.check(TokenType.IDENTIFIER)) {
      const element = this.parseElement();
      if (element) consequent.push(element);
    }

    return {
      type: AST.NodeType.CONDITIONAL,
      condition,
      consequent,
      line: token.line,
      column: token.column
    };
  }

  private parseLoop(): AST.LoopNode | null {
    this.consume(TokenType.IDENTIFIER, 'Expected each');
    const token = this.previous();
    const item = this.consume(TokenType.IDENTIFIER, 'Expected item name');
    
    this.consume(TokenType.IDENTIFIER, 'Expected in');
    const iterable = this.parseExpression();
    this.consume(TokenType.COLON, 'Expected : after iterable');

    const body: (AST.ElementNode | AST.TextNode)[] = [];
    
    if (this.check(TokenType.IDENTIFIER)) {
      const element = this.parseElement();
      if (element) body.push(element);
    }

    return {
      type: AST.NodeType.LOOP,
      item: item.value,
      iterable,
      body,
      line: token.line,
      column: token.column
    };
  }

  private parseSlot(): AST.SlotNode | null {
    this.consume(TokenType.IDENTIFIER, 'Expected slot');
    const token = this.previous();

    return {
      type: AST.NodeType.SLOT,
      line: token.line,
      column: token.column
    };
  }

  private parseExpression(): AST.Expression {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): AST.Expression {
    let left = this.parseLogicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.parseLogicalAnd();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseLogicalAnd(): AST.Expression {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.parseEquality();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseEquality(): AST.Expression {
    let left = this.parseComparison();

    while (this.match(TokenType.EQ, TokenType.NE)) {
      const operator = this.previous();
      const right = this.parseComparison();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseComparison(): AST.Expression {
    let left = this.parseAdditive();

    while (this.match(TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE)) {
      const operator = this.previous();
      const right = this.parseAdditive();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseAdditive(): AST.Expression {
    let left = this.parseMultiplicative();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.parseMultiplicative();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseMultiplicative(): AST.Expression {
    let left = this.parseUnary();

    while (this.match(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.previous();
      const right = this.parseUnary();
      left = {
        type: AST.NodeType.BINARY_EXPRESSION,
        operator: operator.value,
        left,
        right,
        line: operator.line,
        column: operator.column
      };
    }

    return left;
  }

  private parseUnary(): AST.Expression {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const argument = this.parseUnary();
      return {
        type: AST.NodeType.UNARY_EXPRESSION,
        operator: operator.value,
        argument,
        line: operator.line,
        column: operator.column
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): AST.Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, 'Expected property name');
        expr = {
          type: AST.NodeType.MEMBER_EXPRESSION,
          object: expr,
          property: {
            type: AST.NodeType.IDENTIFIER,
            name: property.value,
            line: property.line,
            column: property.column
          },
          computed: false,
          line: property.line,
          column: property.column
        };
      } else if (this.match(TokenType.LBRACKET)) {
        const property = this.parseExpression();
        this.consume(TokenType.RBRACKET, 'Expected ] after computed property');
        expr = {
          type: AST.NodeType.MEMBER_EXPRESSION,
          object: expr,
          property,
          computed: true,
          line: this.previous().line,
          column: this.previous().column
        };
      } else if (this.match(TokenType.LPAREN)) {
        const args: AST.Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, 'Expected ) after arguments');
        expr = {
          type: AST.NodeType.CALL_EXPRESSION,
          callee: expr,
          arguments: args,
          line: this.previous().line,
          column: this.previous().column
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): AST.Expression {
    const token = this.peek();

    if (this.match(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return {
        type: AST.NodeType.LITERAL,
        value,
        raw: this.previous().value,
        line: token.line,
        column: token.column
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: AST.NodeType.LITERAL,
        value: this.previous().value,
        raw: this.previous().value,
        line: token.line,
        column: token.column
      };
    }

    if (this.match(TokenType.BOOLEAN)) {
      const value = this.previous().value === 'true';
      return {
        type: AST.NodeType.LITERAL,
        value,
        raw: this.previous().value,
        line: token.line,
        column: token.column
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: AST.NodeType.IDENTIFIER,
        name: this.previous().value,
        line: token.line,
        column: token.column
      };
    }

    if (this.match(TokenType.LBRACKET)) {
      const elements: AST.Expression[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RBRACKET, 'Expected ] after array elements');
      return {
        type: AST.NodeType.ARRAY_EXPRESSION,
        elements,
        line: token.line,
        column: token.column
      };
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, 'Expected ) after expression');
      return expr;
    }

    this.error('Expected expression');
    return {
      type: AST.NodeType.LITERAL,
      value: 0,
      raw: '0',
      line: token.line,
      column: token.column
    };
  }

  private parseArrowFunction(): AST.ArrowFunction {
    const token = this.peek();
    const params: string[] = [];
    
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          const param = this.consume(TokenType.IDENTIFIER, 'Expected parameter name');
          params.push(param.value);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, 'Expected ) after parameters');
    }

    const body = this.parseExpression();

    return {
      type: AST.NodeType.ARROW_FUNCTION,
      params,
      body,
      line: token.line,
      column: token.column
    };
  }

  private parseStringValue(): string {
    const token = this.consume(TokenType.STRING, 'Expected string value');
    return token.value;
  }

  private extractDependencies(expr: AST.Expression): string[] {
    const deps: string[] = [];
    
    const walk = (node: AST.Expression) => {
      if (node.type === AST.NodeType.IDENTIFIER) {
        deps.push(node.name);
      } else if (node.type === AST.NodeType.BINARY_EXPRESSION) {
        walk(node.left);
        walk(node.right);
      } else if (node.type === AST.NodeType.MEMBER_EXPRESSION) {
        walk(node.object);
      } else if (node.type === AST.NodeType.CALL_EXPRESSION) {
        walk(node.callee);
        node.arguments.forEach(walk);
      }
    };
    
    walk(expr);
    return [...new Set(deps)];
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    this.error(message);
    return this.peek();
  }

  private error(message: string): void {
    const token = this.peek();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      severity: 'error'
    });
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.COMPONENT:
        case TokenType.STATE:
        case TokenType.COMPUTED:
        case TokenType.EFFECT:
          return;
      }

      this.advance();
    }
  }
}
