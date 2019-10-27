import Client from "../src/Client";
import Server from "../src/Server";
import WSClient from "ws";
const { Server: WSServer } = WSClient;
class MathServer extends Server {
	constructor() {
		super({
			engine: WSServer,
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
			engine: WSClient
		});
	}
}
const server = new MathServer();
const client = new MathClient();
(async () => {
	await Promise.all([server.open(), client.open()]);
	const six = await client.add(1, 2, 3);
	console.log(six); // 6
	await Promise.all([server.close(), client.close()]);
})();