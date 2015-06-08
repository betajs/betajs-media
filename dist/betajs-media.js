/*!
betajs-media - v0.0.1 - 2015-06-08
Copyright (c) Oliver Friedmann
MIT Software License.
*/
/*!
betajs-scoped - v0.0.1 - 2015-03-26
Copyright (c) Oliver Friedmann
MIT Software License.
*/
var Scoped = (function () {
var Globals = {

	get : function(key) {
		if (typeof window !== "undefined")
			return window[key];
		if (typeof global !== "undefined")
			return global[key];
		return null;
	},

	set : function(key, value) {
		if (typeof window !== "undefined")
			window[key] = value;
		if (typeof global !== "undefined")
			global[key] = value;
		return value;
	},
	
	setPath: function (path, value) {
		var args = path.split(".");
		if (args.length == 1)
			return this.set(path, value);		
		var current = this.get(args[0]) || this.set(args[0], {});
		for (var i = 1; i < args.length - 1; ++i) {
			if (!(args[i] in current))
				current[args[i]] = {};
			current = current[args[i]];
		}
		current[args[args.length - 1]] = value;
		return value;
	},
	
	getPath: function (path) {
		var args = path.split(".");
		if (args.length == 1)
			return this.get(path);		
		var current = this.get(args[0]);
		for (var i = 1; i < args.length; ++i) {
			if (!current)
				return current;
			current = current[args[i]];
		}
		return current;
	}

};
var Helper = {
		
	method: function (obj, func) {
		return function () {
			return func.apply(obj, arguments);
		};
	},
	
	extend: function (base, overwrite) {
		base = base || {};
		overwrite = overwrite || {};
		for (var key in overwrite)
			base[key] = overwrite[key];
		return base;
	},
	
	typeOf: function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]' ? "array" : typeof obj;
	},
	
	isEmpty: function (obj) {
		if (obj === null || typeof obj === "undefined")
			return true;
		if (this.typeOf(obj) == "array")
			return obj.length === 0;
		if (typeof obj !== "object")
			return false;
		for (var key in obj)
			return false;
		return true;
	},
	
	matchArgs: function (args, pattern) {
		var i = 0;
		var result = {};
		for (var key in pattern) {
			if (pattern[key] === true || this.typeOf(args[i]) == pattern[key]) {
				result[key] = args[i];
				i++;
			} else if (this.typeOf(args[i]) == "undefined")
				i++;
		}
		return result;
	},
	
	stringify: function (value) {
		if (this.typeOf(value) == "function")
			return "" + value;
		return JSON.stringify(value);
	}	

};
var Attach = {
		
	__namespace: "Scoped",
	
	upgrade: function (namespace) {
		var current = Globals.get(namespace || Attach.__namespace);
		if (current && Helper.typeOf(current) == "object" && current.guid == this.guid && Helper.typeOf(current.version) == "string") {
			var my_version = this.version.split(".");
			var current_version = current.version.split(".");
			var newer = false;
			for (var i = 0; i < Math.min(my_version.length, current_version.length); ++i) {
				newer = my_version[i] > current_version[i];
				if (my_version[i] != current_version[i]) 
					break;
			}
			return newer ? this.attach(namespace) : current;				
		} else
			return this.attach(namespace);		
	},

	attach : function(namespace) {
		if (namespace)
			Attach.__namespace = namespace;
		var current = Globals.get(Attach.__namespace);
		if (current == this)
			return this;
		Attach.__revert = current;
		Globals.set(Attach.__namespace, this);
		return this;
	},
	
	detach: function (forceDetach) {
		if (forceDetach)
			Globals.set(Attach.__namespace, null);
		if (typeof Attach.__revert != "undefined")
			Globals.set(Attach.__namespace, Attach.__revert);
		delete Attach.__revert;
		return this;
	},
	
	exports: function (mod, object, forceExport) {
		mod = mod || (typeof module != "undefined" ? module : null);
		if (typeof mod == "object" && mod && "exports" in mod && (forceExport || mod.exports == this || !mod.exports || Helper.isEmpty(mod.exports)))
			mod.exports = object || this;
		return this;
	}	

};

function newNamespace (options) {
	
	options = Helper.extend({
		tree: false,
		global: false,
		root: {}
	}, options);
	
	function initNode(options) {
		return Helper.extend({
			route: null,
			parent: null,
			children: {},
			watchers: [],
			data: {},
			ready: false,
			lazy: []
		}, options);
	}
	
	var nsRoot = initNode({ready: true});
	
	var treeRoot = null;
	
	if (options.tree) {
		if (options.global) {
			try {
				if (window)
					treeRoot = window;
			} catch (e) { }
			try {
				if (global)
					treeRoot = global;
			} catch (e) { }
		} else
			treeRoot = options.root;
		nsRoot.data = treeRoot;
	}
	
	function nodeDigest(node) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready) {
			nodeDigest(node.parent);
			return;
		}
		if (node.route in node.parent.data) {
			node.data = node.parent.data[node.route];
			node.ready = true;
			for (var i = 0; i < node.watchers.length; ++i)
				node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
			node.watchers = [];
			for (var key in node.children)
				nodeDigest(node.children[key]);
		}
	}
	
	function nodeEnforce(node) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready)
			nodeEnforce(node.parent);
		node.ready = true;
		if (options.tree && typeof node.parent.data == "object")
			node.parent.data[node.route] = node.data;
		for (var i = 0; i < node.watchers.length; ++i)
			node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
		node.watchers = [];
	}
	
	function nodeSetData(node, value) {
		if (typeof value == "object") {
			for (var key in value) {
				node.data[key] = value[key];
				if (node.children[key])
					node.children[key].data = value[key];
			}
		} else
			node.data = value;
		nodeEnforce(node);
		for (var k in node.children)
			nodeDigest(node.children[k]);
	}
	
	function nodeClearData(node) {
		if (node.ready && node.data) {
			for (var key in node.data)
				delete node.data[key];
		}
	}
	
	function nodeNavigate(path) {
		if (!path)
			return nsRoot;
		var routes = path.split(".");
		var current = nsRoot;
		for (var i = 0; i < routes.length; ++i) {
			if (routes[i] in current.children)
				current = current.children[routes[i]];
			else {
				current.children[routes[i]] = initNode({
					parent: current,
					route: routes[i]
				});
				current = current.children[routes[i]];
				nodeDigest(current);
			}
		}
		return current;
	}
	
	function nodeAddWatcher(node, callback, context) {
		if (node.ready)
			callback.call(context || this, node.data);
		else {
			node.watchers.push({
				callback: callback,
				context: context
			});
			if (node.lazy.length > 0) {
				var f = function (node) {
					if (node.lazy.length > 0) {
						var lazy = node.lazy.shift();
						lazy.callback.call(lazy.context || this, node.data);
						f(node);
					}
				};
				f(node);
			}
		}
	}

	return {
		
		extend: function (path, value) {
			nodeSetData(nodeNavigate(path), value);
		},
		
		set: function (path, value) {
			var node = nodeNavigate(path);
			if (node.data)
				nodeClearData(node);
			nodeSetData(node, value);
		},
		
		lazy: function (path, callback, context) {
			var node = nodeNavigate(path);
			if (node.ready)
				callback(context || this, node.data);
			else {
				node.lazy.push({
					callback: callback,
					context: context
				});
			}
		},
		
		digest: function (path) {
			nodeDigest(nodeNavigate(path));
		},
		
		obtain: function (path, callback, context) {
			nodeAddWatcher(nodeNavigate(path), callback, context);
		}
		
	};
	
}
function newScope (parent, parentNamespace, rootNamespace, globalNamespace) {
	
	var self = this;
	var nextScope = null;
	var childScopes = [];
	var localNamespace = newNamespace({tree: true});
	var privateNamespace = newNamespace({tree: false});
	
	var bindings = {
		"global": {
			namespace: globalNamespace
		}, "root": {
			namespace: rootNamespace
		}, "local": {
			namespace: localNamespace
		}, "default": {
			namespace: privateNamespace
		}, "parent": {
			namespace: parentNamespace
		}, "scope": {
			namespace: localNamespace,
			readonly: false
		}
	};
	
	var custom = function (argmts, name, callback) {
		var args = Helper.matchArgs(argmts, {
			options: "object",
			namespaceLocator: true,
			dependencies: "array",
			hiddenDependencies: "array",
			callback: true,
			context: "object"
		});
		
		var options = Helper.extend({
			lazy: this.options.lazy
		}, args.options || {});
		
		var ns = this.resolve(args.namespaceLocator);
		
		var execute = function () {
			this.require(args.dependencies, args.hiddenDependencies, function () {
				arguments[arguments.length - 1].ns = ns;
				if (this.options.compile) {
					var params = [];
					for (var i = 0; i < argmts.length; ++i)
						params.push(Helper.stringify(argmts[i]));
					this.compiled += this.options.ident + "." + name + "(" + params.join(", ") + ");\n\n";
				}
				var result = args.callback.apply(args.context || this, arguments);
				callback.call(this, ns, result);
			}, this);
		};
		
		if (options.lazy)
			ns.namespace.lazy(ns.path, execute, this);
		else
			execute.apply(this);

		return this;
	};
	
	return {
		
		getGlobal: Helper.method(Globals, Globals.getPath),
		setGlobal: Helper.method(Globals, Globals.setPath),
		
		options: {
			lazy: false,
			ident: "Scoped",
			compile: false			
		},
		
		compiled: "",
		
		nextScope: function () {
			if (!nextScope)
				nextScope = newScope(this, localNamespace, rootNamespace, globalNamespace);
			return nextScope;
		},
		
		subScope: function () {
			var sub = this.nextScope();
			childScopes.push(sub);
			nextScope = null;
			return sub;
		},
		
		binding: function (alias, namespaceLocator, options) {
			if (!bindings[alias] || !bindings[alias].readonly) {
				var ns;
				if (Helper.typeOf(namespaceLocator) != "string") {
					ns = {
						namespace: newNamespace({
							tree: true,
							root: namespaceLocator
						}),
						path: null	
					};
				} else
					ns = this.resolve(namespaceLocator);
				bindings[alias] = Helper.extend(options, ns);
			}
			return this;
		},
		
		resolve: function (namespaceLocator) {
			var parts = namespaceLocator.split(":");
			if (parts.length == 1) {
				return {
					namespace: privateNamespace,
					path: parts[0]
				};
			} else {
				var binding = bindings[parts[0]];
				if (!binding)
					throw ("The namespace '" + parts[0] + "' has not been defined (yet).");
				return {
					namespace: binding.namespace,
					path : binding.path && parts[1] ? binding.path + "." + parts[1] : (binding.path || parts[1])
				};
			}
		},
		
		define: function () {
			return custom.call(this, arguments, "define", function (ns, result) {
				ns.namespace.set(ns.path, result);
			});
		},
		
		extend: function () {
			return custom.call(this, arguments, "extend", function (ns, result) {
				ns.namespace.extend(ns.path, result);
			});
		},
		
		condition: function () {
			return custom.call(this, arguments, "condition", function (ns, result) {
				if (result)
					ns.namespace.set(ns.path, result);
			});
		},
		
		require: function () {
			var args = Helper.matchArgs(arguments, {
				dependencies: "array",
				hiddenDependencies: "array",
				callback: "function",
				context: "object"
			});
			args.callback = args.callback || function () {};
			var dependencies = args.dependencies || [];
			var allDependencies = dependencies.concat(args.hiddenDependencies || []);
			var count = allDependencies.length;
			var deps = [];
			var environment = {};
			if (count) {
				var f = function (value) {
					if (this.i < deps.length)
						deps[this.i] = value;
					count--;
					if (count === 0) {
						deps.push(environment);
						args.callback.apply(args.context || this.ctx, deps);
					}
				};
				for (var i = 0; i < allDependencies.length; ++i) {
					var ns = this.resolve(allDependencies[i]);
					if (i < dependencies.length)
						deps.push(null);
					ns.namespace.obtain(ns.path, f, {
						ctx: this,
						i: i
					});
				}
			} else {
				deps.push(environment);
				args.callback.apply(args.context || this, deps);
			}
			return this;
		},
		
		digest: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			ns.namespace.digest(ns.path);
			return this;
		}		
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '9.1427403679672',
		
	upgrade: Attach.upgrade,
	attach: Attach.attach,
	detach: Attach.detach,
	exports: Attach.exports
	
});

Public = Public.upgrade();
Public.exports();
	return Public;
}).call(this);
/*!
betajs-media - v0.0.1 - 2015-06-08
Copyright (c) Oliver Friedmann
MIT Software License.
*/
(function () {

var Scoped = this.subScope();

Scoped.binding("module", "global:BetaJS.Media");
Scoped.binding("base", "global:BetaJS");

Scoped.binding("jquery", "global:jQuery");

Scoped.define("module:", function () {
	return {
		guid: "8475efdb-dd7e-402e-9f50-36c76945a692",
		version: '8.1433781928579'
	};
});


Scoped.define("module:Player.Flash", [
    "base:Browser.Dom",
    "base:Async",
    "module:Player.FlashPlayer"
], function (Dom, Async, FlashPlayer) {
	return {
		
		polyfill: function (element, polyfilltag, force, eventual) {
			if (eventual) {
				Async.eventually(function () {
					this.polyfill(element, polyfilltag, force);
				}, this);
				return element; 
			}
			if (element.tagName.toLowerCase() != "video" || !("networkState" in element))
				return this.attach(element);
			else if (element.networkState == element.NETWORK_NO_SOURCE || force)
				return this.attach(Dom.changeTag(element, polyfilltag || "videopoly"));
			return element;
		},
		
		attach: function (element) {
			var cls = new FlashPlayer(element);
			return element;
		}

	};
});



Scoped.define("module:Player.FlashPlayer", [
    "base:Class",
    "base:Flash.FlashClassRegistry",
    "base:Flash.FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "jquery:"    
], function (Class, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, $, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (element) {
				inherited.constructor.call(this);
				this._element = element;
				this._$element = $(element);
				this._currentWidth = null;
				this._currentHeight = null;
				this.__initCss();
				this._source = this.__preferedSource();
				this._embedding = new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true
				});
				this._flashObjs = {};
				this._flashData = {
					status: 'idle'
				};
				this._embedding.ready(this.__initializeEmbedding, this);
				this.__initEvents();
				Objs.iter(this.__elementMethods, function (func, key) {
					this._element[key] = Functions.as_method(func, this);
				}, this);
			},
			
			destroy: function () {
				$(window).off("." + this.cid());
				$(document).off("." + this.cid());
				this._embedding.destroy();
				inherited.destroy.call(this);
			},
			
			__initEvents: function () {
				var self = this;
				$(document).on("DOMNodeRemoved." + this.cid(), function (event) {
					if (event.target == self._element)
						self.weakDestroy();
				});
				$(window).on("resize", function () {
					self.updateSize();
				});
			},
			
			__initCss: function () {
				if (!this._$element.css("display") || this._$element.css("display") == "inline")
					this._$element.css("display", "inline-block");
			},
			
			__preferedSource: function () {
				var preferred = [".mp4", ".flv"];
				var sources = [];
				var element = this._element;
				for (var i = 0; i < this._element.childNodes.length; ++i) {
					if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
						sources.push(element.childNodes[i].src.toLowerCase());
				}
				var source = sources[0];
				var currentExtIndex = preferred.length - 1;
				for (i = sources.length - 1; i >= 0; --i) {
					for (var j = 0; j <= currentExtIndex; ++j) {
						if (Strings.ends_with(sources[i], preferred[j])) {
							source = sources[i];
							currentExtIndex = j;
							break;
						}
					}
				}
				if (source.indexOf("://") == -1)
					source = document.location.href + "/../" + source;
				
				var connectionUrl = null;
				var playUrl = source;
				if (Strings.starts_with(source, "rtmp")) {
					var spl = Strings.splitLast(source, "/");
					connectionUrl = spl.head;
					playUrl = spl.tail;
				}
								
				return {
					sourceUrl: source,
					connectionUrl: connectionUrl,
					playUrl: playUrl
				};
			},
			
			__initializeEmbedding: function () {
				this._flashObjs.main = this._embedding.flashMain();
				this._flashObjs.stage = this._flashObjs.main.get("stage");
				this._flashObjs.stage.set("scaleMode", "noScale");
				this._flashObjs.stage.set("align", "TL");
				this._flashObjs.video = this._embedding.newObject(
					"flash.media.Video",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.main.addChildVoid(this._flashObjs.video);
				this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
				this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__connectionStatusEvent, this)));
				this._flashObjs.connection.connectVoid(this._source.connectionUrl);
			},
			
			__connectionStatusEvent: function () {
				this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
				this._flashObjs.stream.set("client", this._embedding.newCallback("onMetaData", Functions.as_method(function (info) {
					this._flashData.meta = info;
					Async.eventually(this.updateSize, this);
				}, this)));
				this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__streamStatusEvent, this)));
				this._flashObjs.video.attachNetStreamVoid(this._flashObjs.stream);
				if (this._element.attributes.autoplay)
					this._element.play();
			},
			
			__streamStatusEvent: function (event) {
				var code = event.get("info").code;
				if (code == "NetStream.Play.Start")
					this._flashData.status = "start";
				if (code == "NetStream.Play.Stop")
					this._flashData.status = "stopping";
				if (code == "NetStream.Buffer.Empty" && this._flashData.status == "stopping")
					this._flashData.status = "stopped";
				if (this._flashData.status == "stopped" && this._element.attributes.loop) {
					this._flashData.status = "idle";
					this._element.play();
				}
			},
			
			updateSize: function () {
				if (!this._flashData.meta)
					return;
				var $el = this._$element;
				var el = this._element;
				var meta = this._flashData.meta;
				
				var newWidth = $el.width();
				if ($el.width() < meta.width && !el.style.width) {
					element.style.width = meta.width + "px";
					newWidth = $el.width();
					delete element.style.width;
				}
				var newHeight = Math.round(newWidth * meta.height / meta.width);
				if (newWidth != this._currentWidth) {
					this._currentWidth = newWidth;
					this._currentHeight = newHeight;
					$el.find("object").css("width", this._currentWidth + "px");
					$el.find("embed").css("width", this._currentWidth + "px");
					$el.find("object").css("height", this._currentHeight + "px");
					$el.find("embed").css("height", this._currentHeight + "px");
					this._flashObjs.video.set("width", this._currentWidth);
					this._flashObjs.video.set("height", this._currentHeight);
				}
			},
			
			__elementMethods: {
				
				play: function () {
					if (this._flashData.status === "paused")
						this._flashObjs.stream.resumeVoid();
					else
						this._flashObjs.stream.playVoid(this._source.playUrl);
				},
				
				pause: function () {
					this._flashObjs.stream.pauseVoid();
					this._flashData.status = "paused";
				},
				
				load: function () {
					this._flashObjs.stream.pauseVoid();
					this._flashObjs.stream.set("seek", 0);
					this._flashData.status = "stopped";
				}			
			
			}			
		
		};		
	}, {
		
		flashRegistry: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "stop", "addEventListener"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			}
			return this.__flashRegistry;
		}
		
	});
});


//TODO: poster, other

}).call(Scoped);