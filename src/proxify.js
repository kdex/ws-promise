import Message from "./Message";
import RemoteError from "./RemoteError";
import { SYN } from "./Protocol";
import { inspect } from "util";
export default (around, {
	serialize,
	parse,
	bind = false
} = {}) => {
	return new Proxy(around, {
		get: (target, property, receiver) => {
			if (property === "inspect" || property === inspect.custom) {
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
						serialize,
						parse
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
					return target::lookUp;
				}
				else {
					return lookUp;
				}
			}
		}
	});
}