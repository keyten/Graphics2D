QUnit.module('Core.Curve');
QUnit.test('create', function(assert){
	var curve;

	curve = Delta.curve('moveTo', [10, 20]);
	assert.ok(
		curve instanceof Delta.Curve,
		"Check if Delta.curve creates valid Delta.Curve"
	);
	assert.equal(
		curve.method,
		'moveTo',
		"Check if Delta.curve sets method right"
	);
	assert.deepEqual(
		curve.attr('args'),
		[10, 20],
		"Check if Delta.curve sets args right"
	);
});

QUnit.test('methods', function(assert){
	var curve, clone;

	curve = Delta.curve('moveTo', [10, 20]);
	clone = curve.clone();
	assert.ok(
		clone instanceof Delta.Curve,
		"Check if clone creates valid Delta.Curve"
	);
	assert.equal(
		clone.method,
		curve.method,
		"Check if clone has the same method"
	);
	assert.deepEqual(
		clone.attr('args'),
		curve.attr('args'),
		"Check if clone has the same args"
	);
});
