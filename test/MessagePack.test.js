import communicate from "./communicate";
import { encode, decode } from "msgpack-lite";
communicate(5000, {
	encode,
	decode
});