### Инициализация

```js
var cr = Delta.curve('curveName', [10, 10]); // 3rd arg - path
```

Методы:
 - `attr`
 - `bounds`
 - `startAt`
 - `endAt`
 - `clone`

CurvesMath
 - `pointAt` - для всех canvas curves.
 - `tangentAt`, `normalAt`
 - `length`
 - `nearest`
 - `approx` - деление кривой на линии и reduce по ним.
 - `intersection`
 - `bounds`
 - атрибут `drawFrom` / `drawUntil` (works on splitAt or pointAt)

Line
 - `splitAt`
 — `intersect` - true / false
 - `intersection` - array or 'same' if det == 0
 - `longate` - продолжает кривую за t < 0 или t > 1 (а затем превращает в валидную, где t in [0, 1])

QuadBezier:
 - `splitAt`
 - `bounds`; `bounds('tight')`
 - `length`
 - `intersection` - (with lines & quad & cubic & convertible to cubic)
 - `toCubicBezier`
 - `longate` - продолжает кривую за t < 0 или t > 1 (а затем превращает в валидную, где t in [0, 1])
 - `manipulate(t, x, y)` - меняет кривую, чтобы она проходила через (x, y) в t
 - `fit()`?
 - `offset(weight)`, `offset(weightstart, weightend)`

CubicBezier:
 - `splitAt`
 - `bounds`; `bounds('tight')`
 - `length`
 - `intersection`
 - `toCubicBezier`
 - `longate` - продолжает кривую за t < 0 или t > 1 (а затем превращает в валидную, где t in [0, 1])
 - `manipulate(t, x, y)` - меняет кривую, чтобы она проходила через (x, y) в t
 - `fit()`?
 - `offset(weight)`, `offset(weightstart, weightend)`

(QuadBezier, CubicBezier, CatmullRom).fromThreePoints(...)

Добавить параметр tension?

GeneralBezier (bezier of any power)

CatmullRom

BSpline

Lagrange

Animations:
curve.animate('morph', ...); // is proxed to path.animate
curve.animate('x', ...)
// также, может, анимировать параметры gradientcurve, ribbon и rogue curve?

Параметры:
 - `arguments`
 - `x`, `y`
 - `hx`, `hy`
 - `h1x`, `h1y`, `h2x`, `h2y`
 - `radius`, `start`, `end`, `clockwise`
 - `x1`, `y1`, `x2`, `y2`, `radius`, `clockwise`

// мб другое название
RogueCurve:
 - `stroke`
 - `visible`

GradientCurve / Ribbon:
 - `width`: [start, end] or func
 - `widthEase`: func(t) -> [0, 1]
 - `color`: CurveGradient
 - `colorEase`

Ribbon:
 - `ribbon` - true / false

// -------
PathUtils:
 pointAt, tangentAt, length, nearest

CurvesXOR -> PathXOR

Path :: toCubicBezier()
Path :: toLines()

Path :: simplify();
Path :: smooth(); // и т.п.