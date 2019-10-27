import communicate from "./communicate";
communicate({
	encode: JSON.stringify,
	decode: JSON.parse
});