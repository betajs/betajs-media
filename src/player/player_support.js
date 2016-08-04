Scoped.define("module:Player.Support", function () {
	return {
		
		resolutionToLabel: function (width, height) {
			if (height < 300)
				return "SD";
			if (height < 400)
				return "360p";
			if (height < 500)
				return "480p";
			return "HD";
		}
		
	};
});