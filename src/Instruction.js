/**
* An instruction is meant to contain all the information that the other endpoint needs to execute code.
* In RPC, this information consists of a command name and the instructions for that command.
*/
class Instruction {
	constructor(command, ...args) {
		this.command = command;
		this.args = args;
		this.type = this.constructor.name;
		/* Substitute Error instances */
		for (let i = 0; i < args.length; ++i) {
			const arg = args[i];
			if (arg instanceof Error) {
				args[i] = {
					error: true,
					message: arg.message,
					stack: arg.stack
				};
			}
		}
	}
}
export class SYN extends Instruction {}
export class ACK extends Instruction {}
export class SYN_ACK extends Instruction {}