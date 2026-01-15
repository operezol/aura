import * as AST from './ast.js';

export interface SemanticError {
  message: string;
  line: number;
  column: number;
}

export interface SemanticWarning {
  message: string;
  line: number;
  column: number;
}

export class SemanticAnalyzer {
  private errors: SemanticError[] = [];
  private warnings: SemanticWarning[] = [];
  private declaredVariables = new Set<string>();

  analyze(ast: AST.Program): { errors: SemanticError[]; warnings: SemanticWarning[] } {
    this.errors = [];
    this.warnings = [];

    for (const component of ast.components) {
      this.analyzeComponent(component);
    }

    return {
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private analyzeComponent(component: AST.ComponentNode): void {
    this.declaredVariables.clear();

    for (const state of component.states) {
      if (this.declaredVariables.has(state.name)) {
        this.errors.push({
          message: `Duplicate state declaration: ${state.name}`,
          line: state.line,
          column: state.column
        });
      }
      this.declaredVariables.add(state.name);
    }

    for (const computed of component.computed) {
      if (this.declaredVariables.has(computed.name)) {
        this.errors.push({
          message: `Duplicate computed declaration: ${computed.name}`,
          line: computed.line,
          column: computed.column
        });
      }
      this.declaredVariables.add(computed.name);

      for (const dep of computed.dependencies) {
        if (!this.declaredVariables.has(dep)) {
          this.warnings.push({
            message: `Computed '${computed.name}' depends on undeclared variable: ${dep}`,
            line: computed.line,
            column: computed.column
          });
        }
      }
    }

    for (const effect of component.effects) {
      for (const dep of effect.dependencies) {
        if (!this.declaredVariables.has(dep)) {
          this.warnings.push({
            message: `Effect depends on undeclared variable: ${dep}`,
            line: effect.line,
            column: effect.column
          });
        }
      }
    }

    this.validateAccessibility(component);

    for (const element of component.body) {
      this.analyzeElement(element);
    }
  }

  private validateAccessibility(component: AST.ComponentNode): void {
    const hasInteractiveElements = this.hasInteractiveElements(component.body);

    if (hasInteractiveElements && !component.accessibility.role) {
      this.warnings.push({
        message: `Component '${component.name}' has interactive elements but no role defined`,
        line: component.line,
        column: component.column
      });
    }

    if (component.handlers.length > 0 && !component.accessibility.label) {
      this.warnings.push({
        message: `Component '${component.name}' has event handlers but no aria-label`,
        line: component.line,
        column: component.column
      });
    }
  }

  private hasInteractiveElements(elements: AST.ElementNode[]): boolean {
    const interactiveTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    for (const element of elements) {
      if (interactiveTags.includes(element.tag)) {
        return true;
      }
      
      if (element.children.length > 0) {
        const childElements = element.children.filter(
          (child): child is AST.ElementNode => child.type === AST.NodeType.ELEMENT
        );
        if (this.hasInteractiveElements(childElements)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private analyzeElement(element: AST.ElementNode): void {
    if (element.tag === 'button' && !element.ariaLabel) {
      const hasTextContent = element.children.some(
        child => child.type === AST.NodeType.TEXT
      );
      
      if (!hasTextContent) {
        this.warnings.push({
          message: 'Button element without text content or aria-label',
          line: element.line,
          column: element.column
        });
      }
    }

    if (element.tag === 'img') {
      const hasAlt = element.attributes.some(attr => attr.name === 'alt');
      if (!hasAlt) {
        this.errors.push({
          message: 'Image element must have alt attribute',
          line: element.line,
          column: element.column
        });
      }
    }

    for (const child of element.children) {
      if (child.type === AST.NodeType.ELEMENT) {
        this.analyzeElement(child);
      } else if (child.type === AST.NodeType.CONDITIONAL) {
        this.analyzeConditional(child);
      } else if (child.type === AST.NodeType.LOOP) {
        this.analyzeLoop(child);
      }
    }
  }

  private analyzeConditional(conditional: AST.ConditionalNode): void {
    for (const node of conditional.consequent) {
      if (node.type === AST.NodeType.ELEMENT) {
        this.analyzeElement(node);
      }
    }

    if (conditional.alternate) {
      for (const node of conditional.alternate) {
        if (node.type === AST.NodeType.ELEMENT) {
          this.analyzeElement(node);
        }
      }
    }
  }

  private analyzeLoop(loop: AST.LoopNode): void {
    const prevVariables = new Set(this.declaredVariables);
    this.declaredVariables.add(loop.item);
    if (loop.index) {
      this.declaredVariables.add(loop.index);
    }

    for (const node of loop.body) {
      if (node.type === AST.NodeType.ELEMENT) {
        this.analyzeElement(node);
      }
    }

    this.declaredVariables = prevVariables;
  }
}
