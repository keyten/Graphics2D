var ctx = Graphics2D.id('example_textblock');
ctx.canvas.focus();
var block = ctx.textblock("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ", "Arial 11pt", 10, 0, 740, 'black');
block.cursor('text');
var cursor = ctx.rect(200, 200, 1, block.size(), 'black');

alignCursor();

ctx.on('keypress', function(e){
	e.stopPropagation();
	e.preventDefault();
	var text = block.text();
	if(e.which == 8){
		block.text( text.substring(0, text.length-1) );
	}
	else if(e.which == 13){
		block.text( text + '\n' );
	}
	else {
		block.text( text + String.fromCharCode(e.which) );
	}
	alignCursor();
	return false;
});

function cursorFadeOut(){
	cursor.animate('opacity', 0, {
		duration : 700,
		after : cursorFadeIn
	});
}
function cursorFadeIn(){
	cursor.animate('opacity', 1, {
		duration : 700,
		after : cursorFadeOut
	});
}

cursorFadeOut();

function alignCursor(){
	var line = block._lines[block._lines.length - 1];
	var tmptext = ctx.text(line.text, 'Arial 11pt', -100, -100);
	cursor.x(10 + tmptext.width());
	cursor.y(line.y);
	tmptext.remove();
}