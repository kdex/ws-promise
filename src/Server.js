import { Server as WebSocketServer } from "ws";
import Protocol, { SYN } from "./Protocol";
import Message from "./Message";
import EventEmitter from "crystal-event-emitter";
const network = Symbol("network");
export default class Server extends EventEmitter {
	clients = new Set();
	constructor(options = {}) {
		super({
			inferListeners: true
		});
		this.options = options;
		if (!this.options.engine) {
			this.options.engine = WebSocketServer;
		}
	}
	async broadcast(message) {
		const replies = new Map();
		for (const client of this.clients) {
			const clientMessage = await client.send(message);
			replies.set(client, clientMessage);
		}
		return replies;
	}
	clear() {
		this.clients.clear();
		this.wss = null;
	}
	open() {
		return new Promise(resolve => {
			this.wss = new this.options.engine(this.options.engineOptions, () => resolve(this));
			this.wss.on("connection", ws => {
				const client = new Proxy(new Protocol(ws), {
					get: (target, property) => {
						if (property === "inspect") {
							return () => {
								/* The proxy should at least be printable */
								return target;
							};
						}
						if (property === "then") {
							return this.proxy;
						}
						const lookUp = target[property];
						if (!lookUp) {
							return async (...args) => {
								const remoteLookup = new Message(new SYN(property, ...args));
								const [message, result] = await target.send(remoteLookup);
								message.reply();
								return result;
							};
						}
						else {
							if (lookUp instanceof Function) {
								return target::lookUp;
							}
							else {
								return lookUp;
							}
						}
					}
				});
				ws[network] = client; 
				/* Take note of the client so that the server can reference it */
				this.clients.add(client);
				/* The endpoint should pass messages through the protocol */
				ws.on("message", string => client.read(string));
				ws.on("close", e => {
					this.clients.delete(client);
					this.emit("close", e);
				});
				/* The protocol emissions are forwarded */
				client.on("*", (...args) => {
					this.emit(...args);
				});
			});
		});
	}
	close() {
		return new Promise((resolve, reject) => {
			this.wss.close(error => {
				if (error) {
					reject(error);
				}
				else {
					resolve(this);
					this.clear();
				}
			});
		});
	}
}