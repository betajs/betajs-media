module.banner = '/*!\n<%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\nCopyright (c) <%= pkg.contributors %>\n<%= pkg.license %> Software License.\n*/\n';

module.exports = function(grunt) {

	grunt
			.initConfig({
				pkg : grunt.file.readJSON('package.json'),
				'revision-count' : {
					options : {
						property : 'revisioncount',
						ref : 'HEAD'
					}
				},
				concat : {
					options : {
						banner : module.banner
					},
					dist_raw : {
						dest : 'dist/betajs-media-raw.js',
						src : [ 'src/fragments/begin.js-fragment',
								'src/player/*.js',
								'src/fragments/end.js-fragment' ]
					},
					dist_scoped : {
						dest : 'dist/betajs-media.js',
						src : [ 'vendors/scoped.js',
								'dist/betajs-media-noscoped.js' ]
					}
				},
				preprocess : {
					options : {
						context : {
							MAJOR_VERSION : '<%= revisioncount %>',
							MINOR_VERSION : (new Date()).getTime()
						}
					},
					dist : {
						src : 'dist/betajs-media-raw.js',
						dest : 'dist/betajs-media-noscoped.js'
					}
				},
				clean : [ "dist/betajs-media-raw.js",
						"dist/betajs-media-closure.js" ],
				uglify : {
					options : {
						banner : module.banner
					},
					dist : {
						files : {
							'dist/betajs-media-noscoped.min.js' : [ 'dist/betajs-media-noscoped.js' ],
							'dist/betajs-media.min.js' : [ 'dist/betajs-media.js' ],
						}
					}
				},
				shell : {
					lint : {
						command : "jsl +recurse --process ./src/*.js",
						options : {
							stdout : true,
							stderr : true,
						},
						src : [ "src/*/*.js" ]
					},
					lintfinal : {
						command : "jsl --process ./dist/betajs-media.js",
						options : {
							stdout : true,
							stderr : true,
						},
						src : [ "src/*/*.js" ]
					}
				},
				closureCompiler : {
					options : {
						compilerFile : process.env.CLOSURE_PATH
								+ "/compiler.jar",
						compilerOpts : {
							compilation_level : 'ADVANCED_OPTIMIZATIONS',
							warning_level : 'verbose',
							externs : [ "./src/fragments/closure.js-fragment" ]
						}
					},
					dist : {
						src : [ "./vendors/beta.js",
								"./vendors/betajs-flash-noscoped.js",
								"./vendors/beta-browser-noscoped.js",
								"./dist/betajs-media-noscoped.js" ],
						dest : "./dist/betajs-media-closure.js"
					}
				},
				wget : {
					dependencies : {
						options : {
							overwrite : true
						},
						files : {
							"./vendors/scoped.js" : "https://raw.githubusercontent.com/betajs/betajs-scoped/master/dist/scoped.js",
							"./vendors/beta.js" : "https://raw.githubusercontent.com/betajs/betajs/master/dist/beta.js",
							"./vendors/beta-browser-noscoped.js" : "https://raw.githubusercontent.com/betajs/betajs-browser/master/dist/beta-browser-noscoped.js",
							"./vendors/betajs-flash-noscoped.js" : "https://raw.githubusercontent.com/betajs/betajs-flash/master/dist/betajs-flash-noscoped.js",
							"./vendors/betajs-flash.swf" : "https://raw.githubusercontent.com/betajs/betajs-flash/master/dist/betajs-flash.swf"
						}
					}
				}
			});

	grunt.loadNpmTasks('grunt-newer');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-git-revision-count');
	grunt.loadNpmTasks('grunt-preprocess');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-wget');
	grunt.loadNpmTasks('grunt-closure-tools');

	grunt.registerTask('default', [ 'revision-count', 'concat:dist_raw',
			'preprocess', 'clean', 'concat:dist_scoped', 'uglify' ]);
	grunt.registerTask('lint', ['shell:lint', 'shell:lintfinal']);	
	grunt.registerTask('check', ['lint']);
	grunt.registerTask('dependencies', [ 'wget:dependencies' ]);
	grunt.registerTask('closure', [ 'closureCompiler', 'clean' ]);

};