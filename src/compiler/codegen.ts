import * as AST from './ast.js';

export interface CodeGenOptions {
  minify?: boolean;
  sourceMaps?: boolean;
  target?: 'es2022' | 'es2020' | 'es2015';
}

export class CodeGenerator {
  private indent: number = 0;
  private output: string[] = [];
  private componentCounter: number = 0;

  generate(ast: AST.Program, options: CodeGenOptions = {}): string {
    this.output = [];
    this.indent = 0;

    this.emit(`import { createComponent, createSignal, createComputed, createEffect, createElement, mount } from '@aura/runtime';`);
    this.emit(`import { createSpace } from '@aura/runtime/store.js';`);
    this.emit(`import { createAnimationController } from '@aura/animation';`);
    this.emit('');

    for (const component of ast.components) {
      this.generateComponent(component);
      this.emit('');
    }

    if (ast.spaces) {
      for (const space of ast.spaces) {
        this.generateSpace(space);
        this.emit('');
      }
    }

    if (ast.styles && ast.styles.length > 0) {
      this.generateStyles(ast.styles);
    }

    return this.output.join('\n');
  }

  private generateStyles(styles: AST.StyleNode[]): void {
    let css = '';

    for (const style of styles) {
      for (const rule of style.rules) {
        css += `${rule.selector} { `;
        for (const [prop, value] of Object.entries(rule.properties)) {
          // If value is expression, we might need more complex handling
          // For now assuming simples literals or we'd need runtime injection
          if (typeof value === 'object') {
            // It's an expression AST Node, for this MVP we skip dynamic styles in this block
            // or render a placeholder. 
            // In a real implementation this would generate CSS variables.
            // css += `${prop}: var(--${prop}); `;
          } else {
            css += `${prop}: ${value}; `;
          }
        }
        css += '} ';
      }
    }

    if (css) {
      this.emit(`// Injected Styles`);
      this.emit(`if (typeof document !== 'undefined') {`);
      this.indentLevel++;
      this.emit(`const style = document.createElement('style');`);
      this.emit(`style.textContent = \`${css}\`;`);
      this.emit(`document.head.appendChild(style);`);
      this.indentLevel--;
      this.emit(`}`);
    }
  }
  private generateComponent(component: AST.ComponentNode): void {
    const componentId = `Component_${this.componentCounter++}`;

    this.emit(`export const ${component.name} = createComponent({`);
    this.indentLevel++;

    this.emit(`name: '${component.name}',`);

    if (component.accessibility.role) {
      this.emit(`role: '${component.accessibility.role}',`);
    }
    if (component.accessibility.label) {
      this.emit(`ariaLabel: '${component.accessibility.label}',`);
    }

    this.emit(`setup(props) {`);
    this.indentLevel++;

    for (const state of component.states) {
      this.generateState(state);
    }

    for (const computed of component.computed) {
      this.generateComputed(computed);
    }

    if (component.styles.length > 0) {
      this.generateStyles(component.styles);
    }

    for (const effect of component.effects) {
      this.generateEffect(effect);
    }

    const animations = new Map<string, AST.AnimationDeclaration>();
    for (const animation of component.animations) {
      animations.set(animation.trigger, animation);
    }

    if (animations.size > 0) {
      this.emit(`const animationController = createAnimationController();`);
    }

    for (const handler of component.handlers) {
      this.generateEventHandler(handler, animations);
    }

    this.emit('');
    this.emit(`return {`);
    this.indentLevel++;

    for (const state of component.states) {
      this.emit(`${state.name},`);
    }
    for (const computed of component.computed) {
      this.emit(`${computed.name},`);
    }
    for (const handler of component.handlers) {
      this.emit(`handle${this.capitalize(handler.event)},`);
    }

    this.indentLevel--;
    this.emit(`};`);

    this.indentLevel--;
    this.emit(`},`);

    this.emit(`render(ctx) {`);
    this.indentLevel++;

    this.emit(`return [`);
    this.indentLevel++;

    for (const element of component.body) {
      this.generateElement(element, 'ctx');
    }

    this.indentLevel--;
    this.emit(`];`);

    this.indentLevel--;
    this.emit(`}`);

    this.indentLevel--;
    this.emit(`});`);
  }

  private generateSpace(space: AST.SpaceNode): void {
    this.emit(`export const ${space.name} = createSpace(`);
    this.indentLevel++;

    // Name
    this.emit(`'${space.name}',`);

    // Initial State
    this.emit(`{`);
    this.indentLevel++;
    for (const state of space.states) {
      const initialValue = this.generateExpression(state.initialValue);
      this.emit(`${state.name}: ${initialValue},`);
    }
    this.indentLevel--;
    this.emit(`},`);

    // Computed Definitions
    this.emit(`{`);
    this.indentLevel++;
    for (const computed of space.computed) {
      const expression = this.generateExpression(computed.expression);
      this.emit(`${computed.name}: function() { return ${expression}; },`);
    }
    this.indentLevel--;
    this.emit(`},`);

    // Effects
    this.emit(`[`);
    this.indentLevel++;
    for (const effect of space.effects) {
      this.emit(`function() {`);
      this.indentLevel++;
      for (const stmt of effect.body) {
        this.emit(`${this.generateStatement(stmt)};`);
      }
      this.indentLevel--;
      this.emit(`},`);
    }
    this.indentLevel--;
    this.emit(`]`);

    this.indentLevel--;
    this.emit(`);`);
  }

  private generateState(state: AST.StateDeclaration): void {
    const initialValue = this.generateExpression(state.initialValue);
    this.emit(`const [${state.name}, set${this.capitalize(state.name)}] = createSignal(${initialValue});`);
  }

  private generateComputed(computed: AST.ComputedDeclaration): void {
    const expression = this.generateExpression(computed.expression);
    this.emit(`const ${computed.name} = createComputed(() => ${expression});`);
  }

  private generateEffect(effect: AST.EffectDeclaration): void {
    const deps = effect.dependencies.map(d => `() => ${d}`).join(', ');
    this.emit(`createEffect([${deps}], () => {`);
    this.indentLevel++;

    for (const stmt of effect.body) {
      this.emit(`${this.generateStatement(stmt)};`);
    }

    this.indentLevel--;
    this.emit(`});`);
  }

  private generateEventHandler(handler: AST.EventHandler, animations: Map<string, AST.AnimationDeclaration>): void {
    const handlerName = `handle${this.capitalize(handler.event)}`;
    const params = handler.handler.params.join(', ');
    const body = this.generateExpression(handler.handler.body as AST.Expression);

    this.emit(`const ${handlerName} = (${params}) => {`);
    this.indentLevel++;

    const animation = animations.get(handler.event);
    if (animation) {
      this.emit(`animationController.animate({`);
      this.indentLevel++;
      this.emit(`properties: {`);
      this.indentLevel++;

      for (const prop of animation.properties) {
        const to = this.generateExpression(prop.to);
        this.emit(`${prop.property}: ${to},`);
      }

      this.indentLevel--;
      this.emit(`},`);
      this.emit(`duration: ${animation.duration},`);
      this.emit(`easing: '${animation.easing}'`);
      this.indentLevel--;
      this.emit(`});`);
    }

    this.emit(`${body};`);

    this.indentLevel--;
    this.emit(`};`);
  }

  private generateElement(element: AST.ElementNode, contextVar: string): void {
    const attrs: string[] = [];

    for (const attr of element.attributes) {
      const value = this.generateExpression(attr.value);
      attrs.push(`${attr.name}: ${value}`);
    }

    if (element.role) {
      attrs.push(`role: '${element.role}'`);
    }
    if (element.ariaLabel) {
      attrs.push(`'aria-label': '${element.ariaLabel}'`);
    }

    const attrsStr = attrs.length > 0 ? `{ ${attrs.join(', ')} }` : 'null';

    this.emit(`createElement('${element.tag}', ${attrsStr}, [`);
    this.indentLevel++;

    for (const child of element.children) {
      if (child.type === AST.NodeType.ELEMENT) {
        this.generateElement(child, contextVar);
      } else if (child.type === AST.NodeType.TEXT) {
        this.generateText(child, contextVar);
      } else if (child.type === AST.NodeType.CONDITIONAL) {
        this.generateConditional(child, contextVar);
      } else if (child.type === AST.NodeType.LOOP) {
        this.generateLoop(child, contextVar);
      }
    }

    this.indentLevel--;
    this.emit(`]),`);
  }

  private generateText(text: AST.TextNode, contextVar: string): void {
    if (text.interpolations.length === 0) {
      this.emit(`'${this.escapeString(text.content)}',`);
    } else {
      const parts = text.content.split(/\$\{[^}]+\}/);
      const interpolated = parts.map((part, i) => {
        if (i < text.interpolations.length) {
          const expr = this.generateExpression(text.interpolations[i]);
          return `'${this.escapeString(part)}' + ${expr}`;
        }
        return `'${this.escapeString(part)}'`;
      }).join(' + ');
      this.emit(`${interpolated},`);
    }
  }

  private generateConditional(conditional: AST.ConditionalNode, contextVar: string): void {
    const condition = this.generateExpression(conditional.condition);

    this.emit(`${condition} ? [`);
    this.indentLevel++;

    for (const node of conditional.consequent) {
      if (node.type === AST.NodeType.ELEMENT) {
        this.generateElement(node, contextVar);
      } else if (node.type === AST.NodeType.TEXT) {
        this.generateText(node, contextVar);
      }
    }

    this.indentLevel--;

    if (conditional.alternate && conditional.alternate.length > 0) {
      this.emit(`] : [`);
      this.indentLevel++;

      for (const node of conditional.alternate) {
        if (node.type === AST.NodeType.ELEMENT) {
          this.generateElement(node, contextVar);
        } else if (node.type === AST.NodeType.TEXT) {
          this.generateText(node, contextVar);
        }
      }

      this.indentLevel--;
      this.emit(`],`);
    } else {
      this.emit(`] : null,`);
    }
  }

  private generateLoop(loop: AST.LoopNode, contextVar: string): void {
    const iterable = this.generateExpression(loop.iterable);
    const indexVar = loop.index || 'index';

    this.emit(`...${iterable}.map((${loop.item}, ${indexVar}) => [`);
    this.indentLevel++;

    for (const node of loop.body) {
      if (node.type === AST.NodeType.ELEMENT) {
        this.generateElement(node, contextVar);
      } else if (node.type === AST.NodeType.TEXT) {
        this.generateText(node, contextVar);
      }
    }

    this.indentLevel--;
    this.emit(`]),`);
  }

  private generateExpression(expr: AST.Expression): string {
    switch (expr.type) {
      case AST.NodeType.IDENTIFIER:
        return expr.name;

      case AST.NodeType.LITERAL:
        if (typeof expr.value === 'string') {
          return `'${this.escapeString(expr.value)}'`;
        }
        return String(expr.value);

      case AST.NodeType.BINARY_EXPRESSION:
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        return `(${left} ${expr.operator} ${right})`;

      case AST.NodeType.UNARY_EXPRESSION:
        const arg = this.generateExpression(expr.argument);
        return `${expr.operator}${arg}`;

      case AST.NodeType.CALL_EXPRESSION:
        const callee = this.generateExpression(expr.callee);
        const args = expr.arguments.map(a => this.generateExpression(a)).join(', ');
        return `${callee}(${args})`;

      case AST.NodeType.MEMBER_EXPRESSION:
        const object = this.generateExpression(expr.object);
        if (expr.computed) {
          const property = this.generateExpression(expr.property);
          return `${object}[${property}]`;
        } else {
          const prop = expr.property as AST.Identifier;
          return `${object}.${prop.name}`;
        }

      case AST.NodeType.CONDITIONAL_EXPRESSION:
        const test = this.generateExpression(expr.test);
        const consequent = this.generateExpression(expr.consequent);
        const alternate = this.generateExpression(expr.alternate);
        return `(${test} ? ${consequent} : ${alternate})`;

      case AST.NodeType.ARRAY_EXPRESSION:
        const elements = expr.elements.map(e => this.generateExpression(e)).join(', ');
        return `[${elements}]`;

      case AST.NodeType.OBJECT_EXPRESSION:
        const props = expr.properties.map(p =>
          `${p.key}: ${this.generateExpression(p.value)}`
        ).join(', ');
        return `{ ${props} }`;

      case AST.NodeType.ARROW_FUNCTION:
        const params = expr.params.join(', ');
        const body = typeof expr.body === 'object' && 'type' in expr.body
          ? this.generateExpression(expr.body as AST.Expression)
          : '{}';
        return `(${params}) => ${body}`;

      default:
        return 'null';
    }
  }

  private generateStatement(stmt: AST.Statement): string {
    if ('type' in stmt && stmt.type === AST.NodeType.STATE_DECLARATION) {
      const initialValue = this.generateExpression(stmt.initialValue);
      return `const ${stmt.name} = ${initialValue}`;
    }

    return this.generateExpression(stmt as AST.Expression);
  }

  private emit(code: string): void {
    const indentation = '  '.repeat(this.indent);
    this.output.push(indentation + code);
  }

  private get indentLevel(): number {
    return this.indent;
  }

  private set indentLevel(level: number) {
    this.indent = level;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
