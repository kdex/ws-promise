const { BABEL_ENV } = process.env;
module.exports = {
	comments: false,
	minified: true,
	plugins: [
		"@babel/plugin-proposal-class-properties",
		"@babel/plugin-proposal-export-default-from"
	],
	presets: [
		["@babel/preset-env", {
			corejs: 3,
			modules: BABEL_ENV !== "esm" && "commonjs",
			targets: "> 5%",
			useBuiltIns: "entry"
		}]
	]
};