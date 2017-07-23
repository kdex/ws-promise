import { Server as WebSocketServer } from "ws";
import Protocol, { SYN } from "./Protocol";
import Message from "./Message";
import EventEmitter from "crystal-event-emitter";
import { inspect } from "util";
import proxify from "./proxify";
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
				const client = proxify(new Protocol(ws));
				/* Take note of the client so that the server can reference it */
				this.clients.add(client);
				this.emit("connection", client);
				/* The endpoint should pass messages through the protocol */
				ws.on("message", string => client.read(string));
				ws.on("close", e => {
					this.clients.delete(client);
					this.emit("close", client, e);
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