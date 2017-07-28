var Handlebars = require('handlebars');
var marked = require('marked');
var isLog = true;
var scripts = require('./template/scripts');

// Keyten's handlebars additions
Handlebars.registerHelper('equals', function(a, b, c){
	if(a == b){
		return c.fn();
	}
});

Handlebars.registerHelper('nequals', function(a, b, c){
	if(a != b){
		return c.fn();
	}
});

var ignoreNames = [
	'' // files started from . (.DS_Store for ex.)
];

module.exports = function(grunt) {

	grunt.initConfig({});

	grunt.registerTask('build', function(){
		var template = grunt.file.read('template/index.html');
		var config = {};
		if(grunt.file.exists('config.json')){
			config = grunt.file.readJSON('config.json');
		}

		grunt.file.recurse('pages', function(path){
			var content = grunt.file.read(path),
				url = path.split('.'),
				extension = url.pop();

			url = url.join('/').split('/').slice(1);
			url = url.map(part => part.toLowerCase().split(' ').join('_'));

			if(ignoreNames.indexOf(url[url.length-1]) > -1){
				return;
			}

			if(url[url.length-1] === 'index'){
				url = url.join('/') + '.html';
			} else {
				url = url.join('/') + '/index.html';
			}

			scripts.forEach(function(script){
				var testResult;
				if(typeof script.test === 'function'){
					testResult = script.test(url, content, path);
				} else if(typeof script.test === 'string'){
					testResult = url === script.test;
				} else if(script.test instanceof RegExp){
					testResult = script.test.test(url);
				}

				if(testResult){
					content = script.process(url, content, path);
				}
			});

			if(extension === 'html' || extension === 'htm'){
				content = processHTML(content, template, url, path, config);
			}
			else if(extension === 'md'){
				content = processMarkdown(content, template, url, path, config);
			}
			else if(extension === 'txt'){
				content = processText(content, template, url, path, config);
			}
			else {
				grunt.log.writeln('Ignored page: ' + path + ' (unknown extension)');
				return;
			}

			if(isLog){
				grunt.log.writeln('Page processing: ' + path);
			}
			grunt.file.write(url, content);
		});
	});

	grunt.registerTask('default', ['build']);
};

function processHTML(content, template, url, page, config){
	var title;
	if(content.indexOf('<title>') != -1){
		title = tag(content, 'title');
		content = title.content;
		title = title.tagContent;
	}
	else {
		// find the first header
		var start = content.search(/h\d/) + 3, // <h\d>?
			end = content.search(/\/h\d/) - 1;
		if(start != 2){
			title = content.substring(start, end);
		}
		else {
			title = '';
		}
	}

	// handlebar configs
	var cfgPage = extend({
		title: title,
		page: page,
		url: url
	}, config);

	var cfgTemplate = extend({}, config);

	// url to config
	url.split('/').forEach(function(part, i){
		part = part.replace('.html', '');
		cfgPage['url' + i] = part;
		cfgTemplate['url' + i] = part;
	});

	content = Handlebars.compile(content, {
		noEscape: true
	})(cfgPage);

	cfgTemplate.content = content;
	template = Handlebars.compile(template, {
		noEscape: true
	})(cfgTemplate);

	return template;
}

function tag(content, tagName){
	var start = content.indexOf('<' + tagName + '>'),
		tagContent = '', end;
	if(start != -1){
		end = content.indexOf('</' + tagName + '>');
		tagContent = content.substring(start + tagName.length + 2, end);
		content = content.substring(0, start) + content.substring(end + tagName.length + 3);
	}
	return {
		tagContent : tagContent,
		content : content
	};
}

function processMarkdown(content, template, url, path, config){
	content = marked(content);
	return processHTML(content, template, url, path, config);
}

function processText(content, template, url, path, config){
	content = content.split('\n').join('<br/>'); // todo: replace \n\n to <p>...</p>
	return processHTML(content, template, url, path, config);
}

function extend(to, from){
	for(var key in from){
		to[key] = from[key];
	}
	return to;
}