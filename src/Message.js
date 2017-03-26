import { SYN, ACK, SYN_ACK } from "./Instruction";
import uuid from "uuid/v4";
/**
* Messages are Instruction containers.
* They're the essential payload that will be serialized later.
*/
export default class Message {
	constructor(...args) {
		let id, instruction;
		if (args.length === 1) {
			id = uuid();
			instruction = args[0];
		}
		else if (args.length === 2) {
			id = args[0];
			instruction= args[1];
		}
		this.id = id;
		this.instruction = instruction;
	}
	makeReply(...args) {
		let newInstruction;
		const { id, instruction } = this;
		if (instruction instanceof SYN) {
			newInstruction = ACK;
		}
		else if (instruction instanceof ACK) {
			newInstruction = SYN_ACK;
		}
		else {
			throw new Error("Invalid attempt to reply to a reply");
		}
		return new Message(id, new newInstruction(instruction.command, ...args));
	}
	toString() {
		return JSON.stringify(this);
	}
	static from(string) {
		const object = JSON.parse(string);
		const { type, command, args } = object.instruction;
		const [constructor] = [SYN, ACK, SYN_ACK].filter(c => c.name === type);
		const instruction = new constructor(command, ...args);
		return new this(object.id, instruction);
	}
}