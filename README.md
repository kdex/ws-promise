# ws-promise

[![build](https://github.com/kdex/ws-promise/actions/workflows/master.yml/badge.svg)](https://github.com/kdex/ws-promise/actions/workflows/master.yml)
[![codecov](https://codecov.io/gh/kdex/ws-promise/branch/master/graph/badge.svg)](https://codecov.io/gh/kdex/ws-promise)
[![dependencies](https://david-dm.org/kdex/ws-promise/status.svg)](https://david-dm.org/kdex/ws-promise)

This project enables you to use `async` and `await` while communicating over WebSockets.

Behind the scenes, the WebSocket API is first wrapped in a `Promise` layer, and then the different endpoints are wired together through a tiny RPC protocol.

In summary, it enables you to write code like this on the client…:

**client.mjs**

```js
import Client from "ws-promise/Client";
const client = new Client("ws://localhost:8000");
(async () => {
	await client.open();
	/* The client can now call all server (!) methods that you expose */
	const six = await client.add(1, 2, 3);
	console.log(six);
})();
```
…and code like this on the server:

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
Note that `client.add` will actually contact the `server` and call its `onAdd` method with the arguments `[1, 2, 3]` as `args`. The result of this call is a `Promise` that we can `await` to retrieve the resulting number from the server. You don't need to differentiate multiple calls of the same type. The protocol does this for you, so an endpoint will only get a response when the remote endpoint has replied to *it specifically*. If a method doesn't exist on an endpoint, it will automatically be looked up on the remote endpoint.

Hence, **the client can call server methods, and the server can also call client methods**.

## Getting started
### Installation
Most likely, you won't be using `ws-promise` at build time, so you should install it as a run-time dependency:

```npm
$ npm install --save ws-promise
```
## Setup
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
const client = new Client(url, {
	engine: ws
});
```
### Server
Most non-browser environments have no built-in `WebSocket` implementation either, so the same rules apply.

Note that this project has been tested against the client and server engines from `ws`. In general, all engines with the corresponding events that `ws` provides should work just as well.

```js
import Server from "ws-promise/Server";
import WSClient from "ws";
const { Server: WSServer } = WSClient;
const server = new Server({
	engine: WSServer,
	engineOptions: {
		port: 8000
	}
});
```

If you don't provide any engine, the `node.js` version comes pre-bundled with the engine `ws`; so this will also work:

```js
import Server from "ws-promise/Server";
const server = new Server({
	engineOptions: {
		port: 8000
	}
});
```
## Usage
### Adding event listeners
There's two ways to make the server respond to your remote procedure calls. One way is to embrace ES2015 classes and add methods whose name is determined by the name of the remote procedure call. For example, if your client is trying to call `client.saveImage()`, you should extend the `Server` class and give your class a `saveImage` method:

```js
import Server from "ws-promise/Server";
class ImageServer extends Server {
	onSaveImage(message, ...args) {
		/* Your code here. */
	}
}
```
If you're not too fond of classes, that's fine, too. You can achieve the same by using a single instance of `Server` and then registering event listeners, similar to how you would do it in the DOM:

```js
import Server from "ws-promise/Server";
const server = new Server();
server.addEventListener("saveImage", (message, ...args) => {
	/* Your code here. */
});
```
Note that `on` is a shorthand for `addEventListener`.
### Wildcard events
When debugging your endpoint, it can often be useful to log *all* incoming events, regardless of their type. The wildcard event is named `message`, so the corresponding method to implement would be `onMessage`. The arguments start with an additional parameter to help you figure out the event name, i. e.:

```js
server.on("message", (event, message, ...args) => {
	/* Your code here. */
});
```
## API
Before reading this API documentation, note that classes are documented in `PascalCase` and class instances in `camelCase`.

### class: `Client`
#### constructor(url[, protocols], [options])
Constructs a new instance of [`Client`][Client], but in contrast to native [`WebSocket`][WebSocket] clients, this deliberately avoids a connection to `url` until you call [`client.open`][Client.open] — it merely serves the construction of the class.

- **`url`** : <[string]>
	The WebSocket URL to the instance of your `Server` class.
- **`protocols`**: <?[string] | ?[[string]]> Analogous to the browser's [`WebSocket` API][WebSocket].
- **`options`**: <?[Object]>
	- **`autoReconnect`**: <[boolean]>
		Whether the client should attempt to reconnect to the [server][Server] in case of a sudden connection loss. Defaults to `true`.
	- **`binaryType`**: <?[string]>
		Indicates how to represent binary data. For an overview of values that you can assign to this option, see [WebSocket.binaryType] or [WS.binaryType]. If set to `undefined`, the expected values to be transferred and received will be of type `string`. Defaults to `"arraybuffer"`.
	- **`decode`**: <[function]\([string] | [Uint8Array]\): [Object]>: A function that will parse incoming values. If **`binaryType`** is `undefined`, this function will be invoked with a `string`. If **`binaryType`** is `"arraybuffer"`, this function will be invoked with a [`Uint8Array`][Uint8Array]. Defaults to `MessagePackLite.decode`.
	- **`encode`**: <[function]\([Object]\): [string] | [Uint8Array]>:
		A function that will be used to serialize outgoing values. The return type is dependent on the **`binaryType`** option. If **`binaryType`** is `undefined`, this function must return a `string`. If **`binaryType`** is `"arraybuffer"`, this function must return a [`Uint8Array`][Uint8Array]. Defaults to `MessagePackLite.encode`.
	- **`engine`**: <[function]\([string], ?[string] | ?[[string]], [Object]\): [WebSocket] | [WS.WebSocket]>
		The client engine that should power the [client][Client]. Defaults to `globalThis.WebSocket`.
	- **`engineOptions`**: <[Object]>
		The options passed to the underlying WebSocket client engine. Note that in browsers, `globalThis.WebSocket` has no **`options`** argument, so providing it only makes sense in non-browser environments.
	- **`reconnectionFactor`**: <[number]>
		A factor by which the reconnection delay is prolonged for every failed connection attempt.  Defaults to `1.15`.
	- **`reconnectionMinimum`**: <[number]>
		The minimum delay between two reconnection attempts in milliseconds. Defaults to `200`.
- returns: <[Client]>
#### client.close()
> **Note:** This method is idempotent.

Disconnects the client from the server.

- returns: <[Promise]<[Client]>>, which can only resolve.
#### client.open()
Connects to the server URL specified in the constructor by **`url`**.
- returns: <[Promise]<[Client]>>
#### client.*anyOtherMethod*(...args)
> **Note: *`anyOtherMethod`* is just a placeholder, you can (and should) put any desired method name here.**

When run, tries to execute *`anyOtherMethod`* on the [`Server`][Server]. If the server chooses to handle this call, the [`Promise`][Promise] will resolve with the value that the server has replied with.

- `...args`: \<...any\> The arguments to pass to *`anyOtherMethod`* if the server chooses to execute it. Note that each value must be serializable via **`encode`**.
- returns: <[Promise]\<any\>>

### class: `Server`
#### constructor(url[, protocols], [options])
Constructs a new instance of [`Server`][Server]. but in contrast to [`WS.WebSocket.Server`][WS.WebSocket.Server] clients, this deliberately avoids a connection to `url` until you call [`server.open`][Server.open] — it merely serves the construction of the class.

- **`url`** : <[string]>
	The WebSocket URL to the instance of your `Server` class.
- **`protocols`**: <?[string] | ?[[string]]> Analogous to the browser's [`WebSocket` API][WebSocket].
- **`options`**: <?[Object]>
	- **`decode`**: <[function]\([string] | [Uint8Array]\): [Object]>:
		A function that will parse incoming values. Defaults to `MessagePackLite.decode`.
	- **`encode`**: <[function]\([Object]\): [string] | [Uint8Array]>:
		A function that will be used to serialize outgoing values. Defaults to `MessagePackLite.encode`.
	- **`engine`**: <[function]\([string], ?[string] | ?[[string]], [Object]\): [WS.WebSocket.Server]>
		The server engine that should power the [server][Server]. Defaults to [`WS.WebSocket.Server`][WS.WebSocket.Server].
	- **`engineOptions`**: <[Object]>
		The options passed to the underlying WebSocket server engine.
- returns: <[Server]>

#### server.close()
Closes the server.

- returns: <[Promise]<[Server]>> Resolves if the server has been closed successfully.

#### server.open()
Starts listening.
- returns: <[Promise]<[Server]>> Resolves as soon as the server is listening.

[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[Client]: https://github.com/kdex/ws-promise#class-client
[Client.open]: https://github.com/kdex/ws-promise#clientopen
[Client.anyOtherMethod]: https://github.com/kdex/ws-promise#clientanyothermethodargs
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[Server]: https://github.com/kdex/ws-promise#class-server
[Server.open]: https://github.com/kdex/ws-promise#serveropen
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
[Uint8Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
[WebSocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
[WebSocket.binaryType]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/binaryType
[WS.binaryType]: https://github.com/websockets/ws/blob/master/doc/ws.md#websocketbinarytype
[WS.WebSocket]: https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket
[WS.WebSocket.Server]: https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback