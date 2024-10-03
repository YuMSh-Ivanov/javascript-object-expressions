"use strict";

const util = require('node:util');
const {Const, Variable, Add, Subtract, Multiply, Divide, Negate} = require('./object');

const sfc32 = require("./random-sfc32");
const rng = sfc32(0xB16B00B5, 0xCAFEBABE, 0xDEADBEEF, 0xF0CACC1A);


const numbersStr = ["0.0", "-0.0",
                    "1", "-1",
                    "1000", "-1000",
                    "0.001", "-0.001",
                    "Number.MAX_SAFE_INTEGER", "Number.MIN_SAFE_INTEGER", "Number.MAX_SAFE_INTEGER + 1", "Number.MIN_SAFE_INTEGER - 1",
                    "Number.MAX_VALUE", "-Number.MAX_VALUE",
                    "Number.MIN_VALUE", "-Number.MIN_VALUE",
                    "Number.EPSILON", "-Number.EPSILON",
                    "Number.POSITIVE_INFINITY", "Number.NEGATIVE_INFINITY", "Number.NaN"];

const numbers = numbersStr.map(eval);

const variables = ['x', 'y', 'z'];

function capture(msg, checks) {
    try {
        return checks();
    } catch (err) {
        err.message += "\n" + msg;
        throw err;
    }
}


let variant = process.argv.filter(x => x.startsWith('--variant='))[0]
variant = variant ? variant : "easy";

function testExpression(actualStr, evaluate, repr, expectedDiff) {
    const actual = eval(actualStr);
    capture(`Testing evaluate of ${actualStr}`, () => {
        for (const x of numbers) {
           for (const y of numbers) {
                for (const z of numbers) {
                    capture(`At point [${x}, ${y}, ${z}]`, () => expect(actual.evaluate(x, y, z)).toBe(evaluate(x, y, z)));
                }
            }
        }
    });
    capture(`Testing prefix of ${actualStr}`, () => {
        expect(actual.prefix()).toBe(repr);
    });

    if (variant === 'hard') {
        for (const v of variables) {
            capture(`Testing diff of ${actualStr} with respect to "${v}"`, () => {
                const actualDiff = actual.diff(v);
                const diffEval = expectedDiff(v);
                capture(`Diff recieved is ${actualDiff.toString()}`, () => {
                    for (const x of numbers) {
                        for (const y of numbers) {
                            for (const z of numbers) {
                                capture(`At point [${x}, ${y}, ${z}]`, () => expect(actualDiff.evaluate(x, y, z)).toBe(diffEval(x, y, z)));
                            }
                        }
                    }
                });
            });
        }
    }
}

test('constants', () => {
    for (let i = 0; i < numbers.length; i++) {
        testExpression(`new Const(${numbersStr[i]})`, (x, y, z) => numbers[i], numbers[i].toString(), v => (x, y, z) => 0);
    }
});

test('variables', () => {
    testExpression("new Variable('x')", (x, y, z) => x, 'x', v => v === 'x' ? (x, y, z) => 1 : (x, y, z) => 0);

    testExpression("new Variable('y')", (x, y, z) => y, 'y', v => v === 'y' ? (x, y, z) => 1 : (x, y, z) => 0);

    testExpression("new Variable('z')", (x, y, z) => z, 'z', v => v === 'z' ? (x, y, z) => 1 : (x, y, z) => 0);
});

test('simple', () => {
    testExpression("new Add(new Const(3), new Variable('y'))", (x, y, z) => 3 + y, "(+ 3 y)", v => v === 'y' ? (x, y, z) => 1 : (x, y, z) => 0);

    testExpression("new Subtract(new Const(Number.MAX_SAFE_INTEGER), new Variable('z'))", (x, y, z) => Number.MAX_SAFE_INTEGER - z, `(- ${Number.MAX_SAFE_INTEGER} z)`, v => v === 'z' ? (x, y, z) => -1 : (x, y, z) => 0);

    testExpression("new Multiply(new Variable('x'), new Variable('z'))", (x, y, z) => x * z, "(* x z)", v => v === 'x' ? (x, y, z) => z : v === 'y' ? (x, y, z) => 0 : (x, y, z) => x);

    testExpression("new Divide(new Variable('z'), new Variable('y'))", (x, y, z) => z / y, "(/ z y)", v => v === 'x' ? (x, y, z) => 0 : v === 'y' ? (x, y, z) => -z / (y * y) : (x, y, z) => 1 / y);

    testExpression("new Negate(new Variable('x'))", (x, y, z) => -x, "(negate x)", v => v === 'x' ? (x, y, z) => -1 : (x, y, z) => 0);
});

const operations = [["Add",      ["+"], "+",      2, "`(${args[0].d} + ${args[1].d})`"],
                    ["Subtract", ["-"], "-",      2, "`(${args[0].d} - ${args[1].d})`"],
                    ["Multiply", ["*"], "*",      2, "`(${args[0].d} * ${args[1].e} + ${args[1].d} * ${args[0].e})`"],
                    ["Divide",   ["/"], "/",      2, "`((${args[0].d} * ${args[1].e} - ${args[1].d} * ${args[0].e}) / (${args[1].e} * ${args[1].e}))`"],
                    ["Negate",   ["-"], "negate", 1, "`(-${args[0].d})`"]];
const fmts = ["%s", "(%s%%s)", "(%%s %s %%s)"];

function generateRandomTest(depth) {
    const r = depth > 0 ? Math.floor(rng() * operations.length) : Math.floor(rng() * 2) + operations.length;
    if (r === operations.length) {
        const c = rng() * 200001 - 100000;
        return {a : `new Const(${c})`, e : `(${c})`, s : c, d : "0"};
    } else if (r === operations.length + 1) {
        const v = variables[Math.floor(rng() * variables.length)];
        return {a : `new Variable('${v}')`, e : `(${v})`, s : v, d : `(name === ${v} ? 1 : 0)`};
    }
    const {0 : oper, 1 : chrs, 2 : name, 3 : acnt, 4 : dfmt} = operations[r];
    const fmt = util.format(fmts[acnt], ...chrs);
    const args = Array.from({length : acnt}, () => generateRandomTest(depth - 1));
    return {a : `new ${oper}(${args.map(t => t.a)})`, e : util.format(fmt, ...args.map(t => t.e)), s : `(${name} ${args.map(t => t.s).toString().replaceAll(',', ' ')})`, d : eval(dfmt)};
}

function randomTest(depth, count) {
    test("random with depth " + depth, () => {
        for (let i = 0; i < count; i++) {
            const {a : actual, e : expected, s : repr, d : diff} = generateRandomTest(depth)
            testExpression(actual, eval("(x, y, z) => " + expected), repr, eval(`name => (x, y, z) => ${diff}`));
        }
    })
}

randomTest(2, 10)
randomTest(3, 10)
randomTest(5, 10)
randomTest(10, 5)
