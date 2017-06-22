import Protocol, { SYN } from "Protocol";
import Message from "./Message";
import EventEmitter from "crystal-event-emitter";
import { inspect } from "util";
const extensions = Symbol();
export default class Client extends EventEmitter {
	ws = null;
	network = null;
	reconnecting = false;
	options = {};
	constructor(...args) {
		super({
			inferListeners: true
		});
		if (!args.length) {
			throw new Error("No arguments provided");
		}
		const [url] = args;
		this.url = url;
		if (args.length === 2) {
			/* User wants to specify options or protocols */
			const [, arg2] = args;
			if (typeof arg2 === "object") {
				/* He wants to specify options */
				this.options = arg2;
				this.protocols = null;
			}
			else {
				/* He wants to specify protocols */
				this.protocols = arg2;
			}
		}
		if (args.length === 3) {
			/* User wants to specify options and protocols */
			const [, protocols, options = {}] = args;
			this.protocols = protocols;
			this.options = options;
		}
		if (!this.options.engine) {
			if (global.WebSocket) {
				this.options.engine = global.WebSocket;
			}
			else {
				throw new Error("No WebSocket client implementation found. If your environment doesn't natively support WebSockets, please provide the client class to use with the `engine` option.");
			}
		}
		const defaultOptions = new Map([
			["autoReconnect", true],
			["reconnectionMinimum", 200],
			["reconnectionFactor", 1.15]
		]);
		for (const [option, value] of defaultOptions) {
			if (!this.options.hasOwnProperty(option)) {
				this.options[option] = value;
			}
		}
		this.proxy = new Proxy(this, {
			get: (target, property) => {
				if (property === "inspect" || inspect && property === inspect.custom) {
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
		return this.proxy;
	}
	clear(e) {
		this.emit("close", e);
		this.ws = null;
		this.network = null;
	}
	open() {
		return new Promise(async (resolve, reject) => {
			if (this.ws) {
				await this.close();
			}
			this.ws = new this.options.engine(this.url, this.protocols, this.options.engineOptions);
			this.ws.onopen = e => {
				this.emit("open", e);
				resolve(this.proxy);
			};
			this.ws.onerror = e => {
				this.emit("error", e);
				reject(e);
				// this.close();
			};
			/* Closed dirtily */
			this.ws.onclose = e => {
				this.clear(e);
				if (this.options.autoReconnect && !this.reconnecting) {
					this.reconnect();
				}
			};
			this.ws.onmessage = e => this.network.read(e.data);
			this.network = new Protocol(this.ws);
			this.network.on("*", (...args) => {
				this.emit(...args);
			});
		});
	}
	async reconnect(delay) {
		this.reconnecting = true;
		const timeout = delay || this.options.reconnectionMinimum;
		try {
			await this.open();
			this.reconnecting = false;
			this.emit("reconnect");
		}
		catch (e) {
			setTimeout(() => {
				this.reconnect(timeout * this.options.reconnectionFactor);
			}, timeout);
		}
	}
	close() {
		return new Promise((resolve, reject) => {
			if (this.ws) {
				/* Closed cleanly */
				this.ws.onclose = e => {
					this.clear(e);
					resolve(this.proxy);
				};
				this.ws.close();
			}
			else {
				reject(new Error("WebSocket hasn't been initialized"));
			}
		});
	}
	async send(message) {
		if (!this.network) {
			throw new Error(`Attempted to send instruction "${message.instruction}" without a connection being established`);
		}
		return this.network.send(message);
	}
}