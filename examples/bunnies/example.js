	var $ = Graphics2D;
	var ctx  = Graphics2D.id('ctx');
	var i, one, bunny, countdiv,
		bunnys = [],
		gravity = 0.75,
		maxX = 700,
		minX = 0,
		maxY = 350,
		minY = 0,
		isAdding = false,
		count = 0,
		amount = 10,
		fps = 0;

	countdiv = document.getElementById('count');

	bunny = new Image;
	bunny.src = 'bunny.png';

	ctx.mousedown(function(){
		isAdding = true;
	}).mouseup(function(){
		isAdding = false;
	});

	function update(){
		if( isAdding ){

			for( i = 0; i < amount; i++ ){
				one = ctx.image(bunny, 0, 0);
		
				one.speedX = rand(0, 10);
				one.speedY = rand(-5, 5);
				bunnys.push(one);
			}

			count += amount;
			countdiv.textContent = count + ' bunnies';

		}

		for( i = 0; i < bunnys.length; i++ ){
			one = bunnys[i];
			one.x( one.x() + one.speedX | 0 );
			one.y( one.y() + one.speedY | 0 );
			one.speedY += gravity;

			if( one.x() > maxX - bunny.width ){
				one.speedX *= -1;
				one.x( maxX - bunny.width );
			}
			else if( one.x() < minX ){
				one.speedX *= -1;
				one.x( minX );
			}

			if( one.y() > maxY ){
				one.speedY *= -0.85;
				if( Math.random() > 0.5 )
					one.speedY -= rand(0, 6);
			}
			else if( one.y() < minY ){
				one.speedY = 0;
				one.y(minY);
			}
		}

		fps++;

		requestAnimationFrame(update);
	}

	requestAnimationFrame(update);

	setInterval(function(){
		if(isAdding || count === 0) return (fps = 0);

		countdiv.textContent = count + ' bunnies; ' + fps + ' FPS.';
		fps = 0;
	}, 1000);

	function rand(min, max){
		return min + Math.random() * (max - min);
	}