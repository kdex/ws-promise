export default (module, key = "default") => {
	return process.env.NODE_ENV === "test"
		? module
		: module[key] || module;
};