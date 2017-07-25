module.exports = [
	{
		test: 'index.html',

		process: function(url, content, path){
			return '<style>.index-page-description {display: block !important}</style>' + content;
		}
	},

	// если русская версия, то шрифты Menlo, Consolas, Monospace (https://toster.ru/q/57698)
	// если английская, то тут подключаем тот шрифт с гуглдоков, который сейчас подключен, и добавляем в стили
];