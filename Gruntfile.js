module.exports = function(grunt) {

	var pkg = grunt.file.readJSON('package.json');
	var gruntHelper = require('betajs-compile/grunt.js');
	var dist = 'betajs-media';

	gruntHelper.init(pkg, grunt)
	
    /* Compilation */    
	.scopedclosurerevisionTask(null, "src/**/*.js", "dist/" + dist + "-noscoped.js", {
		"module": "global:BetaJS.Media",
		"base": "global:BetaJS",
		"browser": "global:BetaJS.Browser",
		"flash": "global:BetaJS.Flash",
		"jquery": "global:jQuery"
    }, {
    	"base:version": 502,
    	"browser:version": 78,
    	"flash:version": 33
    })	
    .concatTask('concat-scoped', ['vendors/scoped.js', 'dist/' + dist + '-noscoped.js'], 'dist/' + dist + '.js')
    .uglifyTask('uglify-noscoped', 'dist/' + dist + '-noscoped.js', 'dist/' + dist + '-noscoped.min.js')
    .uglifyTask('uglify-scoped', 'dist/' + dist + '.js', 'dist/' + dist + '.min.js')
    .packageTask()

    /* Testing */
    .browserqunitTask(null, "tests/tests.html", true)
    .closureTask(null, ["./vendors/scoped.js", "./vendors/beta-noscoped.js",  "./vendors/betajs-browser-noscoped.js", "./vendors/betajs-flash-noscoped.js", "./dist/betajs-media-noscoped.js"], null, { jquery: true })
    .browserstackTask(null, 'tests/browserstack.html', {desktop: true, mobile: true})
    .lintTask(null, ['./src/**/*.js', './dist/' + dist + '-noscoped.js', './dist/' + dist + '.js', './Gruntfile.js', './tests/**/*.js'])
    
    /* External Configurations */
    .codeclimateTask()
    
    /* Dependencies */
    .dependenciesTask(null, { github: [
        'betajs/betajs-scoped/dist/scoped.js',
        'betajs/betajs/dist/beta-noscoped.js',
        'betajs/betajs-browser/dist/betajs-browser-noscoped.js',
        'betajs/betajs-flash/dist/betajs-flash-noscoped.js',
        'betajs/betajs-flash/dist/betajs-flash.swf',
        'betajs/betajs-shims/dist/betajs-shims.js'
     ] })

    /* Markdown Files */
	.readmeTask()
    .licenseTask()
    
    /* Documentation */
    .docsTask();

	grunt.initConfig(gruntHelper.config);	

	grunt.registerTask('default', ['package', 'readme', 'license', 'codeclimate', 'scopedclosurerevision', 'concat-scoped', 'uglify-noscoped', 'uglify-scoped']);
	grunt.registerTask('check', ['lint', 'browserqunit']);

};
