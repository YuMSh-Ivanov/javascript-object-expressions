# Объектные выражения на JavaScript.

1. Разработайте классы `Const`, `Variable`, `Add`, `Subtract`, `Multiply`, `Divide` и `Negate` для вычисления выражений с тремя переменными: `x`, `y` и `z`.
2. Функции должны позволять производить вычисления вида:
```js
let expr = new Subtract(
    new Multiply(
        new Const(2),
        new Variable("x")
    ),
    new Const(3)
);
console.log(expr.evaluate(5, 0, 0)); // 7
console.log(expr.prefix());          // (- (* 2 x) 3)
```
При вычислении выражения вместо каждой переменной подставляется значение, переданное в качестве соответствующего параметра функции `evaluate`.

3. При выполнении задания следует обратить внимание на:
    - Применение инкапсуляции.
    - Выделение общего кода для операций.
    - Минимизацию необходимой памяти.
4. Модификация:
    - Теперь `Add` и `Multiply` могут поддерживать любое количество аргументов больше либо равное одного.
    - Поддержите новые операции:
        - `Sin`, `Cos` — имеют ровно один аргумент и возвращают соотвественно синус и косинус.
        - `Pi` — имеет ноль аргументов и возвращает константу π.
        - `RMS` — имеет произвольное количество аргументов и возвращает квадратный корень из среднего арифметического квадратов своих аргументов.
    - Добавьте метод `infix()`, который будет выдавать полноскобочное арифметическое выражение в инфиксной записи. Примеры:
```js
console.log(
    (
        new Add(
            new Variable('x'),
            new Variable('y'),
            new Variable('z')
        )
    ).infix()
); // (x + y + z)
console.log((new Add(new Const(15))).infix()); // (15)
console.log((new Negate(new Variable('y'))).infix()); // -(y)
console.log((new Pi()).infix()); // pi
console.log((new Pi()).prefix()); // (PI)
console.log((new Sin(new Pi())).infix()); // sin(pi)
console.log((new Sin(new Pi())).prefix()); // (sin (PI))
console.log((new RMS(new Variable('x'), new Variable('y'), new Variable('z'))).infix()); // rms(x, y, z)
```

5. Пара советов.
    - У массивов в JS есть методы [`.map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map), [`.reduce`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce) и [`.join`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join), которые могут вам очень помочь в этом задании. И вообще [много других методов](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array#instance_methods), которые могут быть полезны.
    - Будьте осторожны с `.reduce`. Такой код: `.reduce((a, b) => a + b, 0)` может вернуть не совсем сумму в массиве (если сумма там равна `-0`, то такой код вернёт `0`). Поэтому тесты не пройдут. Именно для этой цели в задании сказано, что `Add` имеет хотя бы один аргумент.
