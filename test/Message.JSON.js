import test from "ava";
import { SYN } from "Protocol";
import Message from "Message";
const serial = {
	encode: JSON.stringify,
	decode: JSON.parse
};
test("can be encoded", t => {
	const message = new Message(new SYN("multiply", [1, 2, 3]), serial, 1);
	t.is(message.encode(), `{"id":1,"instruction":{"command":"multiply","args":[[1,2,3]],"type":"SYN"}}`);
});
test("can be decoded", t => {
	const encoded = `{
		"id": 1,
		"instruction": {
			"command": "multiply",
			"args": [
				[1, 2, 3]
			],
			"type": "SYN"
		}
	}`;
	const message = Message.from(encoded, serial);
	t.deepEqual(message, new Message(new SYN("multiply", [1, 2, 3]), serial, 1));
});