import gulp from "gulp";
import ava from "gulp-ava";
import esLint from "gulp-eslint";
import babel from "gulp-babel";
export function test() {
	return gulp.src("test/**/*.js")
		.pipe(ava({
			verbose: true
		}));
}
export function js() {
	return gulp.src("src/**/*.js")
		.pipe(babel())
		.pipe(gulp.dest("."));
}
export function lint() {
	return gulp.src(["**/*.js", "!node_modules/**", "!dist/**"])
		.pipe(esLint())
		.pipe(esLint.format());
}
export default gulp.parallel(js);