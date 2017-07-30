import { SYN, ACK, SYN_ACK } from "./Instruction";
import uuid from "uuid/v4";
/**
* Messages are Instruction containers.
* They're the essential payload that will be serialized later.
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
	serialize() {
		return this.options.serialize({
			id: this.id,
			instruction: this.instruction
		});
	}
	static from(serialized, options) {
		let preprocessed = serialized;
		if (serialized instanceof ArrayBuffer) {
			preprocessed = new Uint8Array(serialized);
		}
		const object = options.parse(preprocessed);
		const { type, command, args } = object.instruction;
		const [constructor] = [SYN, ACK, SYN_ACK].filter(c => c.name === type);
		const instruction = new constructor(command, ...args);
		return new this(instruction, options, object.id);
	}
}