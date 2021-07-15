import { SYN, ACK, SYN_ACK } from "./Instruction.mjs";
import { v4 } from "uuid";
/**
* Messages are Instruction containers.
* They're the essential payload that will be encoded later.
*/
export default class Message {
	constructor(instruction, options, id = v4()) {
		this.id = id;
		this.instruction = instruction;
		this.options = options;
	}
	makeReply(...args) {
		let nextInstruction;
		const { instruction, options, id } = this;
		if (instruction instanceof SYN) {
			nextInstruction = ACK;
		}
		else if (instruction instanceof ACK) {
			nextInstruction = SYN_ACK;
		}
		else {
			throw new Error("Invalid attempt to reply to a reply");
		}
		return new Message(new nextInstruction(instruction.command, ...args), options, id);
	}
	encode() {
		return this.options.encode({
			id: this.id,
			instruction: this.instruction
		});
	}
	static from(encoded, options) {
		let preprocessed = encoded;
		if (encoded instanceof ArrayBuffer) {
			preprocessed = new Uint8Array(encoded);
		}
		const object = options.decode(preprocessed);
		const { args, command, type } = object.instruction;
		const [constructor] = [SYN, ACK, SYN_ACK].filter(c => c.type === type);
		const instruction = new constructor(command, ...args);
		return new this(instruction, options, object.id);
	}
}