"use strict";

const util = require('node:util');
const {Const, Variable, Add, Subtract, Multiply, Divide, Negate, RMS, Sin, Cos, Pi} = require('./object');

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
variant = variant ? variant.substr(10) : "base";
console.log(`Executing variant ${variant}`);

function testExpression(actualStr, evaluate, repr, name, inf) {
    const actual = eval(actualStr);
    capture(`(${actualStr}).constructor is wrong class`, () => {
        expect(actual.constructor).toBe(name);
    });
    capture(`Object.getPrototypeOf(${actualStr}) is not equal to class' prototype property`, () => {
        expect(Object.getPrototypeOf(actual)).toBe(name.prototype);
    })
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

    if (variant == "mod") {
        expect(actual.infix()).toBe(inf);
    }
}

test('constants', () => {
    for (let i = 0; i < numbers.length; i++) {
        testExpression(`new Const(${numbersStr[i]})`, (x, y, z) => numbers[i], numbers[i].toString(), Const, numbers[i].toString());
    }
});

test('variables', () => {
    testExpression("new Variable('x')", (x, y, z) => x, 'x', Variable, 'x');

    testExpression("new Variable('y')", (x, y, z) => y, 'y', Variable, 'y');

    testExpression("new Variable('z')", (x, y, z) => z, 'z', Variable, 'z');
});

test('simple', () => {
    testExpression("new Add(new Const(3), new Variable('y'))", (x, y, z) => 3 + y, "(+ 3 y)", Add, "(3 + y)");

    testExpression("new Subtract(new Const(Number.MAX_SAFE_INTEGER), new Variable('z'))", (x, y, z) => Number.MAX_SAFE_INTEGER - z, `(- ${Number.MAX_SAFE_INTEGER} z)`, Subtract, `(${Number.MAX_SAFE_INTEGER} - z)`);

    testExpression("new Multiply(new Variable('x'), new Variable('z'))", (x, y, z) => x * z, "(* x z)", Multiply, "(x * z)");

    testExpression("new Divide(new Variable('z'), new Variable('y'))", (x, y, z) => z / y, "(/ z y)", Divide, "(z / y)");

    testExpression("new Negate(new Variable('x'))", (x, y, z) => -x, "(negate x)", Negate, "-(x)");
});

const rms = (...args) => Math.sqrt(args.map(a => a * a).reduce((a, b) => a + b, 0) / args.length)
const pi = Math.PI;
const cos = Math.cos;
const sin = Math.sin;

if (variant == 'mod') {
    test('simple modification (var-args)', () => {
        testExpression("new Multiply(new Const(5))", (x, y, z) => 5, "(* 5)", Multiply, "(5)");
        testExpression("new Add(new Variable('y'))", (x, y, z) => y, "(+ y)", Add, "(y)");
        testExpression("new Multiply(new Variable('z'), new Variable('z'), new Variable('y'), new Variable('x'), new Const(777))", (x, y, z) => z * z * y * x * 777, "(* z z y x 777)", Multiply, "(z * z * y * x * 777)");
        testExpression("new Add(new Variable('y'), new Const(45), new Add(new Variable('x'), new Const(-3)), new Negate(new Variable('z')))", (x, y, z) => y + 45 + (x + -3) + -z, "(+ y 45 (+ x -3) (negate z))", Add, "(y + 45 + (x + -3) + -(z))");
        testExpression("new Add(new Multiply(new Const(-13), new Const(0.5), new Variable('y')), new Variable('x'), new Negate(new Add(new Variable('z'))), new Const(-15))", (x, y, z) => (-13 * 0.5 * y) + x + -(z) + -15, "(+ (* -13 0.5 y) x (negate (+ z)) -15)", Add, "((-13 * 0.5 * y) + x + -((z)) + -15)")
    });

    test('simple modification (operations)', () => {
        testExpression("new Pi()", (x, y, z) => Math.PI, "(PI)", Pi, "pi");
        testExpression("new Cos(new Pi())", (x, y, z) => -1, "(cos (PI))", Cos, "cos(pi)");
        testExpression("new Sin(new Divide(new Pi(), new Variable('z')))", (x, y, z) => Math.sin(Math.PI / z), "(sin (/ (PI) z))", Sin, "sin((pi / z))");
        testExpression("new RMS(new Variable('x'), new Add(new Variable('z'), new Const(-3)), new Const(4))", (x, y, z) => rms(x, (z + -3), 4), "(rms x (+ z -3) 4)", RMS, "rms(x, (z + -3), 4)");
    });
}

const operations = [["Add",      "+",      " + ", "",  variant === 'mod' ? -1 : 2],
                    ["Subtract", "-",      " - ", "",  2],
                    ["Multiply", "*",      " * ", "",  variant === 'mod' ? -1 : 2],
                    ["Divide",   "/",      " / ", "",  2],
                    ["Negate",   "negate", "",    "-", 1]];
if (variant === 'mod') {
    operations.push(['RMS', 'rms', ", ", "rms", -1]);
    operations.push(['Sin', 'sin', "",   "sin", 1]);
    operations.push(['Cos', 'cos', "",   "cos", 1]);
    operations.push(['Pi', 'PI',   "",   "pi",  0]);
}

function generateRandomTest(depth) {
    const r = depth > 0 ? Math.floor(rng() * (operations.length + 2)) : Math.floor(rng() * 2) + operations.length;
    if (r === operations.length) {
        const c = rng() * 200001 - 100000;
        return {a : `new Const(${c})`, e : c.toString(), s : c.toString(), c : "Const"};
    } else if (r === operations.length + 1) {
        const v = variables[Math.floor(rng() * variables.length)];
        return {a : `new Variable('${v}')`, e : v, s : v, c : "Variable"};
    }
    const {0 : oper, 1 : name, 2 : inf, 3 : pref, 4 : acnt1} = operations[r];
    const acnt = acnt1 !== -1 ? acnt1 : 1 + Math.floor(rng() * 6);
    const args = Array.from({length : acnt}, () => generateRandomTest(depth - 1));
    const impl = args.length === 0 ? pref : `${pref}(${args.map(t => t.e).join(inf)})`;
    return {c : oper, a : `new ${oper}(${args.map(t => t.a)})`, e : impl, s : `(${name}${args.map(t => ' ' + t.s).join('')})`};
}

function randomTest(depth, count) {
    test("random with depth " + depth, () => {
        for (let i = 0; i < count; i++) {
            const {a : actual, e : expected, s : repr, c : name} = generateRandomTest(depth)
            capture(expected, () => {
            testExpression(actual, eval(`(x, y, z) => ${expected}`), repr, eval(name), expected);
            });
        }
    })
}

randomTest(2, 10)
randomTest(3, 10)
randomTest(5, 10)
randomTest(10, 5)
