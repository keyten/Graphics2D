module.exports = function(grunt){

	var build = {
			from: 'Core/graphics2d.js',
			dest: 'graphics2d.js'
		},
		package = grunt.file.readJSON('package.json');

	grunt.initConfig({

		uglify: {
			main: {
				files: {
					'graphics2d.min.js': build.dest
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
			build: {
				files: 'Core/*.js',
				tasks: 'build'
			}
		}

	});

	// Simple build system
	grunt.registerTask('build', function(){
		var from = grunt.file.read(build.from),
			today = new Date,
			folder = build.from.replace(/\/[^\/]+$/, '');

		// date processing
		from = from.replace(/\{\{date\}\}/gi, today.getDate() + '.' + (today.getMonth()+1) + '.' + today.getFullYear());

		// config processing
		for(var key in package){
			from = from.replace(new RegExp('\{\{' + key + '\}\}', 'gi'), package[key]);
		}

		// include processing
		from = from.replace(/(\/\/\s*)?\{\{include\s+([a-z0-9\.]+)\}\}/gi, function(a,b,c,d){
			return grunt.file.read(folder + '/' + c);
		});

		grunt.file.write(build.dest, from);
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['build', 'uglify']);

}