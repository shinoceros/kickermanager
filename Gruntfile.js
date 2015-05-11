module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		DIRS: {
			SRC:  'src',
			DEV:  'dev',
			DIST: 'dist',
			TEMP: '.tmp'
		},

		TARGET: {
			BASENAME: '<%= pkg.name %>-<%= pkg.version %>',
			JS: {
				CONCAT:   '<%= TARGET.BASENAME %>.concat.js',
				MINIFIED: '<%= TARGET.BASENAME %>.min.js'
			},
			CSS: {
				CONCAT:   '<%= TARGET.BASENAME %>.concat.css',
				MINIFIED: '<%= TARGET.BASENAME %>.min.css'
			}
		},

		preprocess: {
			dev: {
				src: ['<%= DIRS.SRC %>/index.tpl'],
				dest: '<%= DIRS.DEV %>/index.html',
				options: {
					context: {
						production: false,
					}
				}
			},
			dist: {
				src: ['<%= DIRS.SRC %>/index.tpl'],
				dest: '<%= DIRS.TEMP %>/index.html',
				options: {
					context: {
						production: true,
						TARGET: {
							CSS: '<%= TARGET.CSS.MINIFIED %>',
							JS:  '<%= TARGET.JS.MINIFIED %>'
						}
					}
				}
			}
		},

		clean: {
			dev: {
				src: ['<%= DIRS.DEV %>/**']
			},
			dist: {
				src: ['<%= DIRS.DIST %>/**']
			},
			temp: {
				src: ['<%= DIRS.TEMP %>/**']
			}
		},

		concat: {
			js: {
				options: {
					separator: ';'
				},
				src: [
					'<%= DIRS.SRC %>/js/angular/1.3.15/angular.js',
					'<%= DIRS.SRC %>/js/angular/1.3.15/angular-resource.js',
					'<%= DIRS.SRC %>/js/angular/1.3.15/angular-animate.js',
					'<%= DIRS.SRC %>/js/angular-ui-router/angular-ui-router-0.2.14.js',
					'<%= DIRS.SRC %>/js/ui-bootstrap/ui-bootstrap-tpls-0.12.1.js',
					'<%= DIRS.SRC %>/js/highcharts/standalone-framework-4.1.1.js',
					'<%= DIRS.SRC %>/js/highcharts/highcharts-4.1.1.js',
					'<%= DIRS.SRC %>/js/highcharts/highcharts-ng-0.0.7.js',
					'<%= DIRS.SRC %>/js/kickermanager/app.js',
					'<%= DIRS.SRC %>/js/kickermanager/controllers.js',
					'<%= DIRS.SRC %>/js/kickermanager/services.js',
					'<%= DIRS.SRC %>/js/kickermanager/filters.js',
					'<%= DIRS.SRC %>/js/kickermanager/directives.js',
					'<%= DIRS.SRC %>/js/kickermanager/routingConfig.js',
					'<%= DIRS.SRC %>/js/other/loading-bar-0.7.0.js',
					'<%= DIRS.SRC %>/js/other/fastclick.js',
					'<%= DIRS.SRC %>/js/other/ngStorage.js'
				],
				dest: '<%= DIRS.TEMP %>/js/<%= TARGET.JS.CONCAT %>'
			},
			css: {
				options: {
					separator: '\n'
				},
				src: [
					'<%= DIRS.SRC %>/css/bootstrap.min.css',
					'<%= DIRS.SRC %>/css/font-awesome.min.css',
					'<%= DIRS.SRC %>/css/kickermanager.css',
					'<%= DIRS.SRC %>/css/loading-bar-0.7.0.css'
				],
				dest: '<%= DIRS.TEMP %>/css/<%= TARGET.CSS.CONCAT %>'
			}
		},

		copy: {
			dist: {
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= DIRS.SRC %>',
					src: ['api/**', '!api/dbconfig.php', 'fonts/**', 'partials/**', 'setup.php'],
					dest: '<%= DIRS.TEMP %>'
				}]
			},
			dev: {
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= DIRS.SRC %>',
					src: ['**', '!index.tpl'],
					dest: '<%= DIRS.DEV %>'
				}]
			}
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
				mangle: false
			},
			dist: {
				src: '<%= DIRS.TEMP %>/js/<%= TARGET.JS.CONCAT %>',
				dest: '<%= DIRS.TEMP %>/js/<%= TARGET.JS.MINIFIED %>'
			}
		},

		cssmin: {
			options: {
			},
			dist: {
				src: '<%= DIRS.TEMP %>/css/<%= TARGET.CSS.CONCAT %>',
				dest: '<%= DIRS.TEMP %>/css/<%= TARGET.CSS.MINIFIED %>'
			}
		},

		compress: {
			dist: {
				options: {
					mode: 'zip',
					archive: '<%= DIRS.DIST %>/<%= TARGET.BASENAME %>.zip',
					level: 9
				},
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= DIRS.TEMP %>',
					src: ['api/**', 'css/*.min.css', 'fonts/**', 'partials/**', 'js/*.min.js', '*'],
					dest: '.'
				}]
			}
		}
	});

	grunt.registerTask('dist', [
		'clean:temp',
		'preprocess:dist',
		'concat:js',
		'copy:dist',
		'uglify:dist',
		'concat:css',
		'cssmin',
		'compress:dist'
	]);

	grunt.registerTask('dev', [
		'clean:dev',
		'preprocess:dev',
		'copy:dev',
	]);

};

