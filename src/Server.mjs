import WS from "ws";
import EventEmitterModule from "crystal-event-emitter";
import Protocol from "./Protocol";
import addDefaults from "./addDefaults";
import proxify from "./proxify";
import resolve from "./esm";
const EventEmitter = resolve(EventEmitterModule);
const WebSocketServer = resolve(WS, "Server");
export default class Server extends EventEmitter {
	clients = new Set();
	options = null;
	#wss = null;
	constructor(options = {}) {
		super({
			inferListeners: true
		});
		this.options = addDefaults(options, {
			engine: WebSocketServer
		});
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
		this.#wss = null;
	}
	open() {
		return new Promise(resolve => {
			this.#wss = new this.options.engine(this.options.engineOptions);
			this.#wss.on("listening", () => {
				resolve(this);
			});
			this.#wss.on("connection", (ws, request) => {
				const client = proxify(new Protocol(ws, this.options), Object.assign({}, this.options));
				client.request = request;
				/* Actual clients can handle `close` themselves (due to auto-reconnection). `Protocol`s can't. */
				client.close = () => new Promise(resolve => {
					ws.on("close", () => {
						resolve(this);
					});
					ws.close();
				});
				/* Take note of the client so that the server can reference it */
				this.clients.add(client);
				this.emit("connection", client);
				/* The endpoint should pass messages through the protocol */
				ws.on("message", encoded => client.read(encoded));
				ws.on("close", e => {
					this.clients.delete(client);
					client.emit("close");
					this.emit("clientClose", client, e);
				});
				/* The protocol emissions are forwarded */
				client.on("*", (event, ...args) => {
					/* Don't forward the `close` event; server-side clients will receive `clientClose` */
					if (event !== "close") {
						this.emit(...args);
					}
				});
			});
		});
	}
	close() {
		return new Promise((resolve, reject) => {
			if (!this.#wss) {
				resolve(this);
				return;
			}
			this.#wss.close(error => {
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