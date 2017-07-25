module.exports = [
	{
		test: 'index.html',

		process: function(url, content, path){
			return '<style>.index-page-description {display: block !important}</style>' + content;
		}
	}
];