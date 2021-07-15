import Message from "./Message.mjs";
import RemoteError from "./RemoteError.mjs";
import { SYN } from "./Protocol.mjs";
import util from "util";
export default (around, {
	encode,
	decode,
	bind = false
} = {}) => new Proxy(around, {
	get: (target, property, receiver) => {
		if (property === "inspect" || property === util.inspect.custom) {
			return () => {
				/* The proxy should at least be printable */
				return target;
			};
		}
		if (property === "then") {
			return receiver;
		}
		const lookUp = target[property];
		if (!lookUp) {
			return async (...args) => {
				const remoteLookUp = new Message(new SYN(property, ...args), {
					encode,
					decode
				});
				const [message, result] = await target.send(remoteLookUp);
				message.reply();
				if (result && result.error && result.message && result.stack) {
					throw new RemoteError(result.message, result.stack);
				}
				else {
					return result;
				}
			};
		}
		else {
			if (bind && lookUp instanceof Function) {
				return lookUp.bind(target);
			}
			else {
				return lookUp;
			}
		}
	}
});