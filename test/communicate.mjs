import { SYN, ACK, SYN_ACK } from "../src/Protocol";
import Client from "../src/Client";
import expect from "expect";
import getPort from "get-port";
import Message from "../src/Message";
import Server from "../src/Server";
import WSClient from "ws";
const { Server: WSServer } = WSClient;
const TIMEOUT = 500;
const terminate = async instances => {
	for (const instance of instances) {
		await instance.close();
	}
};
export default serial => {
	const getContext = async () => {
		const wsPort = await getPort();
		const wsURL = `ws://localhost:${wsPort}`;
		const wsServerOptions = {
			engine: WSServer,
			engineOptions: {
				port: wsPort
			},
			...serial
		};
		const [wss, ws] = await Promise.all([
			new Server(wsServerOptions).open(),
			new Client(wsURL, null, {
				engine: WSClient,
				...serial
			}).open()
		]);
		return {
			servers: [wss],
			clients: [ws]
		};
	};
	test("client throws if there is no usable client implementation", () => {
		expect(() => new Client()).toThrow();
	}, TIMEOUT);
	test("server doesn't throw if there is no server implementation specified", () => {
		expect(() => new Server()).not.toThrow();
	}, TIMEOUT);
	const checkIfDone = async (setup, asserted, message) => {
		setup.assertions += asserted;
		if (setup.assertions === setup.expectedAssertions) {
			await message.reply();
		}
	};
	test("server receives message from client", async () => {
			const { clients, servers } = await getContext();
			const command = "multiply";
			const providedArgs = [1, 2, 3];
			const message = new Message(new SYN(command, ...providedArgs), serial);
			const expectations = [
				message => expect(message instanceof Message).toBe(true),
				message => expect(message.instruction instanceof SYN).toBe(true),
				(message, ...args) => expect(args).toEqual(providedArgs)
			];
			const expectedAssertions = servers.length * clients.length * 2 * expectations.length;
			expect.assertions(expectedAssertions);
			const setup = {
				assertions: 0,
				expectedAssertions: expectations.length
			};
			const handleCommand = async (message, ...args) => {
				for (const expectation of expectations) {
					expectation(message, ...args);
				}
				await checkIfDone(setup, expectations.length, message);
			};
			for (const server of servers) {
				server.addEventListener(command, (...args) => handleCommand(...args));
				server.on(command, (...args) => handleCommand(...args));
			}
			await Promise.all(clients.map(client => client.send(message)));
			await terminate(clients);
			await terminate(servers);
	}, TIMEOUT);
	test("client receives message from server", async () => {
		const { clients, servers } = await getContext();
		const command = "multiply";
		const providedArgs = [1, 2, 3];
		const solution = [6];
		const message = new Message(new SYN(command, ...providedArgs), serial);
		const expectations = {
			general: [
				receivedCommand => expect(command).toBe(receivedCommand),
				(receivedCommand, message, ...args) => expect(args).toEqual(providedArgs),
				(receivedCommand, message) => expect(message instanceof Message).toBe(true),
				(receivedCommand, message) => expect(message.instruction instanceof SYN).toBe(true)
			],
			specific: [
				(message, ...args) => expect(args).toEqual(providedArgs),
				message => expect(message instanceof Message).toBe(true),
				message => expect(message.instruction instanceof SYN).toBe(true)
			],
			server: [
				result => expect(result).toEqual(solution)
			]
		};
		const expectedAssertions = clients.length * (expectations.general.length + expectations.specific.length) + servers.length * expectations.server.length;
		expect.assertions(expectedAssertions);
		for (const client of clients) {
			client.on("message", (receivedCommand, message, ...args) => {
				for (const expectation of expectations.general) {
					expectation(receivedCommand, message, ...args);
				}
				message.reply(...solution);
			});
			client.on(command, (message, ...args) => {
				for (const expectation of expectations.specific) {
					expectation(message, ...args);
				}
				message.reply(...solution);
			});
		}
		const serverPromises = servers.map(async server => {
			const replies = await server.broadcast(message);
			for (const [client, [replyMessage, ...result]] of replies) {
				for (const expectation of expectations.server) {
					expectation(result);
				}
			}
		});
		await Promise.all(serverPromises);
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("client receives reply from server", async () => {
		const { clients, servers } = await getContext();
		const command = "multiply";
		const providedArgs = [1, 2, 3];
		const serverReply = [6, "hello"];
		const message = new Message(new SYN(command, ...providedArgs), serial);
		expect.assertions(clients.length);
		for (const server of servers) {
			server.on(command, (message, ...args) => {
				message.reply(...serverReply);
			});
		}
		await Promise.all(clients.map(async client => {
			const [reply, ...result] = await client.send(message);
			expect(result).toEqual(serverReply);
		}));
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("client receives error from server", async () => {
		const { clients, servers } = await getContext();
		const command = "multiply";
		const providedArgs = [1, 2, 3];
		const errorMessage = "Could not multiply";
		const serverReply = [new Error(errorMessage)];
		const message = new Message(new SYN(command, ...providedArgs), serial);
		expect.assertions(clients.length);
		for (const server of servers) {
			server.on(command, (message, ...args) => {
				message.reply(...serverReply);
			});
		}
		await Promise.all(clients.map(async client => {
			const [reply, ...result] = await client.send(message);
			const [error] = result;
			expect(error.message).toBe(errorMessage);
		}));
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("server receives reply from client", async () => {
		const { clients, servers } = await getContext();
		const command = "multiply";
		const providedArgs = [1, 2, 3];
		const serverReply = [6, "hello"];
		const clientReply = ["thanks"];
		const message = new Message(new SYN(command, ...providedArgs), serial);
		expect.assertions(servers.length * 2);
		let count = 0;
		for (const server of servers) {
			server.on(command, async (message, ...args) => {
				const [clientMessage, ...result] = await message.reply(...serverReply);
				expect(result).toEqual(clientReply);
				try {
					await clientMessage.reply("this shouldn't work");
				}
				catch (e) {
					/* We shouldn't be able to reply to a SYN_ACK. */
					await expect(e.message).toEqual("Invalid attempt to reply to a reply");
					++count;
				}
			});
		}
		return Promise.all(clients.map(async client => {
			const [serverMessage] = await client.send(message);
			serverMessage.reply(...clientReply);
			return new Promise(resolve => {
				const timer = setInterval(async () => {
					if (count === servers.length) {
						await terminate(clients);
						await terminate(servers);
						clearInterval(timer);
						resolve();
					}
				}, 0);
			});
		}));
	}, TIMEOUT);
	test("servers are closable, server will clean up", async () => {
		const { servers, clients } = await getContext();
		const command = "hello";
		expect.assertions(servers.length);
		for (const server of servers) {
			server.on(command, () => {
				throw new Exception("Server replied to a command, even though it had already been closed.");
			});
			await server.close();
			expect(server.clients.size).toBe(0);
		}
		for (const client of clients) {
			client.send(new Message(new SYN(command), serial));
		}
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("clients are closable, server will clean up", async () => {
		const { servers, clients } = await getContext();
		const command = "hello";
		expect.assertions(0);
		for (const client of clients) {
			client.options.autoReconnect = false;
			await client.close();
		}
		return Promise.all(servers.map(server => new Promise(resolve => {
			const timer = setInterval(async () => {
				if (server.clients.size === 0) {
					await terminate(clients);
					await terminate(servers);
					clearInterval(timer);
					resolve();
				}
			}, 0);
		})));
	}, TIMEOUT);
	test("closed servers will be reconnected to, once they're up again (via `reconnect`)", async () => {
		const { servers, clients } = await getContext();
		const command = "hello";
		expect.assertions(clients.length);
		let done = false;
		for (const client of clients) {
			client.on("reconnect", () => {
				expect(true).toBe(true);
				done = true;
			});
		}
		for (const server of servers) {
			server.on(command, () => {});
			await server.close();
		}
		for (const server of servers) {
			await server.open();
		}
		return new Promise(resolve => {
			const timer = setInterval(async () => {
				if (done) {
					await terminate(clients);
					await terminate(servers);
					clearInterval(timer);
					resolve();
				}
			}, 0);
		});
	}, TIMEOUT);
	test("closed servers will be reconnected to, once they're up again (via `open`)", async () => {
		const { servers, clients } = await getContext();
		const command = "hello";
		expect.assertions(clients.length);
		let done = false;
		for (const client of clients) {
			client.on("open", () => {
				expect(true).toBe(true);
				done = true;
			});
		}
		for (const server of servers) {
			server.on(command, () => {});
			await server.close();
		}
		for (const server of servers) {
			await server.open();
		}
		return new Promise(resolve => {
			const timer = setInterval(async () => {
				if (done) {
					await terminate(clients);
					await terminate(servers);
					clearInterval(timer);
					resolve();
				}
			}, 0);
		});
	}, TIMEOUT);
	test("client can call a remote function, replies are automatic", async () => {
		const { servers, clients } = await getContext();
		const command = "multiply";
		expect.assertions(clients.length);
		for (const server of servers) {
			server.on(command, async (message, ...args) => {
				message.reply(args.reduce((x, y) => x * y));
			});
		}
		for (const client of clients) {
			const result = await client[command](1, 2, 3);
			expect(result).toBe(6);
		}
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("servers can call a remote function, replies are automatic", async () => {
		const { servers, clients } = await getContext();
		const command = "multiply";
		expect.assertions(clients.length);
		for (const client of clients) {
			client.on(command, async (message, ...args) => {
				message.reply(args.reduce((x, y) => x * y));
			});
		}
		for (const server of servers) {
			for (const client of server.clients) {
				const result = await client.multiply(1, 2, 3);
				expect(result).toBe(6);
			}
		}
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
	test("closing a server twice is idempotent", async () => {
		const { servers, clients } = await getContext();
		const command = "hello";
		expect.assertions(servers.length * 2);
		for (const server of servers) {
			await expect(server.close()).resolves.toBe(server);
			await expect(server.close()).resolves.toBe(server);
		}
		await terminate(clients);
		await terminate(servers);
	}, TIMEOUT);
};