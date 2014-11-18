
// Selection highlighting
/*
var colors = [
	'a0f', 'af0', 'fa0', 'f0a', '0af', '0fa'
];
function changeSelection(){
	var color = '#' + colors[Math.floor(Math.random() * 6)];
	document.head.innerHTML += ('<style>::selection {color:' + color + '; text-shadow:0 0 1px ' + color + ', 0 0 1px ' + color + '}</style>');
	document.head.innerHTML += ('<style>::-moz-selection {color:' + color + '; text-shadow:0 0 1px ' + color + ', 0 0 1px ' + color + '}</style>');
	document.head.innerHTML += ('<style>::-webkit-selection {color:' + color + '; text-shadow:0 0 1px ' + color + ', 0 0 1px ' + color + '}</style>');
}
window.onload = function(){
	document.body.onmouseup = changeSelection;
	var h3s = document.getElementsByTagName('h3');
	for(var i = 0; i < h3s.length; i++)
		h3s[i].onclick = function(){ location.href = '#' + this.id };
}
 */