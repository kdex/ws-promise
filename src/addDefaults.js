import { encode, decode } from "msgpack-lite";
const commonDefaults = {
	encode,
	decode
};
export default (options, specifics) => Object.assign({}, commonDefaults, specifics, options);