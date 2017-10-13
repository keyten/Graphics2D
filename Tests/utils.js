test('Delta.distance', function(done){

	// params by default
	expect(Delta.unit).to.be('px');
	expect(Delta.snapToPixels).to.be(1);

	// different units
	expect(Delta.distance(25)).to.be(25);
	expect(Delta.distance('25px')).to.be(25);
	expect(Delta.distance('25pt')).to.be(25);
	expect(Delta.distance('25ch')).to.be(25);
	expect(Delta.distance('25cm')).to.be(25);
	expect(Delta.distance('25em')).to.be(25);
	expect(Delta.distance('25ex')).to.be(25);
	expect(Delta.distance('25in')).to.be(25);
	expect(Delta.distance('25mm')).to.be(25);
	expect(Delta.distance('25pc')).to.be(25);
	expect(Delta.distance('25rem')).to.be(25);
	expect(Delta.distance('25v')).to.be(25);
	expect(Delta.distance('25vmax')).to.be(25);
	expect(Delta.distance('25vmin')).to.be(25);
	// todo: cph (canvas percent height), cpw, vw, vh
	expect(Delta.distance('25wvh')).to.be(25);

	// unit param
	Delta.unit = 'pt';
	expect(Delta.distance(25)).to.be(Delta.distance('25pt'));

	// snapping
	expect(Delta.distance(0.000001)).to.be(0);
	Delta.snapToPixels = 0;
	expect(Delta.distance(0.000001)).to.be(0.000001);
	Delta.snapToPixels = 0.5;
	// ...
	Delta.snapToPixels = 20;
	// ...

});

test('Delta.distance', function(done){
	;
});