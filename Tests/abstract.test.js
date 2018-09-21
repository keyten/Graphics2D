/*
Tests without rendering.
For example:

var rect = Delta.rect(10, 10, 200, 200);
expect(rect.attr('x')).to.be.eql(10);

 */

// QUnit.module( "basic", { teardown: moduleTeardown } );
/* QUnit.test( "ajax", function( assert ) {
assert.expect( 4 );
	var done = jQuery.map( new Array( 3 ), function() { return assert.async(); } );
	done.pop()();
assert.equal(a, b, label)
	*/
QUnit.module("Core.Abstract.Drawable", {
	teardown: moduleTeardown
});

Qunit.test('create', function(assert){

	assert.ok(ctx.object() instanceof Delta.Drawable, "Check if ctx.object creates valid Drawable");
	assert.ok(Delta.object() instanceof Delta.Drawable, "Check if Delta.object creates valid Drawable");

	assert.equal(ctx.object({
		abcd: 5
	}).abcd, 5, "Check if ctx.object allows to add custom properties");

	assert.equal(Delta.object({
		abcd: 5
	}).abcd, 5, "Check if Delta.object allows to add custom properties");

});

Qunit.test('events', function(assert){

	var object = Delta.object();

	object.on('testEvent', function(e){
		assert.equal(e.testField, 'testValue');
		assert.async();
	});

	object.fire('testEvent', {testField: 'testValue'});

});