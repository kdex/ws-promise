import { SYN, ACK, SYN_ACK } from "./Instruction";
import uuid from "uuid/v4";
/**
* Messages are Instruction containers.
* They're the essential payload that will be encoded later.
*/
export default class Message {
	constructor(instruction, options, id = uuid()) {
		this.instruction = instruction;
		this.options = options;
		this.id = id;
	}
	makeReply(...args) {
		let newInstruction;
		const { instruction, options, id } = this;
		if (instruction instanceof SYN) {
			newInstruction = ACK;
		}
		else if (instruction instanceof ACK) {
			newInstruction = SYN_ACK;
		}
		else {
			throw new Error("Invalid attempt to reply to a reply");
		}
		return new Message(new newInstruction(instruction.command, ...args), options, id);
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
		const { type, command, args } = object.instruction;
		const [constructor] = [SYN, ACK, SYN_ACK].filter(c => c.name === type);
		const instruction = new constructor(command, ...args);
		return new this(instruction, options, object.id);
	}
}