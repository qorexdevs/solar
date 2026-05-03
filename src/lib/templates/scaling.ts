import type {
  BOMLineItem,
  BOMUom,
  OtherScopeItem,
  ScalingType,
} from '@/types';
import { matchesApplicability, type ApplicabilityContext } from './applicability';

/**
 * Inputs every scaling helper needs. `baseCapacityKW` is from the parent
 * template; the rest narrow to the current estimate.
 */
export type ScalingContext = ApplicabilityContext & {
  baseCapacityKW: number;
};

/**
 * Returns `true` when the line is "active" for an estimate context. Active
 * means: passes applicability gating AND the conditional/optional gates.
 *
 * `optional` lines are gated by `userIncluded`; everything else is active by
 * default unless explicitly excluded.
 */
export function isLineIncluded(
  line: BOMLineItem,
  ctx: ScalingContext,
  userIncluded: boolean
): { included: boolean; applicabilityFiltered: boolean } {
  const applicability = matchesApplicability(line.applicability, ctx);
  if (!applicability) return { included: false, applicabilityFiltered: true };

  if (line.scalingType === 'conditional') {
    return { included: true, applicabilityFiltered: false };
  }

  if (line.scalingType === 'optional' || line.isOptional) {
    return { included: userIncluded, applicabilityFiltered: false };
  }

  return { included: true, applicabilityFiltered: false };
}

export function isScopeIncluded(
  item: OtherScopeItem,
  ctx: ScalingContext,
  userIncluded: boolean
): { included: boolean; applicabilityFiltered: boolean } {
  const applicability = matchesApplicability(item.applicability, ctx);
  if (!applicability) return { included: false, applicabilityFiltered: true };

  if (item.scalingType === 'conditional') {
    return { included: true, applicabilityFiltered: false };
  }

  if (item.scalingType === 'optional' || item.isOptional) {
    return { included: userIncluded, applicabilityFiltered: false };
  }

  return { included: true, applicabilityFiltered: false };
}

/**
 * Compute the scaled quantity for a Main BOM line per its `scalingType`.
 * Returns `0` when the line is not active (caller treats as excluded).
 *
 * Rules (PRD §7):
 *   - fixed:        baseQuantity (no change)
 *   - linear:       baseQuantity × targetKW / baseKW
 *   - step:         ceil(targetKW / unitCapacityKW) × baseQuantity
 *   - conditional:  baseQuantity (gated by applicability)
 *   - optional:     baseQuantity (gated by user inclusion)
 *
 * `scalingFormula` (when present) overrides the default math via the safe
 * arithmetic DSL: `targetKW`, `baseKW`, `baseQty`, `Math.ceil/floor/round/min/max`.
 */
export function scaledQuantity(line: BOMLineItem, ctx: ScalingContext): number {
  const result = computeScaled({
    scalingType: line.scalingType,
    baseAmount: line.baseQuantity,
    unitCapacityKW: line.unitCapacityKW,
    scalingFormula: line.scalingFormula,
    ctx,
  });
  return roundForUom(result, line.uom);
}

/** Same logic as `scaledQuantity` but for an Other Scope item's INR amount. */
export function scaledScopeAmount(item: OtherScopeItem, ctx: ScalingContext): number {
  return computeScaled({
    scalingType: item.scalingType,
    baseAmount: item.baseAmount,
    unitCapacityKW: item.unitCapacityKW,
    scalingFormula: item.scalingFormula,
    ctx,
  });
}

/* ------------------------------------------------------------------------ */
/* Internals                                                                 */
/* ------------------------------------------------------------------------ */

type ScaleArgs = {
  scalingType: ScalingType;
  baseAmount: number;
  unitCapacityKW?: number;
  scalingFormula?: string;
  ctx: ScalingContext;
};

function computeScaled(args: ScaleArgs): number {
  const { scalingType, baseAmount, unitCapacityKW, scalingFormula, ctx } = args;

  if (scalingFormula && scalingFormula.trim().length > 0) {
    try {
      return Math.max(0, evalFormula(scalingFormula, ctx, baseAmount));
    } catch {
      // fall through to default math on bad formulas; the editor surfaces
      // validation errors, so production estimates degrade gracefully.
    }
  }

  switch (scalingType) {
    case 'fixed':
    case 'conditional':
    case 'optional':
      return baseAmount;
    case 'linear': {
      if (ctx.baseCapacityKW <= 0) return 0;
      return (baseAmount * ctx.targetCapacityKW) / ctx.baseCapacityKW;
    }
    case 'step': {
      if (!unitCapacityKW || unitCapacityKW <= 0) return 0;
      return Math.ceil(ctx.targetCapacityKW / unitCapacityKW) * baseAmount;
    }
  }
}

function roundForUom(qty: number, uom: BOMUom): number {
  if (qty <= 0) return 0;
  if (uom === 'count' || uom === 'kW' || uom === 'Wp') return Math.round(qty);
  return qty;
}

/* ------------------------------------------------------------------------ */
/* Safe formula evaluator                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Tokens allowed inside a `scalingFormula`:
 *   - numeric literals
 *   - variables: `targetKW`, `baseKW`, `baseQty`, `baseAmount`
 *   - functions: `Math.ceil/floor/round/min/max`
 *   - operators: `+ - * /` and parentheses
 *
 * Anything outside this grammar throws; the caller falls back to default
 * scaling math.
 */
export function evalFormula(
  expression: string,
  ctx: ScalingContext,
  baseAmount: number
): number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  if (!parser.eof()) throw new Error('Unexpected trailing input');

  const env: Record<string, number> = {
    targetKW: ctx.targetCapacityKW,
    baseKW: ctx.baseCapacityKW,
    baseQty: baseAmount,
    baseAmount: baseAmount,
  };
  return evalNode(ast, env);
}

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'dot' };

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`Bad number at ${i}`);
      out.push({ type: 'num', value: num });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      out.push({ type: 'ident', value: s.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/') {
      out.push({ type: 'op', value: c });
      i++;
      continue;
    }
    if (c === '(') {
      out.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (c === ')') {
      out.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (c === ',') {
      out.push({ type: 'comma' });
      i++;
      continue;
    }
    if (c === '.') {
      out.push({ type: 'dot' });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}" at ${i}`);
  }
  return out;
}

type Node =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'binop'; op: '+' | '-' | '*' | '/'; lhs: Node; rhs: Node }
  | { type: 'neg'; arg: Node }
  | { type: 'call'; name: string; args: Node[] };

class Parser {
  pos = 0;
  constructor(public tokens: Token[]) {}

  eof(): boolean {
    return this.pos >= this.tokens.length;
  }
  peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }
  consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('Unexpected end of input');
    this.pos++;
    return t;
  }

  parseExpression(): Node {
    return this.parseAddSub();
  }
  parseAddSub(): Node {
    let left = this.parseMulDiv();
    while (true) {
      const t = this.peek();
      if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
        this.consume();
        const right = this.parseMulDiv();
        left = { type: 'binop', op: t.value, lhs: left, rhs: right };
      } else break;
    }
    return left;
  }
  parseMulDiv(): Node {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t?.type === 'op' && (t.value === '*' || t.value === '/')) {
        this.consume();
        const right = this.parseUnary();
        left = { type: 'binop', op: t.value, lhs: left, rhs: right };
      } else break;
    }
    return left;
  }
  parseUnary(): Node {
    const t = this.peek();
    if (t?.type === 'op' && t.value === '-') {
      this.consume();
      return { type: 'neg', arg: this.parseUnary() };
    }
    if (t?.type === 'op' && t.value === '+') {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }
  parsePrimary(): Node {
    const t = this.consume();
    if (t.type === 'num') return { type: 'num', value: t.value };
    if (t.type === 'lparen') {
      const node = this.parseExpression();
      const rp = this.consume();
      if (rp.type !== 'rparen') throw new Error('Expected ")"');
      return node;
    }
    if (t.type === 'ident') {
      if (this.peek()?.type === 'dot') {
        if (t.value !== 'Math') throw new Error(`Unknown namespace "${t.value}"`);
        this.consume();
        const fn = this.consume();
        if (fn.type !== 'ident') throw new Error('Expected function name after Math.');
        const lp = this.consume();
        if (lp.type !== 'lparen') throw new Error('Expected "(" after Math.fn');
        const args: Node[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        const rp = this.consume();
        if (rp.type !== 'rparen') throw new Error('Expected ")"');
        return { type: 'call', name: fn.value, args };
      }
      return { type: 'var', name: t.value };
    }
    throw new Error(`Unexpected token "${t.type}"`);
  }
}

const ALLOWED_FNS: Record<string, (...args: number[]) => number> = {
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
};

function evalNode(node: Node, env: Record<string, number>): number {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'var': {
      const v = env[node.name];
      if (typeof v !== 'number') throw new Error(`Unknown variable "${node.name}"`);
      return v;
    }
    case 'neg':
      return -evalNode(node.arg, env);
    case 'binop': {
      const a = evalNode(node.lhs, env);
      const b = evalNode(node.rhs, env);
      switch (node.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return b === 0 ? 0 : a / b;
      }
      return 0;
    }
    case 'call': {
      const fn = ALLOWED_FNS[node.name];
      if (!fn) throw new Error(`Unknown function "Math.${node.name}"`);
      return fn(...node.args.map((a) => evalNode(a, env)));
    }
  }
}
