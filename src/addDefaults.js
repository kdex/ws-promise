import MessagePack from "msgpack5";
const { encode, decode } = MessagePack();
const commonDefaults = {
	serialize: encode,
	parse: decode
};
export default (options, specifics) => Object.assign({}, commonDefaults, specifics, options);