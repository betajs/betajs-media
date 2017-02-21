module.exports = function(grunt) {

	var pkg = grunt.file.readJSON('package.json');
	var gruntHelper = require('betajs-compile');
	var dist = 'betajs-media';

	gruntHelper.init(pkg, grunt)
	
    /* Compilation */    
	.scopedclosurerevisionTask(null, "src/**/*.js", "dist/" + dist + "-noscoped.js", {
		"module": "global:BetaJS.Media",
		"base": "global:BetaJS",
		"browser": "global:BetaJS.Browser",
		"flash": "global:BetaJS.Flash"
    }, {
    	"base:version": pkg.devDependencies.betajs,
    	"browser:version": pkg.devDependencies["betajs-browser"],
    	"flash:version": pkg.devDependencies["betajs-flash"]
    })	
    .concatTask('concat-scoped', [require.resolve("betajs-scoped"), 'dist/' + dist + '-noscoped.js'], 'dist/' + dist + '.js')
    .uglifyTask('uglify-noscoped', 'dist/' + dist + '-noscoped.js', 'dist/' + dist + '-noscoped.min.js')
    .uglifyTask('uglify-scoped', 'dist/' + dist + '.js', 'dist/' + dist + '.min.js')
    .packageTask()

    /* Testing */
    .browserqunitTask(null, "tests/tests.html", true)
    .closureTask(null, [require.resolve("betajs-scoped"), require.resolve("betajs"), require.resolve("betajs-browser"), require.resolve("betajs-flash"), "./dist/betajs-media-noscoped.js"], null, { })
    .browserstackTask(null, 'tests/browserstack.html', {desktop: true, mobile: true})
    .lintTask(null, ['./src/**/*.js', './dist/' + dist + '-noscoped.js', './dist/' + dist + '.js', './Gruntfile.js', './tests/**/*.js'])
    
    /* External Configurations */
    .codeclimateTask()
    
    /* Markdown Files */
	.readmeTask()
    .licenseTask()
    
    /* Documentation */
    .docsTask();

	grunt.initConfig(gruntHelper.config);	

	grunt.registerTask('default', ['package', 'readme', 'license', 'codeclimate', 'scopedclosurerevision', 'concat-scoped', 'uglify-noscoped', 'uglify-scoped']);
	grunt.registerTask('check', ['lint', 'browserqunit']);

};
