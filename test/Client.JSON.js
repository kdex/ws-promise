import test from "ava";
import Client from "Client";
import Server from "Server";
import wsClient, { Server as wsServer } from "ws";
import uwsClient, { Server as uwsServer } from "uws";
import Message from "Message";
import { SYN, ACK, SYN_ACK } from "Protocol";
let globalPort = 5000;
const TIMEOUT = 500;
const restrict = fn => new Promise(resolve => {
	fn();
	setTimeout(resolve, TIMEOUT);
});
const serial = {
	encode: JSON.stringify,
	decode: JSON.parse
};
test.beforeEach(async t => {
	const port = globalPort += 2;
	const [wsPort, uwsPort] = [port, port + 1];
	const wsURL = `ws://localhost:${wsPort}`;
	const uwsURL = `ws://localhost:${uwsPort}`;
	const wsServerOptions = {
		engine: wsServer,
		engineOptions: {
			port: wsPort
		},
		...serial
	};
	const uwsServerOptions = {
		/* TODO: Replace this with `uwsServer` once they implement the necessary features */
		engine: wsServer,
		engineOptions: {
			port: uwsPort
		},
		...serial
	};
	const [wss, uwss, ws, uws] = await Promise.all([
		new Server(wsServerOptions).open(),
		new Server(uwsServerOptions).open(),
		new Client(wsURL, null, {
			engine: wsClient,
			...serial
		}).open(),
		new Client(uwsURL, null, {
			engine: uwsClient,
			...serial
		}).open()
	]);
	t.context.data = {
		servers: [wss, uwss],
		clients: [ws, uws]
	};
});
test("client throws if there is no usable client implementation", t => {
	t.throws(() => new Client());
});
test("server doesn't throw if there is no usable server implementation", t => {
	t.notThrows(() => new Server());
});
test("server receives message from client", t => restrict(() => {
		const { clients, servers } = t.context.data;
		const command = "multiply";
		const providedArgs = [1, 2, 3];
		const message = new Message(new SYN(command, ...providedArgs), serial);
		t.plan(servers.length * 2 * 3);
		for (const server of servers) {
			server.addEventListener(command, (message, ...args) => {
				t.true(message instanceof Message);
				t.true(message.instruction instanceof SYN);
				t.deepEqual(args, providedArgs);
			});
			server.on(command, (message, ...args) => {
				t.deepEqual(args, providedArgs);
				t.true(message instanceof Message);
				t.true(message.instruction instanceof SYN);
			});
		}
		for (const client of clients) {
			client.send(message);
		}
}));
test("client receives message from server", t => restrict(() => {
	const { clients, servers } = t.context.data;
	const command = "multiply";
	const providedArgs = [1, 2, 3];
	const solution = [6];
	const message = new Message(new SYN(command, ...providedArgs), serial);
	t.plan(clients.length * (4 + 3) + servers.length);
	for (const client of clients) {
		client.on("message", (receivedCommand, message, ...args) => {
			/* General message event */
			t.is(command, receivedCommand);
			t.deepEqual(args, providedArgs);
			t.true(message instanceof Message);
			t.true(message.instruction instanceof SYN);
			message.reply(...solution);
		});
		client.on(command, (message, ...args) => {
			/* Specific message event */
			t.deepEqual(args, providedArgs);
			t.true(message instanceof Message);
			t.true(message.instruction instanceof SYN);
			message.reply(...solution);
		});
	}
	for (const server of servers) {
		(async () => {
			const replies = await server.broadcast(message);
			for (const [client, [replyMessage, ...result]] of replies) {
				t.deepEqual(result, solution);
			}
		})();
	}
	for (const client of clients) {
		client.send(message);
	}
}));
test("client receives reply from server", t => restrict(() => {
	const { clients, servers } = t.context.data;
	const command = "multiply";
	const providedArgs = [1, 2, 3];
	const serverReply = [6, "hello"];
	const message = new Message(new SYN(command, ...providedArgs), serial);
	t.plan(clients.length);
	for (const server of servers) {
		server.on(command, (message, ...args) => {
			message.reply(...serverReply);
		});
	}
	for (const client of clients) {
		(async () => {
			const [reply, ...result] = await client.send(message);
			t.deepEqual(result, serverReply);
		})();
	}
}));
test("server receives reply from client", t => restrict(() => {
	const { clients, servers } = t.context.data;
	const command = "multiply";
	const providedArgs = [1, 2, 3];
	const serverReply = [6, "hello"];
	const clientReply = ["thanks"];
	const message = new Message(new SYN(command, ...providedArgs), serial);
	t.plan(servers.length * 2 + clients.length)
	for (const server of servers) {
		server.on(command, async (message, ...args) => {
			const [clientMessage, ...result] = await message.reply(...serverReply);
			t.deepEqual(result, clientReply);
			/* We shouldn't be able to reply to a SYN_ACK… */
			t.throws(() => clientMessage.reply("this shouldn't work"));
		});
	}
	for (const client of clients) {
		(async () => {
			const [serverMessage] = await client.send(message);
			serverMessage.reply(...clientReply);
			t.pass();
		})();
	}
}));
test("servers are closable, server will clean up", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "hello";
	t.plan(servers.length);
	for (const server of servers) {
		server.on(command, () => {
			t.fail();
		});
		await server.close();
		t.is(server.clients.size, 0);
	}
	for (const client of clients) {
		client.send(new Message(new SYN(command), serial));
	}
}));
test("clients are closable, server will clean up", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "hello";
	t.plan(servers.length);
	for (const client of clients) {
		client.options.autoReconnect = false;
		await client.close();
	}
	for (const server of servers) {
		setTimeout(() => {
			t.is(server.clients.size, 0);
		}, 100);
	}
}));
test("closed servers will be reconnected to, once they're up again (via `reconnect`)", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "hello";
	t.plan(servers.length);
	for (const server of servers) {
		server.on(command, () => {
			t.pass();
		});
		await server.close();
	}
	for (const server of servers) {
		await server.open();
	}
	for (const client of clients) {
		client.on("reconnect", () => {
			client.send(new Message(new SYN(command), serial));
		});
	}
}));
test("closed servers will be reconnected to, once they're up again (via `open`)", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "hello";
	t.plan(servers.length);
	for (const server of servers) {
		server.on(command, () => {
			t.pass();
		});
		await server.close();
	}
	for (const server of servers) {
		await server.open();
	}
	for (const client of clients) {
		client.on("open", () => {
			client.send(new Message(new SYN(command), serial));
		});
	}
}));
test("client can call a remote function, replies are automatic", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "multiply";
	t.plan(clients.length);
	for (const server of servers) {
		server.on(command, async (message, ...args) => {
			message.reply(args.reduce((x, y) => x * y));
		});
	}
	for (const client of clients) {
		const result = await client[command](1, 2, 3);
		t.is(result, 6);
	}
}));
test("servers can call a remote function, replies are automatic", t => restrict(async () => {
	const { servers, clients } = t.context.data;
	const command = "multiply";
	t.plan(clients.length);
	for (const client of clients) {
		client.on(command, async (message, ...args) => {
			message.reply(args.reduce((x, y) => x * y));
		});
	}
	for (const server of servers) {
		for (const client of server.clients) {
			const result = await client.multiply(1, 2, 3);
			t.is(result, 6);
		}
	}
}));