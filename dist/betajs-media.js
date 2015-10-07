/*!
betajs-media - v0.0.2 - 2015-10-07
Copyright (c) Oliver Friedmann
MIT Software License.
*/
/*!
betajs-scoped - v0.0.2 - 2015-07-08
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
				newer = parseInt(my_version[i], 10) > parseInt(current_version[i], 10);
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
	
	function nodeUnresolvedWatchers(node, base, result) {
		node = node || nsRoot;
		result = result || [];
		if (!node.ready)
			result.push(base);
		for (var k in node.children) {
			var c = node.children[k];
			var r = (base ? base + "." : "") + c.route;
			result = nodeUnresolvedWatchers(c, r, result);
		}
		return result;
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
		},
		
		unresolvedWatchers: function (path) {
			return nodeUnresolvedWatchers(nodeNavigate(path), path);
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
		},
		
		unresolved: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			return ns.namespace.unresolvedWatchers(ns.path);
		}
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '9.9436392609879',
		
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
betajs-media - v0.0.2 - 2015-10-07
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
		version: '20.1444237822355'
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
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			}
			return this.__flashRegistry;
		}
		
	});
});



//Browser Dom Mutation Polyfill
//https://github.com/meetselva/attrchange
// Polyfill Wrapper for attribute setting / replacing / eventual loading
// Own state
// Attributes: poster, muted
// Methods: load
// Attrs: currentSrc, currentTime, duration, ended, paused, played, volume
// Events: *

// Credits: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.AudioRecorder", [
                                              "base:Class",
                                              "base:Events.EventsMixin",
                                              "base:Objs",
                                              "base:Functions",
                                              "module:WebRTC.Support"
                                              ], function (Class, EventsMixin, Objs, Functions, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {

			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._channels = [];
				this._recordingLength = 0;
				this._options = Objs.extend({
					audioChannels: 2,
					bufferSize: 16384,
					sampleRate: 44100				 
				}, options);
				this._stream = stream;
				this._started = false;
				this._stopped = false;
				//this.__initializeContext();
			},

			_audioProcess: function (e) {
				if (!this._started)					
					return;
				/*
				var sampleStartTime = e.playbackTime;
				var sampleStopTime = e.playbackTime + this._actualBufferSize / this._actualSampleRate;
				//var sampleStopTime = e.playbackTime;
				//var sampleStartTime = e.playbackTime - this._actualBufferSize / this._actualSampleRate;
				if (sampleStopTime <= this._startContextTime)
					return;
				if (this._stopped && sampleStartTime > this._stopContextTime) {
					this._started = false;
					this._generateData();
					return;
				}
				*/
				var offset = 0;
				var endOffset = this._actualBufferSize;
				/*
				if (sampleStartTime < this._startContextTime)
					offset = Math.round((this._startContextTime - sampleStartTime) * this._actualSampleRate);
				if (this._stopped && sampleStopTime > this._stopContextTime)
					endOffset = Math.round((this._stopContextTime - sampleStartTime) * this._actualSampleRate);
				*/
				this._channels.push({
					left: new Float32Array(e.inputBuffer.getChannelData(0)),
					right: this._options.audioChannels > 1 ? new Float32Array(e.inputBuffer.getChannelData(1)) : null,
					offset: offset,
					endOffset: endOffset
				});
				this._recordingLength += endOffset - offset;
				/*
				if (this._stopped && sampleStopTime > this._stopContextTime) {
					this._started = false;
					this._generateData();
					return;
				}
				*/
			},

			destroy: function () {
				this.stop();
				//this.__finalizeContext();
				inherited.destroy.call(this);
			},
			
			__initializeContext: function () {
				var AudioContext = Support.globals().AudioContext;
				this._audioContext = new AudioContext();
				this._actualSampleRate = this._audioContext.sampleRate || this._options.sampleRate;
				this._volumeGain = this._audioContext.createGain();
				this._audioInput = this._audioContext.createMediaStreamSource(this._stream);
				this._audioInput.connect(this._volumeGain);
				this._scriptProcessor = Support.globals().audioContextScriptProcessor.call(
						this._audioContext,
						this._options.bufferSize,
						this._options.audioChannels,
						this._options.audioChannels
				);
				this._actualBufferSize = this._scriptProcessor.bufferSize;
				this._scriptProcessor.onaudioprocess = Functions.as_method(this._audioProcess, this);
				this._volumeGain.connect(this._scriptProcessor);
				this._scriptProcessor.connect(this._audioContext.destination);
			},
			
			__finalizeContext: function () {
				this._scriptProcessor.disconnect();
				this._volumeGain.disconnect();
				this._audioInput.disconnect();
				this._scriptProcessor.onaudioprocess = null;
				delete this._scriptProcessor;
				delete this._volumeGain;
				delete this._audioInput;
			},

			start: function () {
				if (this._started)
					return;
				this.__initializeContext();
				this._startContextTime = this._audioContext.currentTime;
				this._started = true;
				this._stopped = false;
				this._recordingLength = 0;
				this._channels = [];
				this.trigger("started");
			},

			stop: function () {
				if (!this._started || this._stopped)
					return;
				this._stopContextTime = this._audioContext.currentTime;
				this._stopped = true;
				this.trigger("stopped");
				this.__finalizeContext();
				this._started = false;
				this._generateData();
			},

			_generateData: function () {
				var interleaved = new Float32Array(this._recordingLength * this._options.audioChannels);
				var offset = 0;
				for (var channelIdx = 0; channelIdx < this._channels.length; ++channelIdx) {
					var channelOffset = this._channels[channelIdx].offset;
					var endOffset = this._channels[channelIdx].endOffset;
					var left = this._channels[channelIdx].left;
					var right = this._channels[channelIdx].right;
					while (channelOffset < endOffset) {
						interleaved[offset] = left[channelOffset];
						if (right) 
							interleaved[offset+1] = right[channelOffset];
						++channelOffset;
						offset += this._options.audioChannels;
					}
				}
				// we create our wav file
				var buffer = new ArrayBuffer(44 + interleaved.length * 2);
				var view = new DataView(buffer);
				// RIFF chunk descriptor
				this.__writeUTFBytes(view, 0, 'RIFF');
				view.setUint32(4, 44 + interleaved.length * 2, true);
				this.__writeUTFBytes(view, 8, 'WAVE');
				// FMT sub-chunk
				this.__writeUTFBytes(view, 12, 'fmt ');
				view.setUint32(16, 16, true);
				view.setUint16(20, 1, true);
				// stereo (2 channels)
				view.setUint16(22, this._options.audioChannels, true);
				view.setUint32(24, this._actualSampleRate, true);
				view.setUint32(28, this._actualSampleRate * 4, true);
				view.setUint16(32, this._options.audioChannels * 2, true);
				view.setUint16(34, 16, true);
				// data sub-chunk
				this.__writeUTFBytes(view, 36, 'data');
				view.setUint32(40, interleaved.length * 2, true);
				// write the PCM samples
				var lng = interleaved.length;
				var index = 44;
				var volume = 1;
				for (var j = 0; j < lng; j++) {
					view.setInt16(index, interleaved[j] * (0x7FFF * volume), true);
					index += 2;
				}
				// our final binary blob
				this._data = new Blob([view], {
					type: 'audio/wav'
				});
				this._leftChannel = [];
				this._rightChannel = [];
				this._recordingLength = 0;
				this.trigger("data", this._data);
			},

			__writeUTFBytes: function (view, offset, string) {
				for (var i = 0; i < string.length; i++)
					view.setUint8(offset + i, string.charCodeAt(i));
			}


		};		
	}], {

		supported: function () {
			return !!Support.globals().AudioContext && !!Support.globals().audioContextScriptProcessor;
		}

	});
});

Scoped.define("module:WebRTC.MediaRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "module:WebRTC.Support"
], function (Class, EventsMixin, Functions, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (stream) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._started = false;
				var MediaRecorder = Support.globals().MediaRecorder;
				this._mediaRecorder = new MediaRecorder(stream);
				this._mediaRecorder.ondataavailable = Functions.as_method(this._dataAvailable, this);
			},
			
			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},
			
			start: function () {
				if (this._started)
					return;
				this._started = true;
				this._mediaRecorder.start();
				this.trigger("started");
			},
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this._mediaRecorder.stop();
				this.trigger("stopped");
			},
			
			_dataAvailable: function (e) {
				this._data = new Blob([e.data], {
					type: e.data.type
				});
				this.trigger("data", this._data);
			}
						
		};		
	}], {
		
		supported: function () {
			return !!Support.globals().MediaRecorder;
		}
		
	});
});
		

Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "module:WebRTC.Support",
    "base:Time"
], function (ConditionalInstance, EventsMixin, Objs, Support, Time, scoped) {
	return ConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				this._video = options.video;
				this._recording = false;
				this._bound = false;
			},
			
			_getConstraints: function () {
				return {
					audio: this._options.recordAudio,
					video: this._options.recordVideo ? {
						/*
						mandatory: {
							minWidth: this._options.recordResolution.width,
							maxWidth: this._options.recordResolution.width,
							minHeight: this._options.recordResolution.height,
							maxHeight: this._options.recordResolution.height
						}
						*/
						width: this._options.recordResolution.width,
						height: this._options.recordResolution.height
					} : false
				};
			},
			
			bindMedia: function () {
				if (this._bound)
					return;
				return Support.userMedia2(this._getConstraints()).success(function (stream) {
					this._bound = true;
					this._stream = stream;
					Support.bindStreamToVideo(stream, this._video);
					this.trigger("bound");
					this._boundMedia();
				}, this);
			},
			
			startRecord: function () {
				if (this._recording)
					return;
				this._recording = true;
				this._startRecord();
				this._startTime = Time.now();
			},
			
			stopRecord: function () {
				if (!this._recording)
					return;
				this._recording = false;
				this._stopRecord();
				this._stopTime = Time.now();
			},
			
			duration: function () {
				return (this._recording ? Time.now() : this._stopTime) - this._startTime;
			},
			
			unbindMedia: function () {
				if (!this._bound || this._recording)
					return;
				Support.stopUserMediaStream(this._stream);
				this._bound = false;
				this.trigger("unbound");
				this._unboundMedia();
			},
			
			createSnapshot: function (type) {
				return Support.dataURItoBlob(this._createSnapshot(type));
			},
			
			_createSnapshot: function (type) {
			    var canvas = document.createElement('canvas');
				canvas.width = this._video.videoWidth || this._video.clientWidth;
				canvas.height = this._video.videoHeight || this._video.clientHeight;
			    var context = canvas.getContext('2d');
	        	context.drawImage(this._video, 0, 0, canvas.width, canvas.height);
	        	var data = canvas.toDataURL(type);
	        	return data;
			},
			
			_boundMedia: function () {},
			
			_unboundMedia: function () {},
			
			_startRecord: function () {},
			
			_stopRecord: function () {},
			
			_dataAvailable: function (videoBlob, audioBlob) {
				this.trigger("data", videoBlob, audioBlob);
			},
			
			destroy: function () {
				this.stopRecord();
				this.unbindMedia();
				inherited.destroy.call(this);
			}
			
		};
	}], {
		
		_initializeOptions: function (options) {
			return Objs.extend({
				// video: null,
				recordAudio: true,
				recordVideo: true,
				recordResolution: {
					width: 320,
					height: 200
				}
			}, options);
		},
		
		supported: function (options) {
			return !!Support.globals().getUserMedia && !!Support.globals().URL;
		}		
		
	});
});


Scoped.define("module:WebRTC.MediaRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.MediaRecorder"
], function (RecorderWrapper, MediaRecorder, scoped) {
	var Cls = RecorderWrapper.extend({scoped: scoped}, {

		_boundMedia: function () {
			this._recorder = new MediaRecorder(this._stream);
			this._recorder.on("data", function (blob) {
				this._dataAvailable(blob);
			}, this);
		},
		
		_unboundMedia: function () {
			this._recorder.destroy();
		},
		
		_startRecord: function () {
			this._recorder.start();
		},
		
		_stopRecord: function () {
			this._recorder.stop();
		}

	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				return MediaRecorder.supported();
			}
		
		};		
	});	
	
	RecorderWrapper.register(Cls, 2);
	
	return Cls;
});


Scoped.define("module:WebRTC.WhammyAudioRecorderWrapper", [
     "module:WebRTC.RecorderWrapper",
     "module:WebRTC.AudioRecorder",
     "module:WebRTC.WhammyRecorder"
], function (RecorderWrapper, AudioRecorder, WhammyRecorder, scoped) {
	var Cls = RecorderWrapper.extend({scoped: scoped}, {
/*
		_getConstraints: function () {
			return {
				audio: this._options.recordAudio,
				video: this._options.recordVideo
			}
		},
*/
		_createSnapshot: function (type) {
			return this._whammyRecorder.createSnapshot(type);
		},

		_boundMedia: function () {
			this._whammyRecorder = new WhammyRecorder(this._stream, {
				//recorderWidth: this._options.recordResolution.width,
				//recorderHeight: this._options.recordResolution.height,
				video: this._video
			});
			this._audioRecorder = new AudioRecorder(this._stream);
			this._audioRecorder.on("data", function (blob) {
				this._audioBlob = blob;
				if (this._videoBlob)
					this._dataAvailable(this._videoBlob, this._audioBlob);
			}, this);
			this._whammyRecorder.on("data", function (blob) {
				this._videoBlob = blob;
				if (this._audioBlob)
					this._dataAvailable(this._videoBlob, this._audioBlob);
			}, this);
			/*
			this._whammyRecorder.on("onStartedDrawingNonBlankFrames", function () {
				if (this._recording)
					this._audioRecorder.start();
			}, this);
			*/
		},
		
		_unboundMedia: function () {
			this._audioRecorder.destroy();
			this._whammyRecorder.destroy();
		},
		
		_startRecord: function () {
			this._whammyRecorder.start();
			this._audioRecorder.start();
		},
		
		_stopRecord: function () {
			this._whammyRecorder.stop();
			this._audioRecorder.stop();
		}		
		
	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				return AudioRecorder.supported() && WhammyRecorder.supported();
			}
		
		};		
	});	
	
	RecorderWrapper.register(Cls, 1);
	
	return Cls;
});

Scoped.define("module:WebRTC.Support", [
    "base:Promise.Promise",
    "base:Objs",
    "base:Browser.Info"
], function (Promise, Objs, Info) {
	return {
		
		canvasSupportsImageFormat: function (imageFormat) {
			try {
				var data = document.createElement('canvas').toDataURL(imageFormat);
				var headerIdx = data.indexOf(";");
				return data.substring(0, data.indexOf(";")).indexOf(imageFormat) != -1;
			} catch (e) {
				return false;
			}
		},
		
		getGlobals: function () {
			var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
			var URL = window.URL || window.webkitURL;
			var MediaRecorder = window.MediaRecorder;
			var AudioContext = window.AudioContext || window.webkitAudioContext;
			var audioContextScriptProcessor = null;
			if (AudioContext) {
				var audioContext = new AudioContext();
				audioContextScriptProcessor = audioContext.createJavaScriptNode || audioContext.createScriptProcessor;
			}
			return {
				getUserMedia: getUserMedia,
				URL: URL,
				MediaRecorder: MediaRecorder,
				AudioContext: AudioContext,
				audioContextScriptProcessor: audioContextScriptProcessor,
				webpSupport: this.canvasSupportsImageFormat("image/webp") 
			};
		},
		
		globals: function () {
			if (!this.__globals)
				this.__globals = this.getGlobals();
			return this.__globals;
		},
		
		userMediaSupported: function () {
			return !!this.globals().getUserMedia;
		},
		
		mediaStreamTrackSourcesSupported: function () {
			return MediaStreamTrack && MediaStreamTrack.getSources;
		},
		
		mediaStreamTrackSources: function () {
			if (!this.mediaStreamTrackSourcesSupported())
				return Promise.error("Unsupported");
			var promise = new Promise();
			try {
				MediaStreamTrack.getSources(function (sources) {
					var result = {
						audio: {},
						audioCount: 0,
						video: {},
						videoCount: 0
					};
					Objs.iter(sources, function (source) {
						if (source.kind === "video") {
							result.videoCount++;
							result.video[source.id] = {
								id: source.id,
								label: source.label
							};
						}
						if (source.kind === "audio") {
							result.audioCount++;
							result.audio[source.id] = {
								id: source.id,
								label: source.label
							};
						}
					});
					promise.asyncSuccess(result);
				});
				return promise;
			} catch (e) {
				return Promise.error(e);
			}
		},
		
		streamQueryResolution: function (stream) {
			var promise = new Promise();
			var video = this.bindStreamToVideo(stream);			
            video.addEventListener("playing", function () {
                setTimeout(function () {
                	promise.asyncSuccess({
                		stream: stream,
                		width: video.videoWidth,
                		height: video.videoHeight
                	});
                	video.remove();
                }, 500);
            });
			return promise;
		},
		
		userMedia: function (options) {
			var promise = new Promise();
			this.globals().getUserMedia.call(navigator, options, function (stream) {
				promise.asyncSuccess(stream);
			}, function (e) {
				promise.asyncError(e);
			});
			return promise;
		},
		
		/*
		 * audio: {} | undefined
		 * video: {} | undefined
		 * 	  width, height, aspectRatio
		 */
		userMedia2: function (options) {
			var opts = {};
			if (options.audio)
				opts.audio = true;
			if (!options.video)
				return this.userMedia(opts);
			if (Info.isFirefox()) {
				if (options.video) {
					opts.video = {};
					if (options.video.aspectRatio && !(options.video.width && options.video.height)) {
						if (options.video.width)
							options.video.height = Math.round(options.video.width / options.video.aspectRatio);
						else if (options.video.height)
							options.video.width = Math.round(options.video.height * options.video.aspectRatio);
					}
					if (options.video.width) {
						opts.video.width = {
							ideal: options.video.width
						};
					}
					if (options.video.height) {
						opts.video.height = {
							ideal: options.video.height
						};
					}
				}
				return this.userMedia(opts);
			} else {
				if (options.video) {
					opts.video = {
						mandatory: {}
					};
					if (options.video.width) {
						opts.video.mandatory.minWidth = options.video.width;
						opts.video.mandatory.maxWidth = options.video.width;
					}
					if (!options.video.width && options.video.height) {
						opts.video.mandatory.minHeight = options.video.height;
						opts.video.mandatory.maxHeight = options.video.height;
					}
					var as = options.video.aspectRatio ? options.video.aspectRatio : (options.video.width && options.video.height ? options.video.width/options.video.height : null);
					if (as) {
						opts.video.mandatory.minAspectRatio = as;
						opts.video.mandatory.maxAspectRatio = as;
					}
				}
				var probe = function () {
					var mandatory = opts.video.mandatory;
					return this.userMedia(opts).mapError(function (e) {
						if (e.name !== "ConstraintNotSatisfiedError")
							return e;
						var c = e.constraintName;
						var flt = c.indexOf("aspect") > 0;
						var d = c.indexOf("min") === 0 ? -1 : 1;
						var u = Math.max(0, mandatory[c] * (1.0 + d / 10));
						mandatory[c] = flt ? u : Math.round(u);
						return probe.call(this);
					}, this);
				};
				return probe.call(this);
			}
		},
		
		stopUserMediaStream: function (stream) {
			stream.stop();
		},
		
		bindStreamToVideo: function (stream, video) {
			if (!video)
				video = document.createElement("video");
			video.volume = 0;
			video.muted = true;
			if (video.mozSrcObject !== undefined)
                video.mozSrcObject = stream;
            else
            	video.src = this.globals().URL.createObjectURL(stream);
			video.autoplay = true;
			video.play();
			return video;
		},
		
		dataURItoBlob: function (dataURI) {
		    // convert base64 to raw binary data held in a string
		    var byteString = atob(dataURI.split(',')[1]);

		    // separate out the mime component
		    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

		    // write the bytes of the string to an ArrayBuffer
		    var arrayBuffer = new ArrayBuffer(byteString.length);
		    var _ia = new Uint8Array(arrayBuffer);
		    for (var i = 0; i < byteString.length; i++)
		        _ia[i] = byteString.charCodeAt(i);
		    var dataView = new DataView(arrayBuffer);
		    var blob = new Blob([dataView], { type: mimeString });
		    return blob;
		}

	};
});





// Credits: https://github.com/antimatter15/whammy/blob/master/whammy.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.WhammyRecorder", [
                                              "base:Class",
                                              "base:Events.EventsMixin",
                                              "base:Objs",
                                              "base:Time",
                                              "base:Functions",
                                              "base:Async",
                                              "module:WebRTC.Support"
                                              ], function (Class, EventsMixin, Objs, Time, Functions, Async, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {

			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._options = Objs.extend({
					recordWidth: 320,
					recordHeight: 240,
					video: null
				}, options);
				this._started = false;
			},

			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},

			start: function () {
				if (this._started)
					return;
				this._started = true;
			    if (this._options.video) {
			    	this._options.recordWidth = this._options.video.videoWidth || this._options.video.clientWidth;
			    	this._options.recordHeight = this._options.video.videoHeight || this._options.video.clientHeight;
			    }
				this._video = document.createElement('video');
				this._video.width = this._options.recordWidth;
				this._video.height = this._options.recordHeight;
				Support.bindStreamToVideo(this._stream, this._video);
			    this._canvas = document.createElement('canvas');
				this._canvas.width = this._options.recordWidth;
				this._canvas.height = this._options.recordHeight;
	            this._context = this._canvas.getContext('2d');
			    this._frames = [];
			    this._isOnStartedDrawingNonBlankFramesInvoked = false;
			    this._lastTime = Time.now();
				this.trigger("started");
				Async.eventually(this._process, [], this);
			},
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this.trigger("stopped");
				this._generateData();
			},
			
			_process: function () {
				if (!this._started)
					return;
				var now = Time.now();
				var duration = now - this._lastTime;
		        this._lastTime = now;
	        	this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
			    this._frames.push({
		            duration: duration,
		            image: this._canvas.toDataURL('image/webp')
		        });
		        if (!this._isOnStartedDrawingNonBlankFramesInvoked && !this.__isBlankFrame(this._canvas, this._frames[this._frames.length - 1])) {
		            this._isOnStartedDrawingNonBlankFramesInvoked = true;
		            this.trigger("onStartedDrawingNonBlankFrames");
		        }
		        Async.eventually(this._process, [], this, Math.max(1, 10 - (Time.now() - now)));
			},
			
			_generateData: function () {
		        if (!this._frames.length)
		            return;
		        this._data = this.__compile(this.__dropBlackFrames(this._canvas, this._frames, -1));
		        this.trigger("data", this._data);
			},
			
			clearOldRecordedFrames: function () {
				this._frames = [];
			},
			
			__doubleToString: function (num) {
		        return [].slice.call(
	                new Uint8Array((new Float64Array([num])).buffer), 0).map(function(e) {
	                return String.fromCharCode(e);
	            }).reverse().join('');
			},
			
			__parseRIFF: function (string) {
		        var offset = 0;
		        var chunks = {};

	            var f = function(i) {
	                var unpadded = i.charCodeAt(0).toString(2);
	                return (new Array(8 - unpadded.length + 1)).join('0') + unpadded;
	            }; 

	            while (offset < string.length) {
		            var id = string.substr(offset, 4);
		            var len = parseInt(string.substr(offset + 4, 4).split('').map(f).join(''), 2);
		            var data = string.substr(offset + 4 + 4, len);
		            offset += 4 + 4 + len;
		            chunks[id] = chunks[id] || [];

		            if (id == 'RIFF' || id == 'LIST') {
		                chunks[id].push(this.__parseRIFF(data));
		            } else {
		                chunks[id].push(data);
		            }
		        }
		        return chunks;
		    },
		    
		    __parseWebP: function (riff) {
		        var VP8 = riff.RIFF[0].WEBP[0];

		        var frame_start = VP8.indexOf('\x9d\x01\x2a'); // A VP8 keyframe starts with the 0x9d012a header
		        for (var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);

		        var width, height, tmp;

		        //the code below is literally copied verbatim from the bitstream spec
		        tmp = (c[1] << 8) | c[0];
		        width = tmp & 0x3FFF;
		        tmp = (c[3] << 8) | c[2];
		        height = tmp & 0x3FFF;
		        return {
		            width: width,
		            height: height,
		            data: VP8,
		            riff: riff
		        };
		    },
		    
		    __checkFrames: function (frames) {
		        if (!frames[0])
		            return null;
		        var duration = 0;
		        Objs.iter(frames, function (frame) {
		        	duration += frame.duration;
		        });
		        return {
		            duration: duration,
		            width: frames[0].width,
		            height: frames[0].height
		        };
		    },

		    __makeSimpleBlock: function (data) {
		        var flags = 0;
		        if (data.keyframe) flags |= 128;
		        if (data.invisible) flags |= 8;
		        if (data.lacing) flags |= (data.lacing << 1);
		        if (data.discardable) flags |= 1;
		        if (data.trackNum > 127)
		            throw "TrackNumber > 127 not supported";
		        var out = [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function(e) {
		            return String.fromCharCode(e);
		        }).join('') + data.frame;
		        return out;
		    },
		    
		    __numToBuffer: function (num) {
		        var parts = [];
		        while (num > 0) {
		            parts.push(num & 0xff);
		            num = num >> 8;
		        }
		        return new Uint8Array(parts.reverse());
		    },

		    __strToBuffer: function (str) {
		        return new Uint8Array(str.split('').map(function(e) {
		            return e.charCodeAt(0);
		        }));
		    },

		    __bitsToBuffer: function (bits) {
		        var data = [];
		        var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
		        bits = pad + bits;
		        for (var i = 0; i < bits.length; i += 8) {
		            data.push(parseInt(bits.substr(i, 8), 2));
		        }
		        return new Uint8Array(data);
		    },
		    
		    __generateEBML: function (json) {
		        var ebml = [];
		        for (var i = 0; i < json.length; i++) {
		            var data = json[i].data;
		            if (typeof data == 'object') data = this.__generateEBML(data);
		            if (typeof data == 'number') data = this.__bitsToBuffer(data.toString(2));
		            if (typeof data == 'string') data = this.__strToBuffer(data);

		            var len = data.size || data.byteLength || data.length;
		            var zeroes = Math.ceil(Math.ceil(Math.log(len) / Math.log(2)) / 8);
		            var size_str = len.toString(2);
		            var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
		            var size = (new Array(zeroes)).join('0') + '1' + padded;

		            ebml.push(this.__numToBuffer(json[i].id));
		            ebml.push(this.__bitsToBuffer(size));
		            ebml.push(data);
		        }
		        return new Blob(ebml, {
		            type: "video/webm"
		        });
		    },
		    
		    __toWebM: function (frames) {
		        var info = this.__checkFrames(frames);

		        var CLUSTER_MAX_DURATION = 30000;

		        var EBML = [{
		            "id": 0x1a45dfa3, // EBML
		            "data": [{
		                "data": 1,
		                "id": 0x4286 // EBMLVersion
		            }, {
		                "data": 1,
		                "id": 0x42f7 // EBMLReadVersion
		            }, {
		                "data": 4,
		                "id": 0x42f2 // EBMLMaxIDLength
		            }, {
		                "data": 8,
		                "id": 0x42f3 // EBMLMaxSizeLength
		            }, {
		                "data": "webm",
		                "id": 0x4282 // DocType
		            }, {
		                "data": 2,
		                "id": 0x4287 // DocTypeVersion
		            }, {
		                "data": 2,
		                "id": 0x4285 // DocTypeReadVersion
		            }]
		        }, {
		            "id": 0x18538067, // Segment
		            "data": [{
		                "id": 0x1549a966, // Info
		                "data": [{
		                    "data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
		                    "id": 0x2ad7b1 // TimecodeScale
		                }, {
		                    "data": "whammy",
		                    "id": 0x4d80 // MuxingApp
		                }, {
		                    "data": "whammy",
		                    "id": 0x5741 // WritingApp
		                }, {
		                    "data": this.__doubleToString(info.duration),
		                    "id": 0x4489 // Duration
		                }]
		            }, {
		                "id": 0x1654ae6b, // Tracks
		                "data": [{
		                    "id": 0xae, // TrackEntry
		                    "data": [{
		                        "data": 1,
		                        "id": 0xd7 // TrackNumber
		                    }, {
		                        "data": 1,
		                        "id": 0x63c5 // TrackUID
		                    }, {
		                        "data": 0,
		                        "id": 0x9c // FlagLacing
		                    }, {
		                        "data": "und",
		                        "id": 0x22b59c // Language
		                    }, {
		                        "data": "V_VP8",
		                        "id": 0x86 // CodecID
		                    }, {
		                        "data": "VP8",
		                        "id": 0x258688 // CodecName
		                    }, {
		                        "data": 1,
		                        "id": 0x83 // TrackType
		                    }, {
		                        "id": 0xe0, // Video
		                        "data": [{
		                            "data": info.width,
		                            "id": 0xb0 // PixelWidth
		                        }, {
		                            "data": info.height,
		                            "id": 0xba // PixelHeight
		                        }]
		                    }]
		                }]
		            }]
		        }];

		        //Generate clusters (max duration)
		        var frameNumber = 0;
		        var clusterTimecode = 0;
		        var self = this;
		        var clusterCounter = 0;
		        
		        var f = function(webp) {
                    var block = self.__makeSimpleBlock({
                        discardable: 0,
                        frame: webp.data.slice(4),
                        invisible: 0,
                        keyframe: 1,
                        lacing: 0,
                        trackNum: 1,
                        timecode: Math.round(clusterCounter)
                    });
                    clusterCounter += webp.duration;
                    return {
                        data: block,
                        id: 0xa3
                    };
                };
		        
		        while (frameNumber < frames.length) {

		            var clusterFrames = [];
		            var clusterDuration = 0;
		            do {
		                clusterFrames.push(frames[frameNumber]);
		                clusterDuration += frames[frameNumber].duration;
		                frameNumber++;
		            } while (frameNumber < frames.length && clusterDuration < CLUSTER_MAX_DURATION);

		            clusterCounter = 0;
		            var cluster = {
		                "id": 0x1f43b675, // Cluster
		                "data": [{
		                    "data": clusterTimecode,
		                    "id": 0xe7 // Timecode
		                }].concat(clusterFrames.map(f))
		            }; //Add cluster to segment
		            EBML[1].data.push(cluster);
		            clusterTimecode += clusterDuration;
		        }

		        return this.__generateEBML(EBML);
		    },
		    
		    __compile: function (frames) {
		    	var self = this;
		        var result = this.__toWebM(frames.map(function(frame) {
		            var webp = self.__parseWebP(self.__parseRIFF(atob(frame.image.slice(23))));
		            webp.duration = frame.duration;
		            return webp;
		        }));
		        //return new result;
		        return result;
		    },
		    
		    __dropBlackFrames: function (canvas, _frames, _framesToCheck, _pixTolerance, _frameTolerance) {
		        var localCanvas = document.createElement('canvas');
		        localCanvas.width = canvas.width;
		        localCanvas.height = canvas.height;
		        var context2d = localCanvas.getContext('2d');
		        var resultFrames = [];

		        var checkUntilNotBlack = _framesToCheck === -1;
		        var endCheckFrame = (_framesToCheck && _framesToCheck > 0 && _framesToCheck <= _frames.length) ?
		            _framesToCheck : _frames.length;
		        var sampleColor = {
		            r: 0,
		            g: 0,
		            b: 0
		        };
		        var maxColorDifference = Math.sqrt(
		            Math.pow(255, 2) +
		            Math.pow(255, 2) +
		            Math.pow(255, 2)
		        );
		        var pixTolerance = _pixTolerance && _pixTolerance >= 0 && _pixTolerance <= 1 ? _pixTolerance : 0;
		        var frameTolerance = _frameTolerance && _frameTolerance >= 0 && _frameTolerance <= 1 ? _frameTolerance : 0;
		        var doNotCheckNext = false;

		        for (var f = 0; f < endCheckFrame; f++) {
		            var matchPixCount, endPixCheck, maxPixCount;

		            if (!doNotCheckNext) {
		                var image = new Image();
		                image.src = _frames[f].image;
		                context2d.drawImage(image, 0, 0, canvas.width, canvas.height);
		                var imageData = context2d.getImageData(0, 0, canvas.width, canvas.height);
		                matchPixCount = 0;
		                endPixCheck = imageData.data.length;
		                maxPixCount = imageData.data.length / 4;

		                for (var pix = 0; pix < endPixCheck; pix += 4) {
		                    var currentColor = {
		                        r: imageData.data[pix],
		                        g: imageData.data[pix + 1],
		                        b: imageData.data[pix + 2]
		                    };
		                    var colorDifference = Math.sqrt(
		                        Math.pow(currentColor.r - sampleColor.r, 2) +
		                        Math.pow(currentColor.g - sampleColor.g, 2) +
		                        Math.pow(currentColor.b - sampleColor.b, 2)
		                    );
		                    // difference in color it is difference in color vectors (r1,g1,b1) <=> (r2,g2,b2)
		                    if (colorDifference <= maxColorDifference * pixTolerance) {
		                        matchPixCount++;
		                    }
		                }
		            }

		            if (!doNotCheckNext && maxPixCount - matchPixCount <= maxPixCount * frameTolerance) {
		            } else {
		                if (checkUntilNotBlack) {
		                    doNotCheckNext = true;
		                }
		                resultFrames.push(_frames[f]);
		            }
		        }

		        resultFrames = resultFrames.concat(_frames.slice(endCheckFrame));

		        if (resultFrames.length <= 0) {
		            // at least one last frame should be available for next manipulation
		            // if total duration of all frames will be < 1000 than ffmpeg doesn't work well...
		            resultFrames.push(_frames[_frames.length - 1]);
		        }

		        return resultFrames;
		    },
		    
		    __isBlankFrame: function (canvas, frame, _pixTolerance, _frameTolerance) {
		        var localCanvas = document.createElement('canvas');
		        localCanvas.width = canvas.width;
		        localCanvas.height = canvas.height;
		        var context2d = localCanvas.getContext('2d');

		        var sampleColor = {
		            r: 0,
		            g: 0,
		            b: 0
		        };
		        var maxColorDifference = Math.sqrt(
		            Math.pow(255, 2) +
		            Math.pow(255, 2) +
		            Math.pow(255, 2)
		        );
		        var pixTolerance = _pixTolerance && _pixTolerance >= 0 && _pixTolerance <= 1 ? _pixTolerance : 0;
		        var frameTolerance = _frameTolerance && _frameTolerance >= 0 && _frameTolerance <= 1 ? _frameTolerance : 0;

		        var matchPixCount, endPixCheck, maxPixCount;

		        var image = new Image();
		        image.src = frame.image;
		        context2d.drawImage(image, 0, 0, canvas.width, canvas.height);
		        var imageData = context2d.getImageData(0, 0, canvas.width, canvas.height);
		        matchPixCount = 0;
		        endPixCheck = imageData.data.length;
		        maxPixCount = imageData.data.length / 4;

		        for (var pix = 0; pix < endPixCheck; pix += 4) {
		            var currentColor = {
		                r: imageData.data[pix],
		                g: imageData.data[pix + 1],
		                b: imageData.data[pix + 2]
		            };
		            var colorDifference = Math.sqrt(
		                Math.pow(currentColor.r - sampleColor.r, 2) +
		                Math.pow(currentColor.g - sampleColor.g, 2) +
		                Math.pow(currentColor.b - sampleColor.b, 2)
		            );
		            // difference in color it is difference in color vectors (r1,g1,b1) <=> (r2,g2,b2)
		            if (colorDifference <= maxColorDifference * pixTolerance) {
		                matchPixCount++;
		            }
		        }

		        if (maxPixCount - matchPixCount <= maxPixCount * frameTolerance) {
		            return false;
		        } else {
		            return true;
		        }
		    },
			
			createSnapshot: function (type) {
				this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
				return this._canvas.toDataURL(type);
			}

		};		
	}], {

		supported: function () {
			return Support.globals().webpSupport;
		}

	});
});

}).call(Scoped);