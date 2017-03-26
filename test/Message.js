import test from "ava";
import { SYN } from "Protocol";
import Message from "Message";
test("can be serialized", t => {
	const message = new Message(1, new SYN("multiply", [1, 2, 3]));
	const serialized = String(message);
	t.is(serialized, `{"id":1,"instruction":{"command":"multiply","args":[[1,2,3]],"type":"SYN"}}`);
});
test("can be parsed", t => {
	const serialized = `{
		"id": 1,
		"instruction": {
			"command": "multiply",
			"args": [
				[1, 2, 3]
			],
			"type": "SYN"
		}
	}`;
	const message = Message.from(serialized);
	t.deepEqual(message, new Message(1, new SYN("multiply", [1, 2, 3])));
});