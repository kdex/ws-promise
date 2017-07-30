import { encode, decode } from "msgpack-lite";
const commonDefaults = {
	serialize: encode,
	parse: decode
};
export default (options, specifics) => Object.assign({}, commonDefaults, specifics, options);