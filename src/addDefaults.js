const commonDefaults = {
	serialize: JSON.stringify,
	parse: JSON.parse
};
export default (options, specifics) => Object.assign({}, commonDefaults, specifics, options);