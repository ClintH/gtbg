module.exports =  {
	splitTrim: function(input, sep) {
		return input.split(sep).map(function(v,i,a) {
			return v.trim();
		});
	},

	upTo: function(haystack, needle) {
		var pos = haystack.indexOf(needle);
		if (pos < 0) return haystack;
		return haystack.substr(0, pos);
	},

	endsWith: function(haystack, needle) {
		if (haystack.length <= needle.length) return false;
		var pos = haystack.toLowerCase().lastIndexOf(needle.toLowerCase());
		if (pos < 0) return false;
		return (pos + needle.length === haystack.length);
	},

	startsWith: function(haystack, needle) {
		if (typeof(haystack) == 'undefined') return false;
		if (typeof(needle) == 'undefined') return false;

		if (haystack.length <= needle.length) return false;
		var pos = haystack.toLowerCase().indexOf(needle.toLowerCase());
		if (pos === 0) return true;
		return false;
	},

	endsWithRemove: function(haystack, needle) {
		if (this.endsWith(haystack, needle)) {
			return haystack.substr(0, haystack.length - needle.length);
		}
		return haystack;
	}

};
