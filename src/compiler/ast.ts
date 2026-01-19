export enum NodeType {
  PROGRAM = 'PROGRAM',
  COMPONENT = 'COMPONENT',
  SPACE = 'SPACE',
  STYLE = 'STYLE',
  STATE_DECLARATION = 'STATE_DECLARATION',
  COMPUTED_DECLARATION = 'COMPUTED_DECLARATION',
  EFFECT_DECLARATION = 'EFFECT_DECLARATION',
  EVENT_HANDLER = 'EVENT_HANDLER',
  ANIMATION = 'ANIMATION',
  ELEMENT = 'ELEMENT',
  TEXT = 'TEXT',
  CONDITIONAL = 'CONDITIONAL',
  LOOP = 'LOOP',
  SLOT = 'SLOT',
  EMIT = 'EMIT',

  IDENTIFIER = 'IDENTIFIER',
  LITERAL = 'LITERAL',
  BINARY_EXPRESSION = 'BINARY_EXPRESSION',
  UNARY_EXPRESSION = 'UNARY_EXPRESSION',
  CALL_EXPRESSION = 'CALL_EXPRESSION',
  MEMBER_EXPRESSION = 'MEMBER_EXPRESSION',
  ARRAY_EXPRESSION = 'ARRAY_EXPRESSION',
  OBJECT_EXPRESSION = 'OBJECT_EXPRESSION',
  ARROW_FUNCTION = 'ARROW_FUNCTION',
  BLOCK = 'BLOCK',
  CONDITIONAL_EXPRESSION = 'CONDITIONAL_EXPRESSION'
}

export interface ASTNode {
  type: NodeType;
  line: number;
  column: number;
}

export interface Program extends ASTNode {
  type: NodeType.PROGRAM;
  components: ComponentNode[];
  spaces: SpaceNode[];
  styles: StyleNode[];
}

export interface StyleNode extends ASTNode {
  type: NodeType.STYLE;
  rules: StyleRule[];
}

export interface StyleRule {
  selector: string;
  properties: Record<string, string | Expression>;
}

export interface SpaceNode extends ASTNode {
  type: NodeType.SPACE;
  name: string;
  states: StateDeclaration[];
  computed: ComputedDeclaration[];
  effects: EffectDeclaration[];
  handlers: EventHandler[];
}

export interface ComponentNode extends ASTNode {
  type: NodeType.COMPONENT;
  name: string;
  props: PropertyDeclaration[];
  states: StateDeclaration[];
  computed: ComputedDeclaration[];
  effects: EffectDeclaration[];
  handlers: EventHandler[];
  animations: AnimationDeclaration[];
  styles: StyleNode[];
  body: ElementNode[];
  accessibility: AccessibilityInfo;
}

export interface PropertyDeclaration {
  name: string;
  defaultValue?: Expression;
  required: boolean;
}

export interface StateDeclaration extends ASTNode {
  type: NodeType.STATE_DECLARATION;
  name: string;
  initialValue: Expression;
}

export interface ComputedDeclaration extends ASTNode {
  type: NodeType.COMPUTED_DECLARATION;
  name: string;
  dependencies: string[];
  expression: Expression;
}

export interface EffectDeclaration extends ASTNode {
  type: NodeType.EFFECT_DECLARATION;
  dependencies: string[];
  body: Statement[];
}

export interface EventHandler extends ASTNode {
  type: NodeType.EVENT_HANDLER;
  event: string;
  handler: ArrowFunction;
}

export interface AnimationDeclaration extends ASTNode {
  type: NodeType.ANIMATION;
  trigger: string;
  properties: AnimationProperty[];
  duration: number;
  easing: string;
  stagger?: number;
}

export interface AnimationProperty {
  property: string;
  from?: Expression;
  to: Expression;
}

export interface ElementNode extends ASTNode {
  type: NodeType.ELEMENT;
  tag: string;
  attributes: Attribute[];
  children: (ElementNode | TextNode | ConditionalNode | LoopNode | SlotNode)[];
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface Attribute {
  name: string;
  value: Expression;
}

export interface TextNode extends ASTNode {
  type: NodeType.TEXT;
  content: string;
  interpolations: Expression[];
}

export interface ConditionalNode extends ASTNode {
  type: NodeType.CONDITIONAL;
  condition: Expression;
  consequent: (ElementNode | TextNode)[];
  alternate?: (ElementNode | TextNode)[];
}

export interface LoopNode extends ASTNode {
  type: NodeType.LOOP;
  item: string;
  index?: string;
  iterable: Expression;
  body: (ElementNode | TextNode)[];
  key?: Expression;
}

export interface SlotNode extends ASTNode {
  type: NodeType.SLOT;
  name?: string;
  fallback?: (ElementNode | TextNode)[];
}

export interface EmitNode extends ASTNode {
  type: NodeType.EMIT;
  event: string;
  data?: Expression;
}

export interface AccessibilityInfo {
  role?: string;
  label?: string;
  description?: string;
  keyboardShortcuts?: string[];
  focusManagement?: 'auto' | 'manual';
}

export type Expression =
  | Identifier
  | Literal
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression
  | ObjectExpression
  | ObjectExpression
  | ArrowFunction
  | ConditionalExpression;

export interface Identifier extends ASTNode {
  type: NodeType.IDENTIFIER;
  name: string;
}

export interface Literal extends ASTNode {
  type: NodeType.LITERAL;
  value: string | number | boolean;
  raw: string;
}

export interface BinaryExpression extends ASTNode {
  type: NodeType.BINARY_EXPRESSION;
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends ASTNode {
  type: NodeType.UNARY_EXPRESSION;
  operator: string;
  argument: Expression;
}

export interface CallExpression extends ASTNode {
  type: NodeType.CALL_EXPRESSION;
  callee: Expression;
  arguments: Expression[];
}

export interface MemberExpression extends ASTNode {
  type: NodeType.MEMBER_EXPRESSION;
  object: Expression;
  property: Expression;
  computed: boolean;
}

export interface ArrayExpression extends ASTNode {
  type: NodeType.ARRAY_EXPRESSION;
  elements: Expression[];
}

export interface ObjectExpression extends ASTNode {
  type: NodeType.OBJECT_EXPRESSION;
  properties: ObjectProperty[];
}

export interface ObjectProperty {
  key: string;
  value: Expression;
}

export interface ArrowFunction extends ASTNode {
  type: NodeType.ARROW_FUNCTION;
  params: string[];
  body: Expression | Statement[];
}

export type Statement = Expression | StateDeclaration | EmitNode;

export interface Block extends ASTNode {
  type: NodeType.BLOCK;
  statements: Statement[];
}

export interface ConditionalExpression extends ASTNode {
  type: NodeType.CONDITIONAL_EXPRESSION;
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}
