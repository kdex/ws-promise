import Client from "../src/Client";
import Server from "../src/Server";
import wsClient from "ws";
class MathServer extends Server {
	constructor() {
		super({
			engineOptions: {
				port: 8000
			}
		})
	}
	onAdd(message, ...args) {
		message.reply(args.reduce((a, b) => a + b));
	}
}
class MathClient extends Client {
	constructor() {
		super("ws://localhost:8000", null, {
			engine: wsClient
		});
	}
}
const server = new MathServer();
const client = new MathClient();
(async () => {
	await server.open();
	await client.open();
	const six = await client.add(1, 2, 3);
	console.log(six); // 6
})();