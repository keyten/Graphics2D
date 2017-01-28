/*
Про движ физики в дельте.
Надо константу минимальной силы - если прикладывать меньше силу, то не прикладывается.

Пригодится при ctx.physics.explosion(x, y, strength, [radius]) - прикладывается ко всем вблизи x, y, пока не превысит (принизит) минимум.


var ground = ctx.rect(...).phys({ ignoreGravity: true });
var rect = ctx.rect(...).phys({
	elasticity: 0.4 // отскок
}); // упадёт на ground

Поверхности соприкасаются - включаем 3 закон Ньютона. И ограничения по эластичности его и по разрушаемости.

rect.phys.on('pain', ...) // stress, force, etc?

 */


(function(window, $, undefined){

	$.extend($.Shape.prototype, {

	});

})(typeof window === 'undefined' ? this : window, Graphics2D);