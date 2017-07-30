import test from "ava";
import { SYN } from "Protocol";
import Message from "Message";
const serial = {
	serialize: JSON.stringify,
	parse: JSON.parse
};
test("can be serialized", t => {
	const message = new Message(new SYN("multiply", [1, 2, 3]), serial, 1);
	t.is(message.serialize(), `{"id":1,"instruction":{"command":"multiply","args":[[1,2,3]],"type":"SYN"}}`);
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
	const message = Message.from(serialized, serial);
	t.deepEqual(message, new Message(new SYN("multiply", [1, 2, 3]), serial, 1));
});