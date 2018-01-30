import communicate from "./communicate";
communicate(6000, {
	encode: JSON.stringify,
	decode: JSON.parse
});