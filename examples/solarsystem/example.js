var width = 840;
var height = 840;
var center = [width/2, height/2];

var app = Graphics2D.app('#example_solarsystem', width, height); // размеры canvas-а
var background = app.layer(0);
var orbits = app.layer(1);
var planets = app.layer(2);
var planetarray = [];
var planetNames = [ "Selene", "Mimas", "Ares", "Enceladus", "Tethys", "Dione", "Zeus", "Rhea", "Titan", "Janus", "Hyperion", "Iapetus" ];

// drawing background
background.image('images/sky.png', 0, 0);
background.image('images/sun.png', center[0]-50, center[1]-50); // координаты солнца

// planet class
function Planet(options){
	// свойства
	this.radius = options.radius;
	this.rotatePerMs = 360 / 100 / options.time;
	this.time = options.time;
	this.name = options.name;

	// создание планеты
	this.createOrbit(options);
	this.createPlanet(options);

	planetarray.push(this);
}

Planet.prototype.update = function(){
	this.sprite.rotate(this.rotatePerMs, center);
	this.stroke.rotate(this.rotatePerMs, center);
}

Planet.prototype.createPlanet = function(options){
	var sprite = planets.sprite('images/planets.png', center[0] - 13 + options.radius, center[1] - 13);
	sprite.autoslice(26, 26); // размеры каждого фрейма
	sprite.frame(options.image);
	sprite.mouseover(this.overPlanet.bind(this)).mouseout(this.out.bind(this));
	sprite.click(this.click.bind(this));
	sprite.cursor('pointer');

	this.sprite = sprite;

	sprite.rotate(this.startAngle, center);
}

Planet.prototype.createOrbit = function(options){
	var orbit = orbits.circle({
		cx: center[0],
		cy: center[1],
		radius: this.radius,

		stroke: '1px rgba(0,192,255,0.5)'
	});

	var stroke = planets.circle({
		cx: center[0] + this.radius, // помещаем в координаты планеты
		cy: center[1],
		radius: 15,

		fill: 'black',
		stroke: '3px rgba(0,192,255,1)',
		visible: false
	});

	this.startAngle = rand(360);
	stroke.rotate(this.startAngle, center);
	orbit.mouseover(this.over.bind(this)).mouseout(this.out.bind(this));
	orbit.isPointIn = function(x, y){
		x -= center[0];
		y -= center[1];
		return (x*x + y*y) <= Math.pow(this._radius + 20, 2) && ((x*x + y*y) > Math.pow(this._radius - 20, 2));
	}

	this.orbit = orbit;
	this.stroke = stroke;
}


Planet.prototype.over = function(e){
	this.stroke.show();
	this.orbit.stroke('3px rgba(0,192,255,1)');
}
Planet.prototype.overPlanet = function(e){
	this.stroke.show();
	this.orbit.stroke('3px rgba(0,192,255,1)');
	if(this.rect){
		this.rect.remove();
		this.text.remove();
	}
	this.rect = planets.rect(e.contextX, e.contextY, 70, 25, 'rgb(0,56,100)', '1px rgb(0,30,50)');
	this.text = planets.text({
		text: this.name,
		font: 'Arial 11pt',
		x: e.contextX + 35,
		y: e.contextY + 12,

		align: 'center',
		baseline: 'middle',

		fill: "rgba(0,192,255,1)"
	});
}
Planet.prototype.out = function(){
	this.stroke.hide();
	this.orbit.stroke('1px rgba(0,192,255,0.5)');
	if(this.text){
		this.text.remove();
		this.rect.remove();
	}
}
Planet.prototype.click = function(){
	if(this.rotatePerMs){
		this.rotatePerMs = 0;
	}
	else {
		this.rotatePerMs = 360 / 100 / this.time;
	}
}

for(var i = 0; i < 12; i++){
	new Planet({
		image: i,
		radius: 90 + i * 26,
		time: 40 + i * 20,
		name: planetNames[i]
	});
}

setInterval(function(){
	for(var i = 0; i < 12; i++){
		planetarray[i].update();
	}
}, 1);

function rand(num){
	return Math.floor(Math.random() * num);
}