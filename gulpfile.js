const { src, dest, parallel, watch } = require('gulp');
const browserSyncServer = require('browser-sync').create();
const ts = require('gulp-typescript');
const uglify = require('gulp-uglify');
const sass = require('gulp-sass')(require('sass'));
const mimifyCSS = require('gulp-clean-css');
const tsProject = ts.createProject("tsconfig.json");
const autoPrefixer = require('gulp-autoprefixer');
const rename = require('gulp-rename');

function browsersync() {
    browserSyncServer.init({
        server: { baseDir: 'app/' },
        online: true,
    })
}

exports.browsersync = browsersync;

function compileSCSS() {
    return src('app/scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoPrefixer({ overrideBrowserslist: ['last 10 version'] }))
    .pipe(mimifyCSS())
    .pipe(rename({suffix: '.min'}))
    .pipe(dest('app/css'))
    .pipe(browserSyncServer.stream());
}

exports.compileSCSS = compileSCSS;

function compileTS() {
    return src('app/scriptsTS/*.ts')
    .pipe(tsProject())
    .pipe(uglify())
    .pipe(dest('app/scriptsJS'))
    .pipe(browserSyncServer.stream());
}

exports.compileTS = compileTS;

function startwatch() {
    watch('app/scriptsTS/*.ts', compileTS);
	watch('app/scss/*.scss', compileSCSS);
	watch('app/*.html').on('change', browserSyncServer.reload);
}

exports.default = parallel(compileSCSS, compileTS, browsersync, startwatch);
