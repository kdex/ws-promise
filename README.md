# ws-promise

[![travis](https://travis-ci.org/kdex/ws-promise.svg?branch=master)](https://travis-ci.org/kdex/ws-promise)
[![codecov](https://codecov.io/gh/kdex/ws-promise/branch/master/graph/badge.svg)](https://codecov.io/gh/kdex/ws-promise)
[![dependencies](https://david-dm.org/kdex/ws-promise/status.svg)](https://david-dm.org/kdex/ws-promise)

This project allows you to use WebSockets with Promises in RPC fashion.

In brief, it enables you to write code like this on the client:
**client.mjs**
```js
import Client from "ws-promise/Client";
const client = new Client("ws://localhost:8000");
(async () => {
	await client.open();
	/* The client can now call server (!) methods */
	const six = await client.add(1, 2, 3);
	console.log(six);
})();
```
And code like this on the server:
**server.mjs**
```js
import Server from "ws-promise/Server";
class MathServer extends Server {
	constructor() {
		super({
			engineOptions: {
				port: 8000
			}
		});
	}
	async onAdd(message, ...args) {
		/* Clients can sum up numbers on the server */
		await message.reply(args.reduce((a, b) => a + b));
		/* In this line, the client will have received the result! */
	}
}
const server = new MathServer();
server.open();
```
Note that `client.add` will actually contact the `server` and call its `onAdd` method with the arguments `[1, 2, 3]` as `args`. The result of this call is a `Promise` that we can `await` to retrieve the resulting number from the server. You don't have to register any methods manually anywhere; non-existing `client` methods will automatically be looked up on the server.

## Getting started

### Client (browser)
On a browser, there already is a native `WebSocket` client that you can use. Therefore, you can simply write:
```js
import Client from "ws-promise/Client";
const client = new Client(url);
```
### Client (node)
As `WebSocket` is a web standard, it is not part of the `node.js` runtime. Therefore, if you would like to instantiate a client in a non-browser environment, you have to pass a standards-compliant `WebSocket` client class implementation for it to use. A good example for such an implementation would be `ws`.
```js
import ws from "ws";
import Client from "ws-promise/Client";
const client = new Client(url, subprotocols, {
	engine: ws
});
```
### Server
As servers, too, have no default `WebSocket` implementation, the same rules apply. You can pass in any server implementation that you like:

```js
import Server from "ws-promise/Server";
import { wsServer } from "ws";
const wsServer = new Server({
	engine: wsServer,
	engineOptions: {
		port: 8000
	}
});
```
If you don't provide any engine, the `node.js` version comes pre-bundled with the engine `ws`.

## FAQ

### Which engines can I use?
This project has been tested against the client and server engines from `ws`. In general, all engines with the corresponding events that `ws` provides should work just as well.

### Can servers also call client methods?
Yes, they both communicate with the same RPC protocol.

### Do I *have* to use `extends`?
No, you can also use regular events like so:
```js
server.on("multiply", (message, ...args) => { /* … */ });
```
### Is there a "wildcard" event?
Yes. The event itself is called `message`, so the corresponding method to implement is called `onMessage`. It takes one additional parameter so that you can check the event name, i.e.:
```js
server.on("message", (event, message, ...args) => { /* … */ });
```
### How do I use this?
There isn't much documentation yet; for now, please refer to the `examples` and `test` directory.