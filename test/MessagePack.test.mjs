import communicate from "./communicate";
import MessagePack from "msgpack-lite";
const { encode, decode } = MessagePack;
communicate({
	encode,
	decode
});