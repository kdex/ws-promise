# [WORKING TITLE HERE]

## Getting started

### Client (browser)
On a browser, there already is a native `WebSocket` client that you can use. Therefore, you can simply write:

```js
const client = new Client();
```

### Client (node)
As `WebSocket` is a web standard, it is not part of the `node.js` runtime. Therefore, if you would like to instantiate a client in a non-browser environment, you have to pass a standards-compliant `WebSocket` client class implementation for it to use. Good examples for such implementations would be `uws` or `ws`.

```js
import uws from "uws";
const client = new Client({
	use: uws
});
```

### Server
As servers, too, have no default `WebSocket` implementation, the same rules apply. Just pass in a server implementation that you like:

```js
import uws from "uws";
const server = new Server({
	use: uws
});