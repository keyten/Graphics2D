module.exports = function(grunt){

	var core = {
			source: 'Core/core.js',
			dest: 'graphics2d.js'
		},

		more = {
			source: 'More/more.js',
			dest: 'graphics2d.more.js'
		},

		package = grunt.file.readJSON('package.json');

	grunt.initConfig({

		uglify: {
			main: {
				files: {
					'graphics2d.min.js': core.dest,
					'graphics2d.more.min.js': more.dest
				}
			}
		},

		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			files: 'Core/*.js'
		},

		watch: {
			core: {
				files: 'Core/*.js',
				tasks: 'core'
			},
			more: {
				files: 'More/*.js',
				tasks: 'more'
			}
		}

	});

	// Simple build system
	function compile(source, dest){
		var code = grunt.file.read(source),
			folder = source.replace(/\/[^\/]+$/, '');

		// date processing
		code = code.replace(/\{\{date\}\}/gi, today());

		// config processing
		for(var key in package){
			code = code.replace(new RegExp('\{\{' + key + '\}\}', 'gi'), package[key]);
		}

		// include processing
		code = code.replace(/(\/\/\s*)?\{\{include\s+([a-z0-9_\.]+)\}\}/gi, function(a,b,c,d){
			return grunt.file.read(folder + '/' + c);
		});

		// macro processing
//		var macroRegGlobal = /\/?\/?\s*\{\{macro\s([a-zA-Z]+)\((([a-zA-Z]+,?\s*)*)\):\s*/g,
//			macroReg = /\/?\/?\s*\{\{macro\s([a-zA-Z]+)\((([a-zA-Z]+,?\s*)*)\):\s*/,
/*
			macroses = (code.match(macroRegGlobal) || []).map(function(macros){
				var match = macros.match(macroReg);
				var name = match[1];
				var args = match[2].replace(/\s/g, '').split(',');

				var startMacroIndex = code.indexOf(macros);
				var macroLength;

				var body = code.slice(startMacroIndex + macros.length);
				macroLength = body.indexOf('}}');
				body = body.slice(0, macroLength);

				code = code.slice(0, startMacroIndex) + code.slice(startMacroIndex + macros.length + macroLength + 2);

				return {
					name: name, body: body, args: args
				};
			});

		macroses.forEach(function(macro){
			var times = 1;
			var index;
			var startIndex = index = code.indexOf(macro.name) + macro.name.length;
			var bracesCount = 1;
			var args = [''];
			while(true){
				index++;

				if(code[index] === '('){
					bracesCount++;
				} else if(code[index] === ')'){
					bracesCount--;
				} else if(code[index] === ','){
					args.push('');
				}

				if(code[index] !== ' ' && code[index] !== ','){
					args[args.length - 1] += code[index]
				}

				if(bracesCount === 0 || times++ > 1000){
					break;
				}
			}
			args[args.length-1] = args[args.length-1].slice(0, args[args.length-1].length-1);

			var body = macro.body;
			macro.args.forEach(function(argname, i){
			 body = body.split(argname).join(args[i])
			});
			code = code.slice(0, startIndex - macro.name.length) + body + code.slice(index + 1);
		}); */

		grunt.file.write(dest, code);
	}

	function today(){
		var today = new Date();
		var day = today.getDate();
		var month = today.getMonth()+1;
		return [
			(day < 10 ? '0' : '') + day,
			(month < 10 ? '0' : '') + month,
			today.getFullYear()
		].join('.');
	}

	grunt.registerTask('core', function(){
		compile(core.source, core.dest);
	});
	grunt.registerTask('more', function(){
		compile(more.source, more.dest);
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['core', 'more', 'uglify']);

}