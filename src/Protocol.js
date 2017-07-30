import Message from "./Message";
import { SYN, ACK, SYN_ACK } from "./Instruction";
import EventEmitter from "crystal-event-emitter";
export {
	SYN,
	ACK,
	SYN_ACK
}
export default class Protocol extends EventEmitter {
	internal = new EventEmitter();
	constructor(ws) {
		super();
		this.ws = ws;
	}
	read(serialized) {
		/* "Reading" means: Return the parsed message, but don't reply. This is the user's responsibility; instead, append a `reply` function so that the user can pass in arguments in response. */
		const message = Message.from(serialized);
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
		return new Promise((resolve, reject) => {
			const { id } = message;
			this.internal.once(id, reply => {
				const { instruction } = reply;
				const { command, args } = instruction;
				resolve([reply, ...args]);
				/* TODO: Handle rejection/listener removal based on timeout */
			});
			this.ws.send(String(message));
		});
	}
}