import expect from "expect";
import { SYN } from "../src/Protocol";
import Message from "../src/Message";
const serial = {
	encode: JSON.stringify,
	decode: JSON.parse
};
test("can be encoded", () => {
	const message = new Message(new SYN("multiply", [1, 2, 3]), serial, 1);
	expect(message.encode()).toBe(`{"id":1,"instruction":{"args":[[1,2,3]],"command":"multiply","type":0}}`);
});
test("can be decoded", () => {
	const encoded = `{
		"id": 1,
		"instruction": {
			"args": [
				[1, 2, 3]
			],
			"command": "multiply",
			"type": 0
		}
	}`;
	const message = Message.from(encoded, serial);
	expect(message).toEqual(new Message(new SYN("multiply", [1, 2, 3]), serial, 1));
});