import MessagePack from "msgpack-lite";
const { encode, decode } = MessagePack;
const commonDefaults = {
	encode,
	decode
};
export default (options, specifics) => Object.assign({}, commonDefaults, specifics, options);