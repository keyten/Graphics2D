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
			today = new Date(),
			folder = source.replace(/\/[^\/]+$/, '');

		// date processing
		code = code.replace(/\{\{date\}\}/gi, today.getDate() + '.' + (today.getMonth()+1) + '.' + today.getFullYear());

		// config processing
		for(var key in package){
			code = code.replace(new RegExp('\{\{' + key + '\}\}', 'gi'), package[key]);
		}

		// include processing
		code = code.replace(/(\/\/\s*)?\{\{include\s+([a-z0-9_\.]+)\}\}/gi, function(a,b,c,d){
			return grunt.file.read(folder + '/' + c);
		});

		grunt.file.write(dest, code);
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