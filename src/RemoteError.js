export default class RemoteError extends Error {
	constructor(message, remoteStack) {
		super(message);
		this.remoteStack = remoteStack;
	}
}