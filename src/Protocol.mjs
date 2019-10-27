import { ACK, SYN, SYN_ACK } from "./Instruction";
import EventEmitterModule from "crystal-event-emitter";
import Message from "./Message";
import resolve from "./esm";
const EventEmitter = resolve(EventEmitterModule);
export {
	ACK,
	SYN,
	SYN_ACK
};
export default class Protocol extends EventEmitter {
	internal = new EventEmitter();
	constructor(ws, options) {
		super();
		this.ws = ws;
		this.options = options;
	}
	read(encoded) {
		/* "Reading" means: Return the decoded message, but don't reply. This is the user's responsibility; instead, append a `reply` function so that the user can pass in arguments in response. */
		const message = Message.from(encoded, this.options);
		/* Every event should have a reference to the client responsible for it */
		message.client = this;
		message.reply = (...args) => {
			const replyMessage = message.makeReply(...args);
			return this.send(replyMessage);
		};
		const { instruction, id } = message;
		if (instruction instanceof SYN) {
			const { command, args } = instruction;
			/* Specific event */
			this.emit(command, message, ...args);
			/* General event */
			this.emit("message", command, message, ...args);
		}
		if (instruction instanceof ACK || instruction instanceof SYN_ACK) {
			/* Fire an internal event so that a previous `send` action can be completed */
			this.internal.emit(id, message);
		}
		return message;
	}
	send(message) {
		return new Promise(resolve => {
			const { id } = message;
			this.internal.once(id, reply => {
				const { instruction } = reply;
				const { args } = instruction;
				resolve([reply, ...args]);
				/* TODO: Handle rejection/listener removal based on timeout */
			});
			this.ws.send(message.encode());
		});
	}
}