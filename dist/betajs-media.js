/*!
betajs-media - v0.0.118 - 2019-05-20
Copyright (c) Ziggeo,Oliver Friedmann,Rashad Aliyev
Apache-2.0 Software License.
*/
/** @flow **//*!
betajs-scoped - v0.0.19 - 2018-04-07
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/
var Scoped = (function () {
var Globals = (function () {  
/** 
 * This helper module provides functions for reading and writing globally accessible namespaces, both in the browser and in NodeJS.
 * 
 * @module Globals
 * @access private
 */
return {
		
	/**
	 * Returns the value of a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @return value of global variable or undefined if not existing
	 */
	get : function(key/* : string */) {
		if (typeof window !== "undefined")
			return key ? window[key] : window;
		if (typeof global !== "undefined")
			return key ? global[key] : global;
		if (typeof self !== "undefined")
			return key ? self[key] : self;
		return undefined;
	},

	
	/**
	 * Sets a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @param value value to be set
	 * @return value that has been set
	 */
	set : function(key/* : string */, value) {
		if (typeof window !== "undefined")
			window[key] = value;
		if (typeof global !== "undefined")
			global[key] = value;
		if (typeof self !== "undefined")
			self[key] = value;
		return value;
	},
	
	
	/**
	 * Returns the value of a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @return value of global variable or undefined if not existing
	 * 
	 * @example
	 * // returns window.foo.bar / global.foo.bar 
	 * Globals.getPath("foo.bar")
	 */
	getPath: function (path/* : string */) {
		if (!path)
			return this.get();
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
	},


	/**
	 * Sets a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @param value value to be set
	 * @return value that has been set
	 * 
	 * @example
	 * // sets window.foo.bar / global.foo.bar 
	 * Globals.setPath("foo.bar", 42);
	 */
	setPath: function (path/* : string */, value) {
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
	}
	
};}).call(this);
/*::
declare module Helper {
	declare function extend<A, B>(a: A, b: B): A & B;
}
*/

var Helper = (function () {  
/** 
 * This helper module provides auxiliary functions for the Scoped system.
 * 
 * @module Helper
 * @access private
 */
return { 
		
	/**
	 * Attached a context to a function.
	 * 
	 * @param {object} obj context for the function
	 * @param {function} func function
	 * 
	 * @return function with attached context
	 */
	method: function (obj, func) {
		return function () {
			return func.apply(obj, arguments);
		};
	},

	
	/**
	 * Extend a base object with all attributes of a second object.
	 * 
	 * @param {object} base base object
	 * @param {object} overwrite second object
	 * 
	 * @return {object} extended base object
	 */
	extend: function (base, overwrite) {
		base = base || {};
		overwrite = overwrite || {};
		for (var key in overwrite)
			base[key] = overwrite[key];
		return base;
	},
	
	
	/**
	 * Returns the type of an object, particulary returning 'array' for arrays.
	 * 
	 * @param obj object in question
	 * 
	 * @return {string} type of object
	 */
	typeOf: function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]' ? "array" : typeof obj;
	},
	
	
	/**
	 * Returns whether an object is null, undefined, an empty array or an empty object.
	 * 
	 * @param obj object in question
	 * 
	 * @return true if object is empty
	 */
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
	
	
    /**
     * Matches function arguments against some pattern.
     * 
     * @param {array} args function arguments
     * @param {object} pattern typed pattern
     * 
     * @return {object} matched arguments as associative array 
     */	
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
	
	
	/**
	 * Stringifies a value as JSON and functions to string representations.
	 * 
	 * @param value value to be stringified
	 * 
	 * @return stringified value
	 */
	stringify: function (value) {
		if (this.typeOf(value) == "function")
			return "" + value;
		return JSON.stringify(value);
	}	

	
};}).call(this);
var Attach = (function () {  
/** 
 * This module provides functionality to attach the Scoped system to the environment.
 * 
 * @module Attach
 * @access private
 */
return { 
		
	__namespace: "Scoped",
	__revert: null,
	
	
	/**
	 * Upgrades a pre-existing Scoped system to the newest version present. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	upgrade: function (namespace/* : ?string */) {
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


	/**
	 * Attaches the Scoped system to the environment. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	attach : function(namespace/* : ?string */) {
		if (namespace)
			Attach.__namespace = namespace;
		var current = Globals.get(Attach.__namespace);
		if (current == this)
			return this;
		Attach.__revert = current;
		if (current) {
			try {
				var exported = current.__exportScoped();
				this.__exportBackup = this.__exportScoped();
				this.__importScoped(exported);
			} catch (e) {
				// We cannot upgrade the old version.
			}
		}
		Globals.set(Attach.__namespace, this);
		return this;
	},
	

	/**
	 * Detaches the Scoped system from the environment. 
	 * 
	 * @param {boolean} forceDetach Overwrite any attached scoped system by null.
	 * @return {object} the detached Scoped system
	 */
	detach: function (forceDetach/* : ?boolean */) {
		if (forceDetach)
			Globals.set(Attach.__namespace, null);
		if (typeof Attach.__revert != "undefined")
			Globals.set(Attach.__namespace, Attach.__revert);
		delete Attach.__revert;
		if (Attach.__exportBackup)
			this.__importScoped(Attach.__exportBackup);
		return this;
	},
	

	/**
	 * Exports an object as a module if possible. 
	 * 
	 * @param {object} mod a module object (optional, default is 'module')
	 * @param {object} object the object to be exported
	 * @param {boolean} forceExport overwrite potentially pre-existing exports
	 * @return {object} the Scoped system
	 */
	exports: function (mod, object, forceExport) {
		mod = mod || (typeof module != "undefined" ? module : null);
		if (typeof mod == "object" && mod && "exports" in mod && (forceExport || mod.exports == this || !mod.exports || Helper.isEmpty(mod.exports)))
			mod.exports = object || this;
		return this;
	}	

};}).call(this);

function newNamespace (opts/* : {tree ?: boolean, global ?: boolean, root ?: Object} */) {

	var options/* : {
		tree: boolean,
	    global: boolean,
	    root: Object
	} */ = {
		tree: typeof opts.tree === "boolean" ? opts.tree : false,
		global: typeof opts.global === "boolean" ? opts.global : false,
		root: typeof opts.root === "object" ? opts.root : {}
	};

	/*::
	type Node = {
		route: ?string,
		parent: ?Node,
		children: any,
		watchers: any,
		data: any,
		ready: boolean,
		lazy: any
	};
	*/

	function initNode(options)/* : Node */ {
		return {
			route: typeof options.route === "string" ? options.route : null,
			parent: typeof options.parent === "object" ? options.parent : null,
			ready: typeof options.ready === "boolean" ? options.ready : false,
			children: {},
			watchers: [],
			data: {},
			lazy: []
		};
	}
	
	var nsRoot = initNode({ready: true});
	
	if (options.tree) {
		if (options.global) {
			try {
				if (window)
					nsRoot.data = window;
			} catch (e) { }
			try {
				if (global)
					nsRoot.data = global;
			} catch (e) { }
			try {
				if (self)
					nsRoot.data = self;
			} catch (e) { }
		} else
			nsRoot.data = options.root;
	}
	
	function nodeDigest(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready) {
			nodeDigest(node.parent);
			return;
		}
		if (node.route && node.parent && (node.route in node.parent.data)) {
			node.data = node.parent.data[node.route];
			node.ready = true;
			for (var i = 0; i < node.watchers.length; ++i)
				node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
			node.watchers = [];
			for (var key in node.children)
				nodeDigest(node.children[key]);
		}
	}
	
	function nodeEnforce(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready)
			nodeEnforce(node.parent);
		node.ready = true;
		if (node.parent) {
			if (options.tree && typeof node.parent.data == "object")
				node.parent.data[node.route] = node.data;
		}
		for (var i = 0; i < node.watchers.length; ++i)
			node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
		node.watchers = [];
	}
	
	function nodeSetData(node/* : Node */, value) {
		if (typeof value == "object" && node.ready) {
			for (var key in value)
				node.data[key] = value[key];
		} else
			node.data = value;
		if (typeof value == "object") {
			for (var ckey in value) {
				if (node.children[ckey])
					node.children[ckey].data = value[ckey];
			}
		}
		nodeEnforce(node);
		for (var k in node.children)
			nodeDigest(node.children[k]);
	}
	
	function nodeClearData(node/* : Node */) {
		if (node.ready && node.data) {
			for (var key in node.data)
				delete node.data[key];
		}
	}
	
	function nodeNavigate(path/* : ?String */) {
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
	
	function nodeAddWatcher(node/* : Node */, callback, context) {
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
	
	function nodeUnresolvedWatchers(node/* : Node */, base, result) {
		node = node || nsRoot;
		result = result || [];
		if (!node.ready && node.lazy.length === 0 && node.watchers.length > 0)
			result.push(base);
		for (var k in node.children) {
			var c = node.children[k];
			var r = (base ? base + "." : "") + c.route;
			result = nodeUnresolvedWatchers(c, r, result);
		}
		return result;
	}

	/** 
	 * The namespace module manages a namespace in the Scoped system.
	 * 
	 * @module Namespace
	 * @access public
	 */
	return {
		
		/**
		 * Extend a node in the namespace by an object.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used for extend the namespace node
		 */
		extend: function (path, value) {
			nodeSetData(nodeNavigate(path), value);
		},
		
		/**
		 * Set the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used as value for the namespace node
		 */
		set: function (path, value) {
			var node = nodeNavigate(path);
			if (node.data)
				nodeClearData(node);
			nodeSetData(node, value);
		},
		
		/**
		 * Read the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {object} object value of the node or null if undefined
		 */
		get: function (path) {
			var node = nodeNavigate(path);
			return node.ready ? node.data : null;
		},
		
		/**
		 * Lazily navigate to a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being touched.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
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
		
		/**
		 * Digest a node path, checking whether it has been defined by an external system.
		 * 
		 * @param {string} path path to the node in the namespace
		 */
		digest: function (path) {
			nodeDigest(nodeNavigate(path));
		},
		
		/**
		 * Asynchronously access a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being defined.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
		obtain: function (path, callback, context) {
			nodeAddWatcher(nodeNavigate(path), callback, context);
		},
		
		/**
		 * Returns all unresolved watchers under a certain path.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {array} list of all unresolved watchers 
		 */
		unresolvedWatchers: function (path) {
			return nodeUnresolvedWatchers(nodeNavigate(path), path);
		},
		
		__export: function () {
			return {
				options: options,
				nsRoot: nsRoot
			};
		},
		
		__import: function (data) {
			options = data.options;
			nsRoot = data.nsRoot;
		}
		
	};
	
}
function newScope (parent, parentNS, rootNS, globalNS) {
	
	var self = this;
	var nextScope = null;
	var childScopes = [];
	var parentNamespace = parentNS;
	var rootNamespace = rootNS;
	var globalNamespace = globalNS;
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
                var _arguments = [];
                for (var a = 0; a < arguments.length; ++a)
                    _arguments.push(arguments[a]);
                _arguments[_arguments.length - 1].ns = ns;
				if (this.options.compile) {
					var params = [];
					for (var i = 0; i < argmts.length; ++i)
						params.push(Helper.stringify(argmts[i]));
					this.compiled += this.options.ident + "." + name + "(" + params.join(", ") + ");\n\n";
				}
				if (this.options.dependencies) {
					this.dependencies[ns.path] = this.dependencies[ns.path] || {};
					if (args.dependencies) {
						args.dependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
					if (args.hiddenDependencies) {
						args.hiddenDependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
				}
				var result = this.options.compile ? {} : args.callback.apply(args.context || this, _arguments);
				callback.call(this, ns, result);
			}, this);
		};
		
		if (options.lazy)
			ns.namespace.lazy(ns.path, execute, this);
		else
			execute.apply(this);

		return this;
	};
	
	/** 
	 * This module provides all functionality in a scope.
	 * 
	 * @module Scoped
	 * @access public
	 */
	return {
		
		getGlobal: Helper.method(Globals, Globals.getPath),
		setGlobal: Helper.method(Globals, Globals.setPath),
		
		options: {
			lazy: false,
			ident: "Scoped",
			compile: false,
			dependencies: false
		},
		
		compiled: "",
		
		dependencies: {},
		
		
		/**
		 * Returns a reference to the next scope that will be obtained by a subScope call.
		 * 
		 * @return {object} next scope
		 */
		nextScope: function () {
			if (!nextScope)
				nextScope = newScope(this, localNamespace, rootNamespace, globalNamespace);
			return nextScope;
		},
		
		/**
		 * Creates a sub scope of the current scope and returns it.
		 * 
		 * @return {object} sub scope
		 */
		subScope: function () {
			var sub = this.nextScope();
			childScopes.push(sub);
			nextScope = null;
			return sub;
		},
		
		/**
		 * Creates a binding within in the scope. 
		 * 
		 * @param {string} alias identifier of the new binding
		 * @param {string} namespaceLocator identifier of an existing namespace path
		 * @param {object} options options for the binding
		 * 
		 */
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
		
		
		/**
		 * Resolves a name space locator to a name space.
		 * 
		 * @param {string} namespaceLocator name space locator
		 * @return {object} resolved name space
		 * 
		 */
		resolve: function (namespaceLocator) {
			var parts = namespaceLocator.split(":");
			if (parts.length == 1) {
                throw ("The locator '" + parts[0] + "' requires a namespace.");
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

		
		/**
		 * Defines a new name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new definition
		 * @param {object} context a callback context (optional)
		 * 
		 */
		define: function () {
			return custom.call(this, arguments, "define", function (ns, result) {
				if (ns.namespace.get(ns.path))
					throw ("Scoped namespace " + ns.path + " has already been defined. Use extend to extend an existing namespace instead");
				ns.namespace.set(ns.path, result);
			});
		},
		
		
		/**
		 * Assume a specific version of a module and fail if it is not met.
		 * 
		 * @param {string} assumption name space locator
		 * @param {string} version assumed version
		 * 
		 */
		assumeVersion: function () {
			var args = Helper.matchArgs(arguments, {
				assumption: true,
				dependencies: "array",
				callback: true,
				context: "object",
				error: "string"
			});
			var dependencies = args.dependencies || [];
			dependencies.unshift(args.assumption);
			this.require(dependencies, function () {
				var argv = arguments;
				var assumptionValue = argv[0].replace(/[^\d\.]/g, "");
				argv[0] = assumptionValue.split(".");
				for (var i = 0; i < argv[0].length; ++i)
					argv[0][i] = parseInt(argv[0][i], 10);
				if (Helper.typeOf(args.callback) === "function") {
					if (!args.callback.apply(args.context || this, args))
						throw ("Scoped Assumption '" + args.assumption + "' failed, value is " + assumptionValue + (args.error ? ", but assuming " + args.error : ""));
				} else {
					var version = (args.callback + "").replace(/[^\d\.]/g, "").split(".");
					for (var j = 0; j < Math.min(argv[0].length, version.length); ++j)
						if (parseInt(version[j], 10) > argv[0][j])
							throw ("Scoped Version Assumption '" + args.assumption + "' failed, value is " + assumptionValue + ", but assuming at least " + args.callback);
				}
			});
		},
		
		
		/**
		 * Extends a potentiall existing name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new additional definitions.
		 * @param {object} context a callback context (optional)
		 * 
		 */
		extend: function () {
			return custom.call(this, arguments, "extend", function (ns, result) {
				ns.namespace.extend(ns.path, result);
			});
		},
				
		
		/**
		 * Requires a list of name space locators and calls a function once they are present.
		 * 
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments
		 * @param {object} context a callback context (optional)
		 * 
		 */
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

		
		/**
		 * Digest a name space locator, checking whether it has been defined by an external system.
		 * 
		 * @param {string} namespaceLocator name space locator
		 */
		digest: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			ns.namespace.digest(ns.path);
			return this;
		},
		
		
		/**
		 * Returns all unresolved definitions under a namespace locator
		 * 
		 * @param {string} namespaceLocator name space locator, e.g. "global:"
		 * @return {array} list of all unresolved definitions 
		 */
		unresolved: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			return ns.namespace.unresolvedWatchers(ns.path);
		},
		
		/**
		 * Exports the scope.
		 * 
		 * @return {object} exported scope
		 */
		__export: function () {
			return {
				parentNamespace: parentNamespace.__export(),
				rootNamespace: rootNamespace.__export(),
				globalNamespace: globalNamespace.__export(),
				localNamespace: localNamespace.__export(),
				privateNamespace: privateNamespace.__export()
			};
		},
		
		/**
		 * Imports a scope from an exported scope.
		 * 
		 * @param {object} data exported scope to be imported
		 * 
		 */
		__import: function (data) {
			parentNamespace.__import(data.parentNamespace);
			rootNamespace.__import(data.rootNamespace);
			globalNamespace.__import(data.globalNamespace);
			localNamespace.__import(data.localNamespace);
			privateNamespace.__import(data.privateNamespace);
		}
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, (function () {  
/** 
 * This module includes all public functions of the Scoped system.
 * 
 * It includes all methods of the root scope and the Attach module.
 * 
 * @module Public
 * @access public
 */
return {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '0.0.19',
		
	upgrade: Attach.upgrade,
	attach: Attach.attach,
	detach: Attach.detach,
	exports: Attach.exports,
	
	/**
	 * Exports all data contained in the Scoped system.
	 * 
	 * @return data of the Scoped system.
	 * @access private
	 */
	__exportScoped: function () {
		return {
			globalNamespace: globalNamespace.__export(),
			rootNamespace: rootNamespace.__export(),
			rootScope: rootScope.__export()
		};
	},
	
	/**
	 * Import data into the Scoped system.
	 * 
	 * @param data of the Scoped system.
	 * @access private
	 */
	__importScoped: function (data) {
		globalNamespace.__import(data.globalNamespace);
		rootNamespace.__import(data.rootNamespace);
		rootScope.__import(data.rootScope);
	}
	
};

}).call(this));

Public = Public.upgrade();
Public.exports();
	return Public;
}).call(this);
/*!
betajs-media - v0.0.118 - 2019-05-20
Copyright (c) Ziggeo,Oliver Friedmann,Rashad Aliyev
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.Media');
Scoped.binding('base', 'global:BetaJS');
Scoped.binding('browser', 'global:BetaJS.Browser');
Scoped.binding('flash', 'global:BetaJS.Flash');
Scoped.define("module:", function () {
	return {
    "guid": "8475efdb-dd7e-402e-9f50-36c76945a692",
    "version": "0.0.118",
    "datetime": 1558382220813
};
});
Scoped.assumeVersion('base:version', '~1.0.136');
Scoped.assumeVersion('browser:version', '~1.0.61');
Scoped.assumeVersion('flash:version', '~0.0.18');
Scoped.define("module:AudioPlayer.AudioPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "browser:Events"
], function(OptimisticConditionalInstance, EventsMixin, Types, Objs, Strings, DomEvents, scoped) {
    return OptimisticConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options, transitionals) {
                inherited.constructor.call(this);
                options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
                var sources = options.source || options.sources || [];
                if (Types.is_string(sources))
                    sources = sources.split(" ");
                else if (!Types.is_array(sources))
                    sources = [sources];
                var sourcesMapped = [];
                Objs.iter(sources, function(source) {
                    if (Types.is_string(source))
                        source = {
                            src: source.trim()
                        };
                    else if (typeof Blob !== 'undefined' && source instanceof Blob)
                        source = {
                            src: source
                        };
                    if (source.ext && !source.type)
                        source.type = "audio/" + source.ext;
                    if (!source.ext && source.type)
                        source.ext = Strings.last_after(source.type, "/");
                    if (!source.ext && !source.type && Types.is_string(source.src)) {
                        var temp = Strings.splitFirst(source.src, "?").head;
                        if (temp.indexOf(".") >= 0) {
                            source.ext = Strings.last_after(temp, ".");
                            source.type = "audio/" + source.ext;
                        }
                    }
                    if (source.ext)
                        source.ext = source.ext.toLowerCase();
                    if (source.type)
                        source.type = source.type.toLowerCase();
                    if (typeof Blob !== 'undefined' && source.src instanceof Blob)
                        source.src = (window.URL || window.webkitURL).createObjectURL(source.src);
                    sourcesMapped.push(source);
                }, this);
                this._sources = sourcesMapped;
                this._element = options.element;
                this._preload = options.preload || false;
                this._reloadonplay = options.reloadonplay || false;
                this._options = options;
                this._loop = options.loop || false;
                this._loaded = false;
                this._error = 0;
                this._domEvents = new DomEvents();
            },

            destroy: function() {
                this._domEvents.destroy();
                inherited.destroy.call(this);
            },

            sources: function() {
                return this._sources;
            },

            loaded: function() {
                return this._loaded;
            },

            buffered: function() {},

            _eventLoaded: function() {
                this._loaded = true;
                this.trigger("loaded");
            },

            _eventPlaying: function() {
                if (!this._loaded)
                    this._eventLoaded();
                this.trigger("playing");
            },

            _eventPaused: function() {
                this.trigger("paused");
            },

            _eventEnded: function() {
                this.trigger("ended");
            },

            _eventError: function(error) {
                this._error = error;
                this.trigger("error", error);
            },

            duration: function() {
                return this._element.duration;
            },

            position: function() {
                return this._element.currentTime;
            },

            error: function() {
                return this._error;
            },

            play: function() {
                if (this._reloadonplay)
                    this._element.load();
                this._reloadonplay = false;
                this._element.play();
            },

            pause: function() {
                this._element.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
            },

            muted: function() {
                return this._element.muted;
            },

            setMuted: function(muted) {
                this._element.muted = muted;
            },

            volume: function() {
                return this._element.volume;
            },

            setVolume: function(volume) {
                this._element.volume = volume;
            }

        };
    }], {

        ERROR_NO_PLAYABLE_SOURCE: 1,
        ERROR_FLASH_NOT_INSTALLED: 2

    });
});


Scoped.define("module:AudioPlayer.Html5AudioPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "browser:Dom",
    "browser:Events"
], function(AudioPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, Dom, DomEvents, scoped) {
    return AudioPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.nohtml5)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)
                    return Promise.error(true);
                if (this._options.forceflash)
                    return Promise.error(true);
                var self = this;
                var promise = Promise.create();
                this._element.innerHTML = "";
                var sources = this.sources();
                var ie9 = (Info.isInternetExplorer() && Info.internetExplorerVersion() == 9) || Info.isWindowsPhone();
                if (this._element.tagName.toLowerCase() !== "audio") {
                    this._element = Dom.changeTag(this._element, "audio");
                    this._transitionals.element = this._element;
                } else if (ie9) {
                    var str = Strings.splitLast(this._element.outerHTML, "</audio>").head;
                    Objs.iter(sources, function(source) {
                        str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
                    });
                    str += "</audio>";
                    var replacement = Dom.elementByTemplate(str);
                    Dom.elementInsertAfter(replacement, this._element);
                    this._element.parentNode.removeChild(this._element);
                    this._element = replacement;
                    this._transitionals.element = this._element;
                }
                if (Info.isSafari() && Info.safariVersion() < 6) {
                    this._element.src = sources[0].src;
                    this._preload = true;
                }
                /*
                var loadevent = "loadedmetadata";
                if (Info.isSafari() && Info.safariVersion() < 9)
                	loadevent = "loadstart";
                	*/
                var loadevent = "loadstart";
                this._domEvents.on(this._element, "loadevent", function() {
                    if ( /*loadevent === "loadstart" && */ this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                        promise.asyncError(true);
                        return;
                    }
                    promise.asyncSuccess(true);
                }, this);
                var nosourceCounter = 10;
                var timer = new Timer({
                    context: this,
                    fire: function() {
                        if (this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                            nosourceCounter--;
                            if (nosourceCounter <= 0)
                                promise.asyncError(true);
                        } else if (this._element.networkState === this._element.NETWORK_IDLE)
                            promise.asyncSuccess(true);
                        else if (this._element.networkState === this._element.NETWORK_LOADING) {
                            if (Info.isEdge() || Info.isInternetExplorer())
                                promise.asyncSuccess(true);
                            else if (Info.isFirefox() && sources[0].src.indexOf("blob:") === 0)
                                promise.asyncSuccess(true);
                        }
                    },
                    delay: 50
                });
                this._element.preload = this._preload ? "auto" : "none";
                if (this._loop)
                    this._element.loop = "loop";
                var errorCount = 0;
                var errorEvents = new DomEvents();
                if (!ie9) {
                    Objs.iter(sources, function(source) {
                        var sourceEl = document.createElement("source");
                        if (source.type)
                            sourceEl.type = source.type;
                        this._element.appendChild(sourceEl);
                        errorEvents.on(sourceEl, "error", function() {
                            errorCount++;
                            if (errorCount === sources.length)
                                promise.asyncError(true);
                        });
                        sourceEl.src = source.src;
                    }, this);
                } else {
                    var sourceEls = this._element.getElementsByTagName("SOURCE");
                    var cb = function() {
                        errorCount++;
                        if (errorCount === sources.length)
                            promise.asyncError(true);
                    };
                    for (var i = 0; i < sourceEls.length; ++i) {
                        errorEvents.on(sourceEls[i], "error", cb);
                    }
                }
                promise.callback(function() {
                    errorEvents.weakDestroy();
                    timer.destroy();
                }, this);
                promise.success(function() {
                    this._setup();
                }, this);
                try {
                    if (!Info.isChrome())
                        this._element.load();
                } catch (e) {}
                return promise;
            },

            destroy: function() {
                if (!Info.isInternetExplorer() || Info.internetExplorerVersion() > 8)
                    this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = false;
                this._domEvents.on(this._element, "canplay", this._eventLoaded, this);
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                var self = this;
                var sourceEls = this._element.getElementsByTagName("SOURCE");
                var cb = function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                };
                for (var i = 0; i < sourceEls.length; ++i) {
                    this._domEvents.on(sourceEls[i], "error", cb, this);
                }
                if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
                    if (this._element.networkState === this._element.NETWORK_LOADING) {
                        Async.eventually(function() {
                            if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
                                this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                        }, this, 10000);
                    }
                }
            },

            buffered: function() {
                return this._element.buffered.end(0);
            },

            play: function() {
                inherited.play.call(this);
            },

            pause: function() {
                this._element.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
            },

            muted: function() {
                return this._element.muted;
            },

            setMuted: function(muted) {
                this._element.muted = muted;
            },

            volume: function() {
                return this._element.volume;
            },

            setVolume: function(volume) {
                this._element.volume = volume;
            }

        };
    });
});


Scoped.define("module:AudioPlayer.FlashPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "module:AudioPlayer.FlashPlayer",
    "browser:Info",
    "base:Promise",
    "browser:Dom"
], function(AudioPlayerWrapper, FlashPlayer, Info, Promise, Dom, scoped) {
    return AudioPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.noflash)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isMobile() || !Info.flash().supported())
                    return Promise.error(true);
                if (!Info.flash().installed() && this._options.flashinstallrequired)
                    return Promise.error(true);
                if (!Info.flash().installed()) {
                    this._eventError(this.cls.ERROR_NO_FLASH_INSTALLED);
                    return Promise.value(true);
                }
                var self = this;
                var promise = Promise.create();
                if (this._element.tagName.toLowerCase() !== "div") {
                    this._element = Dom.changeTag(this._element, "div");
                    this._transitionals.element = this._element;
                }
                var opts = {
                    sources: this.sources()
                };
                if (this._loop)
                    opts.loop = true;
                this._flashPlayer = new FlashPlayer(this._element, opts);
                return this._flashPlayer.ready.success(function() {
                    this._setup();
                }, this);
            },

            destroy: function() {
                if (this._flashPlayer)
                    this._flashPlayer.weakDestroy();
                this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = true;
                this._eventLoaded();
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                this._domEvents.on(this._element, "audioerror", function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                }, this);
            },

            position: function() {
                return this._element.get("currentTime");
            },

            buffered: function() {
                return this.position();
            },

            setPosition: function(position) {
                this._element.set("currentTime", position);
            },

            setVolume: function(volume) {
                this._element.set("volume", volume);
            }

        };
    });
});



Scoped.extend("module:AudioPlayer.AudioPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "module:AudioPlayer.Html5AudioPlayerWrapper"
], function(AudioPlayerWrapper, Html5AudioPlayerWrapper) {
    AudioPlayerWrapper.register(Html5AudioPlayerWrapper, 2);
    return {};
});


Scoped.extend("module:AudioPlayer.AudioPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "module:AudioPlayer.FlashPlayerWrapper"
], function(AudioPlayerWrapper, FlashPlayerWrapper) {
    AudioPlayerWrapper.register(FlashPlayerWrapper, 1);
    return {};
});
Scoped.define("module:AudioPlayer.FlashPlayer", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Promise"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Promise, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._source = this.__preferedSource();
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false
                }));
                this._flashObjs = {};
                this._flashData = {
                    status: 'idle'
                };
                this.ready = Promise.create();
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __preferedSource: function() {
                var preferred = [".mp3", ".ogg", ".aac"];
                var sources = [];
                if (this.readAttr("src") || this.readAttr("source") || this.readAttr("sources")) {
                    var src = this.readAttr("src") || this.readAttr("source") || this.readAttr("sources");
                    if (Types.is_array(src))
                        sources = src;
                    else
                        sources.push(src);
                }
                var element = this._element;
                if (!(Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)) {
                    for (var i = 0; i < this._element.childNodes.length; ++i) {
                        if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
                            sources.push(element.childNodes[i].src.toLowerCase());
                    }
                } else {
                    var current = this._element;
                    while (true) {
                        var next = current.nextSibling;
                        if (!next || !next.tagName || next.tagName.toLowerCase() != "source")
                            break;
                        sources.push(next.src.toLowerCase());
                        current = next;
                    }
                }
                sources = Objs.map(sources, function(source) {
                    return source.src || source;
                });
                var source = sources[0];
                var currentExtIndex = preferred.length - 1;
                for (var k = sources.length - 1; k >= 0; --k) {
                    for (var j = 0; j <= currentExtIndex; ++j) {
                        if (Strings.ends_with(sources[k], preferred[j])) {
                            source = sources[k];
                            currentExtIndex = j;
                            break;
                        }
                    }
                }
                if (source.indexOf("://") == -1)
                    source = document.location.href + "/../" + source;

                return {
                    sourceUrl: source
                };
            },

            __initializeEmbedding: function() {
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.soundTransform = this._embedding.newObject("flash.media.SoundTransform");
                this._flashObjs.sound = this._embedding.newObject("flash.media.Sound");
                this._flashObjs.urlRequest = this._embedding.newObject("flash.net.URLRequest", this._source.sourceUrl);
                this._flashObjs.sound.addEventListener("complete", this._embedding.newCallback(Functions.as_method(this.__requestComplete, this)));
                this._flashObjs.sound.loadVoid(this._flashObjs.urlRequest);
            },

            __requestComplete: function() {
                this._element.duration = this._flashObjs.sound.length;
                this.writeAttr("volume", 1.0);
                if (this.hasAttr("muted")) {
                    this._flashObjs.soundTransform.set("volume", 0.0);
                    this.writeAttr("volume", 0.0);
                }
                this.__lastPosition = 0;
                this.__paused = false;
                this.__playing = false;
                if (this.hasAttr("autoplay"))
                    this._element.play();
                this.ready.asyncSuccess(this);
            },

            _domMethods: ["play", "pause", "load"],

            _domAttrs: {
                "volume": {
                    set: "_setVolume"
                },
                "currentTime": {
                    get: "_getCurrentTime",
                    set: "_setCurrentTime"
                }
            },

            load: function() {},

            play: function() {
                if (this.__playing)
                    return;
                this.__playing = true;
                this.__paused = false;
                this._flashObjs.soundChannel = this._flashObjs.sound.play(this.__lastPosition, 0, this._flashObjs.soundTransform);
                this._flashObjs.soundChannel.addEventListener("soundComplete", this._embedding.newCallback(Functions.as_method(this.__soundComplete, this)));
                this.domEvent("playing");
            },

            pause: function() {
                if (!this.__playing || this.__paused)
                    return;
                this.__lastPosition = this._flashObjs.soundChannel.get("position");
                this.__playing = false;
                this.__paused = true;
                this._flashObjs.soundChannel.stop();
                this._flashObjs.soundChannel.destroy();
                this.domEvent("pause");
            },

            _setVolume: function(volume) {
                this._flashObjs.soundTransform.set("volume", volume);
                this.domEvent("volumechange");
            },

            _getCurrentTime: function() {
                return this.__playing ? this._flashObjs.soundTransform.get("position") : this.__lastPosition;
            },

            _setCurrentTime: function(time) {
                if (this.__playing)
                    this._flashObjs.soundTransform.set("position", time);
                else
                    this.__lastPosition = time;
            },

            __soundComplete: function() {
                this.__lastPosition = 0;
                this.__playing = false;
                this.__paused = false;
                this._flashObjs.soundChannel.destroy();
                this.domEvent("ended");
            }

        };
    }, {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Sound", ["load", "play", "addEventListener"]);
                this.__flashRegistry.register("flash.media.SoundChannel", ["stop", "addEventListener"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.display.Stage", []);

                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
            }
            return this.__flashRegistry;
        },

        polyfill: function(element, polyfilltag, force, eventual) {
            if (eventual) {
                var promise = Promise.create();
                Async.eventually(function() {
                    promise.asyncSuccess(Cls.polyfill(element, polyfilltag, force));
                });
                return promise;
            }
            if (element.tagName.toLowerCase() != "audio" || !("networkState" in element))
                return Cls.attach(element);
            else if (element.networkState == element.NETWORK_NO_SOURCE || force)
                return Cls.attach(Dom.changeTag(element, polyfilltag || "audiopoly"));
            return element;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }

    });
    return Cls;
});


// https://help.adobe.com/en_US/ActionScript/3.0_ProgrammingAS3/WS5b3ccc516d4fbf351e63e3d118a9b90204-7d12.html
Scoped.define("module:AudioRecorder.AudioRecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise"
], function(ConditionalInstance, EventsMixin, Objs, Promise, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._element = this._options.element;
                this.ready = Promise.create();
            },

            destroy: function() {
                inherited.destroy.call(this);
            },

            bindMedia: function() {
                return this._bindMedia();
            },

            _bindMedia: function() {},

            unbindMedia: function() {
                return this._unbindMedia();
            },

            _unbindMedia: function() {},

            softwareDependencies: function() {
                return this._softwareDependencies();
            },

            _softwareDependencies: function() {},

            soundLevel: function() {},
            testSoundLevel: function(activate) {},

            getVolumeGain: function() {},
            setVolumeGain: function(volumeGain) {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},

            startRecord: function(options) {},
            stopRecord: function(options) {},

            isFlash: function() {
                return false;
            },

            isWebrtcStreaming: function() {
                return false;
            },

            supportsLocalPlayback: function() {
                return false;
            },

            localPlaybackSource: function() {
                return null;
            },

            recordDelay: function(opts) {
                return 0;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                recordVideo: false,
                recordAudio: true
            }, options);
        }

    });
});


Scoped.define("module:AudioRecorder.WebRTCAudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "module:WebRTC.AudioAnalyser",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(AudioRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Info, Time, Objs, FileUploader, MultiUploader, Promise, scoped) {
    return AudioRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "audio")
                    this._element = Dom.changeTag(this._element, "audio");
                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    recordVideo: false,
                    recordAudio: this._options.recordAudio,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming,
                    webrtcStreamingIfNecessary: this._options.webrtcStreamingIfNecessary,
                    localPlaybackRequested: this._options.localPlaybackRequested
                });
                this._recorder.on("bound", function() {
                    if (this._analyser)
                        this.testSoundLevel(true);
                }, this);
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
                if (this._analyser)
                    this._analyser.weakDestroy();
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            recordDelay: function(opts) {
                return this._recorder.recordDelay(opts);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia();
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            soundLevel: function() {
                if (!this._analyser && this._recorder && this._recorder.stream())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
                return this._analyser ? this._analyser.soundLevel() : 0.0;
            },

            isWebrtcStreaming: function() {
                return this._recorder.isWebrtcStreaming();
            },

            testSoundLevel: function(activate) {
                if (this._analyser) {
                    this._analyser.weakDestroy();
                    delete this._analyser;
                }
                if (activate)
                    this._analyser = new AudioAnalyser(this._recorder.stream());
            },

            currentDevices: function() {
                return {
                    audio: this._currentAudio
                };
            },

            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {
                    if (!this._currentAudio)
                        this._currentAudio = Objs.ithKey(result.audio);
                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            startRecord: function(options) {
                this.__localPlaybackSource = null;
                return this._recorder.startRecord(options);
            },

            stopRecord: function(options) {
                var promise = Promise.create();
                this._recorder.once("data", function(videoBlob, audioBlob, noUploading) {
                    this.__localPlaybackSource = {
                        src: audioBlob || videoBlob
                    };
                    var multiUploader = new MultiUploader();
                    if (!this._options.simulate && !noUploading) {
                        if (videoBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: audioBlob || videoBlob
                            }, options.audio)));
                        }
                    }
                    promise.asyncSuccess(multiUploader);
                }, this);
                this._recorder.stopRecord();
                return promise;
            },

            supportsLocalPlayback: function() {
                return !!this.__localPlaybackSource.src;
            },

            localPlaybackSource: function() {
                return this.__localPlaybackSource;
            },

            _softwareDependencies: function() {
                return Promise.value(true);
            }

        };
    }, {

        supported: function(options) {
            if (options.forceflash)
                return false;
            if (!RecorderWrapper.anySupport(options))
                return false;
            return true;
        }

    });
});



Scoped.define("module:AudioRecorder.FlashAudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:Flash.FlashAudioRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(AudioRecorderWrapper, FlashAudioRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return AudioRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashAudioRecorder(this._element, {
                    microphonecodec: this._options.rtmpMicrophoneCodec,
                    audioRate: this._options.audioBitrate ? Math.floor(this._options.audioBitrate / 1000) : undefined
                });
                this._recorder.ready.forwardCallback(this.ready);
                this._recorder.on("require_display", function() {
                    this.trigger("require_display");
                }, this);
                this._recorder.on("endpoint_connectivity", function(endpoint, connectivity) {
                    this.trigger("endpoint_connectivity", endpoint, connectivity);
                }, this);
            },

            destroy: function() {
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia(this._options.flashFullSecurityDialog);
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            soundLevel: function() {
                var sl = this._recorder.soundLevel();
                return sl <= 1 ? 1.0 : (1.0 + (sl - 1) / 100);
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            testSoundLevel: function(activate) {
                this._recorder.testSoundLevel(activate);
            },

            enumerateDevices: function() {
                var result = this._recorder.enumerateDevices();
                return Promise.value({
                    audioCount: Objs.count(result.audios),
                    audio: Objs.map(result.audios, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            },

            currentDevices: function() {
                return {
                    audio: this._recorder.currentMicrophone()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            startRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(true);
                var self = this;
                var ctx = {};
                var promise = Promise.create();
                this._recorder.on("recording", function() {
                    promise.asyncSuccess();
                    self._recorder.off(null, null, ctx);
                }, ctx).on("error", function(s) {
                    promise.asyncError(s);
                    self._recorder.off(null, null, ctx);
                }, ctx);
                this._recorder.startRecord(options.rtmp);
                return promise;
            },

            stopRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(new MultiUploader());
                var self = this;
                var ctx = {};
                var uploader = new CustomUploader();
                var timer = null;
                timer = new Timer({
                    delay: 100,
                    context: this,
                    fire: function() {
                        if (!this._recorder || this._recorder.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        var status = this._recorder.uploadStatus();
                        uploader.progressCallback(status.total - status.remaining, status.total);
                    }
                });
                this._recorder.on("finished", function() {
                    uploader.successCallback(true);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx).on("error", function(s) {
                    uploader.errorCallback(s);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx);
                this._recorder.stopRecord();
                return Promise.create(uploader);
            },

            isFlash: function() {
                return true;
            },

            _softwareDependencies: function() {
                return Info.flash().installed() ? Promise.value(true) : Promise.error([{
                    "title": "Adobe Flash",
                    "execute": function() {
                        window.open("https://get.adobe.com/flashplayer");
                    }
                }]);
            }

        };
    }, {

        supported: function(options) {
            return !Info.isMobile() && !options.noflash && Info.flash().supported() && !options.screen;
        }

    });
});


Scoped.extend("module:AudioRecorder.AudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:AudioRecorder.WebRTCAudioRecorderWrapper"
], function(AudioRecorderWrapper, WebRTCAudioRecorderWrapper) {
    AudioRecorderWrapper.register(WebRTCAudioRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:AudioRecorder.AudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:AudioRecorder.FlashAudioRecorderWrapper"
], function(AudioRecorderWrapper, FlashAudioRecorderWrapper) {
    AudioRecorderWrapper.register(FlashAudioRecorderWrapper, 1);
    return {};
});
Scoped.define("module:Flash.FlashAudioRecorder", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Timers.Timer",
    "base:Time",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, Promise, EventsMixin, PixelSampleMixin, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false,
                    hasEmbedding: this.readAttr("hasembedding") || false,
                    namespace: this.readAttr("embednamespace") || null
                }, {
                    parentBgcolor: true,
                    fixHalfPixels: true
                }));
                this._flashObjs = {};
                this.ready = Promise.create();
                this.__status = "idle";
                this.__audioRate = this.readAttr('audiorate') || 44;
                this.__audioQuality = this.readAttr('audioquality') || 10;
                this.__microphoneCodec = this.readAttr("microphonecodec") || 'speex';
                this.__defaultGain = 55;
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __initializeEmbedding: function() {
                this.__hasMicrophoneActivity = false;
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
                this._flashObjs.microphone = !Types.is_empty(this._flashObjs.Microphone.get('names').length > 0) ? this._flashObjs.Microphone.getMicrophone(0) : null;
                this.setMicrophoneProfile();
                this._currentMicrophone = 0;
                this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
                this.ready.asyncSuccess(this);
                this.auto_destroy(new Timer({
                    delay: 100,
                    fire: this._fire,
                    context: this
                }));
            },

            isAccessGranted: function() {
                try {
                    return (!this._flashObjs.microphone || !this._flashObjs.microphone.get('muted'));
                } catch (e) {
                    return false;
                }
            },

            isSecurityDialogOpen: function() {
                var dummy = this._embedding.newObject("flash.display.BitmapData", 1, 1);
                var open = false;
                try {
                    dummy.draw(this._flashObjs.stage);
                } catch (e) {
                    open = true;
                }
                dummy.dispose();
                dummy.destroy();
                return open;
            },

            openSecurityDialog: function(fullSecurityDialog) {
                this.trigger("require_display");
                this._flashObjs.Security.showSettings("privacy");
            },

            grantAccess: function(fullSecurityDialog, allowDeny) {
                var promise = Promise.create();
                var timer = new Timer({
                    fire: function() {
                        if (this.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        if (this.isSecurityDialogOpen())
                            return;
                        if (this.isAccessGranted()) {
                            timer.destroy();
                            promise.asyncSuccess(true);
                        } else {
                            if (allowDeny) {
                                timer.destroy();
                                promise.asyncError(true);
                            } else
                                this.openSecurityDialog(fullSecurityDialog);
                        }
                    },
                    context: this,
                    delay: 10,
                    start: true
                });
                return promise;
            },

            bindMedia: function(fullSecurityDialog, allowDeny) {
                return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function() {
                    this._mediaBound = true;
                }, this);
            },

            unbindMedia: function() {
                this._mediaBound = false;
            },

            enumerateDevices: function() {
                return {
                    audios: this._flashObjs.Microphone.get('names')
                };
            },

            selectMicrophone: function(index) {
                if (this._flashObjs.microphone)
                    this._flashObjs.microphone.weakDestroy();
                this.__hasMicrophoneActivity = false;
                this.__microphoneActivityTime = null;
                this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(index);
                this._currentMicrophone = index;
                this.setMicrophoneProfile(this._currentMicrophoneProfile);
            },

            currentMicrophone: function() {
                return this._currentMicrophone;
            },

            microphoneInfo: function() {
                return this._flashObjs.microphone ? {
                    muted: this._flashObjs.microphone.get("muted"),
                    name: this._flashObjs.microphone.get("name"),
                    activityLevel: this._flashObjs.microphone.get("activityLevel"),
                    gain: this._flashObjs.microphone.get("gain"),
                    rate: this._flashObjs.microphone.get("rate"),
                    encodeQuality: this._flashObjs.microphone.get("encodeQuality"),
                    codec: this._flashObjs.microphone.get("codec"),
                    hadActivity: this.__hadMicrophoneActivity,
                    inactivityTime: this.__microphoneActivityTime ? Time.now() - this.__microphoneActivityTime : null
                } : {};
            },

            setMicrophoneProfile: function(profile) {
                if (!this._flashObjs.microphone)
                    return;
                profile = profile || {};
                this._flashObjs.microphone.setLoopBack(profile.loopback || false);
                this._flashObjs.microphone.set("gain", profile.gain || this.__defaultGain);
                this._flashObjs.microphone.setSilenceLevel(profile.silenceLevel || 0);
                this._flashObjs.microphone.setUseEchoSuppression(profile.echoSuppression || false);
                this._flashObjs.microphone.set("rate", profile.rate || this.__audioRate);
                this._flashObjs.microphone.set("encodeQuality", profile.encodeQuality || this.__audioQuality);
                this._flashObjs.microphone.set("codec", profile.codec || this.__microphoneCodec);
                this._currentMicrophoneProfile = profile;
            },

            getVolumeGain: function() {
                var gain = this._mediaBound ? this._flashObjs.micropone.get("gain") : 55;
                return gain / 55.0;
            },

            setVolumeGain: function(volumeGain) {
                this.__defaultGain = Math.min(Math.max(0, Math.round(volumeGain * 55)), 100);
                if (this._mediaBound && this._flashObjs.microphone)
                    this._flashObjs.microphone.set("gain", this.__defaultGain);
            },

            testSoundLevel: function(activate) {
                this.setMicrophoneProfile(activate ? {
                    loopback: true,
                    gain: 55,
                    silenceLevel: 100,
                    echoSuppression: true
                } : {});
            },

            soundLevel: function() {
                return this._flashObjs.microphone ? this._flashObjs.microphone.get("activityLevel") : 0;
            },

            _fire: function() {
                if (!this._mediaBound)
                    return;
                this.__hadMicrophoneActivity = this.__hadMicrophoneActivity || (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0);
                if (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0)
                    this.__microphoneActivityTime = Time.now();
            },

            _error: function(s) {
                this.__status = "error";
                this.trigger("error", s);
            },

            _status: function(s) {
                if (s && s !== this.__status) {
                    this.__status = s;
                    this.trigger("status", s);
                    this.trigger(s);
                }
                return this.__status;
            },

            __newCallback: function(endpoint, endpoints) {
                var active = true;
                var timer = null;
                var badEndpoint = function() {
                    clearTimeout(timer);
                    if (!active)
                        return;
                    active = false;
                    this.trigger("endpoint_connectivity", this.__endpoint, -1);
                    if (endpoints.length > 0) {
                        endpoint = endpoints.shift();
                        this._flashObjs.connection.closeVoid();
                        this._flashObjs.connection.destroy();
                        this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                        this._flashObjs.connection.addEventListener("netStatus", this.__newCallback(endpoint, endpoints));
                        this.__endpoint = endpoint;
                        this._flashObjs.connection.connectVoid(endpoint.serverUrl);
                    } else
                        this._error("Could not connect to server");
                };
                var self = this;
                timer = setTimeout(function() {
                    badEndpoint.call(self);
                }, 10000);
                return this._embedding.newCallback(Functions.as_method(function(event) {
                    if (!active)
                        return;
                    var code = event.get("info").code;
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'recording') {
                        active = false;
                        this._error("Connection to server interrupted.");
                        return;
                    }
                    if ((code === "NetConnection.Connect.Success" && this._status() !== 'connecting') ||
                        (code === "NetConnection.Connect.Closed" && this._status() === 'connecting') ||
                        (code === "NetConnection.Connect.Failed" && this._status() === 'connecting')) {
                        badEndpoint.call(this);
                        return;
                    }
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'uploading') {
                        this._status('finished');
                        return;
                    }
                    if (code === "NetConnection.Connect.Success" && this._status() === 'connecting') {
                        this.trigger("endpoint_connectivity", this.__endpoint, 1);
                        clearTimeout(timer);
                        this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
                        this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(function(event) {
                            var code = event.get("info").code;
                            if (code === "NetStream.Record.Start") {
                                this._status('recording');
                                return;
                            }
                            if (code === "NetStream.Play.StreamNotFound") {
                                this._flashObjs.stream.closeVoid();
                                if (this._status() !== "none")
                                    this._error("Stream not found");
                                return;
                            }
                            if (code === "NetStream.Unpublish.Success" ||
                                (this._status() === "uploading" && code === "NetStream.Buffer.Empty" &&
                                    this.__streamType === "flv" && this._flashObjs.stream.get('bufferLength') === 0)) {
                                this._flashObjs.stream.closeVoid();
                                this._flashObjs.stream.destroy();
                                this._flashObjs.stream = null;
                                this._flashObjs.connection.closeVoid();
                                this._flashObjs.connection.destroy();
                                this._flashObjs.connection = null;
                                this._status('finished');
                            }
                        }, this)));
                        this._flashObjs.stream.set("bufferTime", 120);
                        this._flashObjs.stream.attachAudioVoid(this._flashObjs.microphone);
                        this._flashObjs.stream.publish(endpoint.streamName, "record");
                    }
                }, this));
            },

            startRecord: function(endpoints) {
                if (arguments.length > 1) {
                    endpoints = {
                        serverUrl: endpoints,
                        streamName: arguments[1]
                    };
                }
                if (!Types.is_array(endpoints))
                    endpoints = [endpoints];
                this._status("connecting");
                var endpoint = endpoints.shift();
                var cb = this.__newCallback(endpoint, endpoints);
                this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                this._flashObjs.connection.addEventListener("netStatus", cb);
                this.__endpoint = endpoint;
                this._flashObjs.connection.connectVoid(endpoint.serverUrl);
            },

            stopRecord: function() {
                if (this._status() !== "recording")
                    return;
                this.__initialBufferLength = 0;
                this._status("uploading");
                this.__initialBufferLength = this._flashObjs.stream.get("bufferLength");
                try {
                    this._flashObjs.stream.attachAudioVoid(null);
                } catch (e) {}
                /*try {
                    if (this.__endpoint.serverUrl.indexOf("rtmpt") === 0) {
                        this._flashObjs.stream.publishVoid("null");
                        this._flashObjs.stream.closeVoid();
                    }
                } catch (e) {}*/
            },

            uploadStatus: function() {
                return {
                    total: this.__initialBufferLength,
                    remaining: this._flashObjs.stream.get("bufferLength")
                };
            }

        };
    }], {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Microphone", ["setLoopBack", "setSilenceLevel", "setUseEchoSuppression"], ["getMicrophone"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek", "attachAudio", "publish", "close"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener", "call", "close"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
            }
            return this.__flashRegistry;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});
Scoped.define("module:Encoding.WaveEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper"
], function(Promise, SchedulingHelper) {
    return {

        dumpInputBuffer: function(inputBuffer, audioChannels, bufferSize, offset) {
            return {
                left: new Float32Array(inputBuffer.getChannelData(0)),
                right: audioChannels > 1 ? new Float32Array(inputBuffer.getChannelData(1)) : null,
                offset: offset || 0,
                endOffset: bufferSize
            };
        },

        waveChannelTransform: function(dumpedInputBuffer, volume, schedulable, schedulableCtx) {
            var promise = Promise.create();
            var volumeFactor = 0x7FFF * (volume || 1);
            var offset = dumpedInputBuffer.offset;
            var endOffset = dumpedInputBuffer.endOffset;
            var left = dumpedInputBuffer.left;
            var right = dumpedInputBuffer.right;
            var result = new Int16Array((endOffset - offset) * (right ? 2 : 1));
            var resultOffset = 0;
            SchedulingHelper.schedulable(function(steps) {
                while (steps > 0) {
                    steps--;
                    if (offset >= endOffset) {
                        promise.asyncSuccess(result);
                        return true;
                    }
                    result[resultOffset] = left[offset] * volumeFactor;
                    resultOffset++;
                    if (right) {
                        result[resultOffset] = right[offset] * volumeFactor;
                        resultOffset++;
                    }
                    offset++;
                }
                return false;
            }, 100, schedulable, schedulableCtx);
            return promise;
        },

        generateHeader: function(totalSize, audioChannels, sampleRate, buffer) {
            buffer = buffer || new ArrayBuffer(44);
            var view = new DataView(buffer);
            view.writeUTFBytes = function(offset, string) {
                for (var i = 0; i < string.length; i++)
                    this.setUint8(offset + i, string.charCodeAt(i));
            };
            // RIFF chunk descriptor
            view.writeUTFBytes(0, 'RIFF');
            view.setUint32(4, 44 + totalSize, true);
            view.writeUTFBytes(8, 'WAVE');
            // FMT sub-chunk
            view.writeUTFBytes(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            // stereo (2 channels)
            view.setUint16(22, audioChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 4, true);
            view.setUint16(32, audioChannels * 2, true);
            view.setUint16(34, 16, true);
            // data sub-chunk
            view.writeUTFBytes(36, 'data');
            view.setUint32(40, totalSize, true);
            return buffer;
        }

    };
});

/*
Scoped.define("module:Encoding.WaveEncoder.InputBufferDataTransformer", [
	"module:Encoding.WaveEncoder.Support",
	"base:Packetizer.DataTransformer"
], function (Support, DataTransformer, scoped) {
	return DataTransformer.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (audioChannels, bufferSize) {
				inherited.constructor.call(this);
				this.__audioChannels = audioChannels;
				this.__bufferSize = bufferSize;
			},
			
			_consume: function (inputBuffer, packetNumber) {
				this._produce(Support.dumpInputBuffer(inputBuffer, this.__audioChannels, this.__bufferSize), packetNumber);
			}
						
		};
	});
});


Scoped.define("module:Encoding.WaveEncoder.WaveChannelDataTransformer", [
 	"module:Encoding.WaveEncoder.Support",
 	"base:Packetizer.DataTransformer",
 	"base:Scheduling.SchedulableMixin"
], function (Support, DataTransformer, SchedulableMixin, scoped) {
 	return DataTransformer.extend({scoped: scoped}, [SchedulableMixin, function (inherited) {
 		return {
 			
			constructor: function (volume) {
				inherited.constructor.call(this);
				this.__volume = volume || 1;
			},

			_consume: function (data, packetNumber) {
				Support.waveChannelTransform(data, this.__volume, this.schedulable, this).success(function (result) {
					this._produce(result, packetNumber);
				}, this);
 			}
 			
 		};
 	}]);
});



Scoped.define("module:Encoding.WaveEncoder.WaveHeaderPacketDataTransformer", [
   	"module:Encoding.WaveEncoder.Support",
	"base:Packetizer.HeaderPacketDataTransformer"
], function (Support, HeaderPacketDataTransformer, scoped) {
	return HeaderPacketDataTransformer.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (audioChannels, sampleRate) {
				inherited.constructor.call(this);
				this.__audioChannels = audioChannels;
				this.__sampleRate = sampleRate;
				this.__totalSize = 0;
			},
			
			_reset: function () {
				this.__totalSize = 0;
			},
			
			_registerPacket: function (packet, packetNumber) {
				this.__totalSize += packet.length * packet.BYTES_PER_ELEMENT;
			},
			
			_headerPacket: function (totalPackets) {
				return Support.generateHeader(totalSize, this.__audioChannels, this.__sampleRate);
			}		

		};
	});
});


Scoped.define("module:Encoding.WaveEncoder.WaveDataPacketAssembler", [
	"module:Packetizer.PacketAssembler"
], function (PacketAssembler, scoped) {
 	return PacketAssembler.extend({scoped: scoped}, function (inherited) {
 		return {
 			
			_packetSegmentizer: function (packetNumber) {
				return packetNumber > 0 ? 1 : 0;
			},
			
			_packetDesegmentizer: function (packetNumberInSegment, segmentNumber) {
				return packetNumberInSegment + segmentNumber;
			},
			
			_packetSize: function (packet, packetNumber) {
				return packet.length * packet.BYTES_PER_ELEMENT;
			},
			
			_packetSerialize: function (packet, packetNumber, offset, length, dataView) {
				if (packetNumber > 0) {
					for (var i = 0; i < length / 2; ++i)
						dataView.setInt16(i * 2, packet[offset / 2 + i], true);
				} else {
					var packetView = new Uint8Array(packet);
					for (var i = 0; i < length; ++i)
						dataView.setUint8(i, packetView.get(i + offset));
				}
			}
			
 		};
 	});
});
*/
Scoped.define("module:Encoding.WebmEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper",
    "base:Types"
], function(Promise, SchedulingHelper, Types) {
    return {

        parseWebP: function(riff) {
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

        parseRIFF: function(string) {
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

                if (id == 'RIFF' || id == 'LIST')
                    chunks[id].push(this.parseRIFF(data));
                else
                    chunks[id].push(data);
            }
            return chunks;
        },

        isBlankFrame: function(canvas, frame, _pixTolerance, _frameTolerance) {
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
                if (colorDifference <= maxColorDifference * pixTolerance)
                    matchPixCount++;
            }

            return maxPixCount - matchPixCount <= maxPixCount * frameTolerance;
        },

        makeSimpleBlock: function(data) {
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

        generateEBMLHeader: function(duration, width, height) {

            var doubleToString = function(num) {
                return [].slice.call(
                    new Uint8Array((new Float64Array([num])).buffer), 0).map(function(e) {
                    return String.fromCharCode(e);
                }).reverse().join('');
            };

            return [{
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
                        "data": doubleToString(duration),
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
                                "data": width,
                                "id": 0xb0 // PixelWidth
                            }, {
                                "data": height,
                                "id": 0xba // PixelHeight
                            }]
                        }]
                    }]
                }]
            }];
        },

        __numToBuffer: function(num) {
            var parts = [];
            while (num > 0) {
                parts.push(num & 0xff);
                num = num >> 8;
            }
            return new Uint8Array(parts.reverse());
        },

        __strToBuffer: function(str) {
            return new Uint8Array(str.split('').map(function(e) {
                return e.charCodeAt(0);
            }));
        },

        __bitsToBuffer: function(bits) {
            var data = [];
            var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
            bits = pad + bits;
            for (var i = 0; i < bits.length; i += 8)
                data.push(parseInt(bits.substr(i, 8), 2));
            return new Uint8Array(data);
        },

        serializeEBML: function(json) {
            if (!Types.is_array(json))
                return json;
            var ebml = [];
            json.forEach(function(entry) {
                var data = entry.data;
                var tp = typeof data;
                if (tp === "object")
                    data = this.serializeEBML(data);
                else if (tp === "number")
                    data = this.__bitsToBuffer(data.toString(2));
                else if (tp === "string")
                    data = this.__strToBuffer(data);
                var len = data.size || data.byteLength || data.length;
                var zeroes = Math.ceil(Math.ceil(Math.log(len) / Math.log(2)) / 8);
                var size_str = len.toString(2);
                var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
                var size = (new Array(zeroes)).join('0') + '1' + padded;
                ebml.push(this.__numToBuffer(entry.id));
                ebml.push(this.__bitsToBuffer(size));
                ebml.push(data);
            }, this);
            return new Blob(ebml, {
                type: "video/webm"
            });
        },

        makeTimecodeDataBlock: function(data, clusterDuration) {
            return {
                data: this.makeSimpleBlock({
                    discardable: 0,
                    frame: data.slice(4),
                    invisible: 0,
                    keyframe: 1,
                    lacing: 0,
                    trackNum: 1,
                    timecode: Math.round(clusterDuration)
                }),
                id: 0xa3
            };
        },

        makeCluster: function(clusterFrames, clusterTimecode) {
            clusterFrames.unshift({
                "data": clusterTimecode,
                "id": 0xe7 // Timecode
            });
            return {
                "id": 0x1f43b675, // Cluster
                "data": clusterFrames
            };
        }

    };
});
Scoped.define("module:Flash.FlashImageRecorder", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Timers.Timer",
    "base:Time",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, Promise, EventsMixin, PixelSampleMixin, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false,
                    hasEmbedding: this.readAttr("hasembedding") || false,
                    namespace: this.readAttr("embednamespace") || null
                }, {
                    parentBgcolor: true,
                    fixHalfPixels: true
                }));
                this._flashObjs = {};
                this.ready = Promise.create();
                this.__videoRate = this.readAttr('videorate') || 0;
                this.__videoQuality = this.readAttr('videoquality') || 90;
                this.__cameraWidth = this.readAttr('camerawidth') || 640;
                this.__cameraHeight = this.readAttr('cameraheight') || 480;
                this._flip = Types.parseBool(this.readAttr("flip") || false);
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __initializeEmbedding: function() {
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.video = this._embedding.newObject(
                    "flash.media.Video",
                    this._flashObjs.stage.get("stageWidth"),
                    this._flashObjs.stage.get("stageHeight")
                );
                this._flashObjs.cameraVideo = this._embedding.newObject(
                    "flash.media.Video",
                    this.__cameraWidth,
                    this.__cameraHeight
                );
                this._flashObjs.main.addChildVoid(this._flashObjs.video);
                this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(0);
                this._currentCamera = 0;
                this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
                this.recomputeBB();
                this.ready.asyncSuccess(this);
                this.auto_destroy(new Timer({
                    delay: 100,
                    fire: this._fire,
                    context: this
                }));
            },

            isAccessGranted: function() {
                try {
                    return (!this._flashObjs.camera || !this._flashObjs.camera.get('muted'));
                } catch (e) {
                    return false;
                }
            },

            isSecurityDialogOpen: function() {
                var dummy = this._embedding.newObject("flash.display.BitmapData", 1, 1);
                var open = false;
                try {
                    dummy.draw(this._flashObjs.stage);
                } catch (e) {
                    open = true;
                }
                dummy.dispose();
                dummy.destroy();
                return open;
            },

            openSecurityDialog: function(fullSecurityDialog) {
                this.trigger("require_display");
                if (fullSecurityDialog)
                    this._flashObjs.Security.showSettings("privacy");
                else {
                    this._flashObjs.video.attachCamera(null);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                }
            },

            grantAccess: function(fullSecurityDialog, allowDeny) {
                var promise = Promise.create();
                var timer = new Timer({
                    fire: function() {
                        if (this.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        if (this.isSecurityDialogOpen())
                            return;
                        if (this.isAccessGranted()) {
                            timer.destroy();
                            promise.asyncSuccess(true);
                        } else {
                            if (allowDeny) {
                                timer.destroy();
                                promise.asyncError(true);
                            } else
                                this.openSecurityDialog(fullSecurityDialog);
                        }
                    },
                    context: this,
                    delay: 10,
                    start: true
                });
                return promise;
            },

            bindMedia: function(fullSecurityDialog, allowDeny) {
                return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function() {
                    this._mediaBound = true;
                    this._attachCamera();
                }, this);
            },

            unbindMedia: function() {
                this._detachCamera();
                this._mediaBound = false;
            },

            _attachCamera: function() {
                if (this._flashObjs.camera) {
                    this._flashObjs.camera.setMode(this.__cameraWidth, this.__cameraHeight, this.__fps);
                    this._flashObjs.camera.setQuality(this.__videoRate, this.__videoQuality);
                    this._flashObjs.camera.setKeyFrameInterval(5);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                    this._flashObjs.cameraVideo.attachCamera(this._flashObjs.camera);
                }
                if (this._flip) {
                    if (this._flashObjs.video.get("scaleX") > 0)
                        this._flashObjs.video.set("scaleX", -this._flashObjs.video.get("scaleX"));
                    this._flashObjs.video.set("x", this._flashObjs.video.get("width"));
                }
            },

            _detachCamera: function() {
                this._flashObjs.video.attachCamera(null);
                this._flashObjs.cameraVideo.attachCamera(null);
            },

            enumerateDevices: function() {
                return {
                    videos: this._flashObjs.Camera.get('names')
                };
            },

            selectCamera: function(index) {
                if (this._flashObjs.camera)
                    this._flashObjs.camera.weakDestroy();
                this.__cameraActivityTime = null;
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(index);
                this._currentCamera = index;
                if (this._mediaBound)
                    this._attachCamera();
            },

            currentCamera: function() {
                return this._currentCamera;
            },

            cameraInfo: function() {
                if (!this._flashObjs.camera)
                    return {};
                return {
                    muted: this._flashObjs.camera.get("muted"),
                    name: this._flashObjs.camera.get("name"),
                    activityLevel: this._flashObjs.camera.get("activityLevel"),
                    fps: this._flashObjs.camera.get("fps"),
                    width: this._flashObjs.camera.get("width"),
                    height: this._flashObjs.camera.get("height"),
                    inactivityTime: this.__cameraActivityTime ? Time.now() - this.__cameraActivityTime : null
                };
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var w = this._flashObjs.cameraVideo.get("width");
                var h = this._flashObjs.cameraVideo.get("height");
                var wc = Math.ceil(Math.sqrt(w / h * samples));
                var hc = Math.ceil(Math.sqrt(h / w * samples));
                var lightLevelBmp = this._embedding.newObject("flash.display.BitmapData", wc, hc);
                var scaleMatrix = this._embedding.newObject("flash.geom.Matrix");
                scaleMatrix.scale(wc / w, hc / h);
                lightLevelBmp.draw(this._flashObjs.cameraVideo, scaleMatrix);
                for (var i = 0; i < samples; ++i) {
                    var x = i % wc;
                    var y = Math.floor(i / wc);
                    var rgb = lightLevelBmp.getPixel(x, y);
                    callback.call(context || this, rgb % 256, (rgb / 256) % 256, (rgb / 256 / 256) % 256);
                }
                scaleMatrix.destroy();
                lightLevelBmp.destroy();
            },

            _fire: function() {
                if (!this._mediaBound)
                    return;
                if (this._flashObjs.camera) {
                    var currentCameraActivity = this._flashObjs.camera.get("activityLevel");
                    if (!this.__lastCameraActivity || this.__lastCameraActivity !== currentCameraActivity)
                        this.__cameraActivityTime = Time.now();
                    this.__lastCameraActivity = currentCameraActivity;
                }
            },

            createSnapshot: function() {
                var bmp = this._embedding.newObject(
                    "flash.display.BitmapData",
                    this._flashObjs.cameraVideo.get("videoWidth"),
                    this._flashObjs.cameraVideo.get("videoHeight")
                );
                bmp.draw(this._flashObjs.cameraVideo);
                return bmp;
            },

            postSnapshot: function(bmp, url, type, quality) {
                var promise = Promise.create();
                quality = quality || 90;
                var header = this._embedding.newObject("flash.net.URLRequestHeader", "Content-type", "application/octet-stream");
                var request = this._embedding.newObject("flash.net.URLRequest", url);
                request.set("requestHeaders", [header]);
                request.set("method", "POST");
                if (type === "jpg") {
                    var jpgEncoder = this._embedding.newObject("com.adobe.images.JPGEncoder", quality);
                    request.set("data", jpgEncoder.encode(bmp));
                    jpgEncoder.destroy();
                } else {
                    var PngEncoder = this._embedding.getClass("com.adobe.images.PNGEncoder");
                    request.set("data", PngEncoder.encode(bmp));
                }
                var poster = this._embedding.newObject("flash.net.URLLoader");
                poster.set("dataFormat", "BINARY");

                // In case anybody is wondering, no, the progress event does not work for uploads:
                // http://stackoverflow.com/questions/2106682/a-progress-event-when-uploading-bytearray-to-server-with-as3-php/2107059#2107059

                poster.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncSuccess(true);
                }, this)));
                poster.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncError("IO Error");
                }, this)));
                poster.load(request);
                promise.callback(function() {
                    poster.destroy();
                    request.destroy();
                    header.destroy();
                });
                return promise;
            },

            createSnapshotDisplay: function(bmpData, x, y, w, h) {
                var bmp = this._embedding.newObject("flash.display.Bitmap", bmpData);
                this.updateSnapshotDisplay(bmpData, bmp, x, y, w, h);
                this._flashObjs.main.addChildVoid(bmp);
                return bmp;
            },

            updateSnapshotDisplay: function(bmpData, bmp, x, y, w, h) {
                bmp.set("x", x);
                bmp.set("y", y);
                bmp.set("scaleX", w / bmpData.get("width"));
                bmp.set("scaleY", h / bmpData.get("height"));
            },

            removeSnapshotDisplay: function(snapshot) {
                this._flashObjs.main.removeChildVoid(snapshot);
                snapshot.destroy();
            },

            idealBB: function() {
                return {
                    width: this.__cameraWidth,
                    height: this.__cameraHeight
                };
            },

            setActualBB: function(actualBB) {
                ["object", "embed"].forEach(function(tag) {
                    var container = this._element.getElementsByTagName(tag.toUpperCase())[0];
                    if (container) {
                        ["width", "height"].forEach(function(attr) {
                            container.style[attr] = actualBB[attr] + "px";
                        });
                    }
                }, this);
                var video = this._flashObjs.video;
                if (video) {
                    video.set("width", actualBB.width);
                    video.set("height", actualBB.height);
                    if (this._flip) {
                        if (video.get("scaleX") > 0)
                            video.set("scaleX", -video.get("scaleX"));
                        video.set("x", video.get("width"));
                    }
                }
            },

            _error: function(s) {
                this.__status = "error";
                this.trigger("error", s);
            }

        };
    }], {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Camera", ["setMode", "setQuality", "setKeyFrameInterval", "addEventListener"], ["getCamera"]);
                this.__flashRegistry.register("flash.media.Video", ["attachCamera", "attachNetStream"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.net.URLRequestHeader", []);
                this.__flashRegistry.register("flash.net.URLLoader", ["addEventListener", "load"]);
                this.__flashRegistry.register("flash.display.Sprite", ["addChild", "removeChild", "setChildIndex"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.display.Loader", ["load"]);
                this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
                this.__flashRegistry.register("flash.display.BitmapData", ["draw", "getPixel", "dispose"]);
                this.__flashRegistry.register("flash.display.Bitmap", []);
                this.__flashRegistry.register("flash.geom.Matrix", ["scale"]);
                this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
                this.__flashRegistry.register("com.adobe.images.PNGEncoder", [], ["encode"]);
                this.__flashRegistry.register("com.adobe.images.JPGEncoder", ["encode"]);
            }
            return this.__flashRegistry;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});
Scoped.define("module:ImageRecorder.ImageRecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise"
], function(ConditionalInstance, EventsMixin, Objs, Promise, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._element = this._options.element;
                this.ready = Promise.create();
            },

            destroy: function() {
                inherited.destroy.call(this);
            },

            bindMedia: function() {
                return this._bindMedia();
            },

            _bindMedia: function() {},

            unbindMedia: function() {
                return this._unbindMedia();
            },

            _unbindMedia: function() {},

            softwareDependencies: function() {
                return this._softwareDependencies();
            },

            _softwareDependencies: function() {},

            cameraWidth: function() {
                return this._options.recordingWidth;
            },

            cameraHeight: function() {
                return this._options.recordingHeight;
            },

            lightLevel: function() {},
            blankLevel: function() {},
            deltaCoefficient: function() {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},

            createSnapshot: function() {},
            removeSnapshot: function(snapshot) {},
            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {},
            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {},
            removeSnapshotDisplay: function(display) {},
            createSnapshotUploader: function(snapshot, type, uploaderOptions) {},

            isFlash: function() {
                return false;
            },

            snapshotToLocalPoster: function(snapshot) {
                return null;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                recordingWidth: 640,
                recordingHeight: 480
            }, options);
        }

    });
});


Scoped.define("module:ImageRecorder.WebRTCImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(ImageRecorderWrapper, RecorderWrapper, Support, Dom, Info, Time, Objs, FileUploader, MultiUploader, Promise, scoped) {
    return ImageRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "video")
                    this._element = Dom.changeTag(this._element, "video");
                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    flip: !!this._options.flip,
                    recordVideo: true,
                    recordAudio: false,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    videoBitrate: this._options.videoBitrate,
                    screen: this._options.screen
                });
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia();
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            lightLevel: function() {
                return this._recorder.lightLevel();
            },

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            currentDevices: function() {
                return {
                    video: this._currentVideo
                };
            },

            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {
                    if (!this._currentVideo)
                        this._currentVideo = Objs.ithKey(result.video);
                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot(type);
            },

            removeSnapshot: function(snapshot) {},

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                var url = Support.globals().URL.createObjectURL(snapshot);
                var image = document.createElement("img");
                image.style.position = "absolute";
                this.updateSnapshotDisplay(snapshot, image, x, y, w, h);
                image.src = url;
                Dom.elementPrependChild(parent, image);
                return image;
            },

            updateSnapshotDisplay: function(snapshot, image, x, y, w, h) {
                image.style.left = x + "px";
                image.style.top = y + "px";
                image.style.width = w + "px";
                image.style.height = h + "px";
            },

            removeSnapshotDisplay: function(image) {
                image.remove();
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                return FileUploader.create(Objs.extend({
                    source: snapshot
                }, uploaderOptions));
            },

            snapshotToLocalPoster: function(snapshot) {
                return snapshot;
            },

            _softwareDependencies: function() {
                if (!this._options.screen || Support.globals().supportedConstraints.mediaSource)
                    return Promise.value(true);
                var ext = Support.chromeExtensionExtract(this._options.screen);
                var err = [{
                    title: "Screen Recorder Extension",
                    execute: function() {
                        window.open(ext.extensionInstallLink);
                    }
                }];
                var pingTest = Time.now();
                return Support.chromeExtensionMessage(ext.extensionId, {
                    type: "ping",
                    data: pingTest
                }).mapError(function() {
                    return err;
                }).mapSuccess(function(pingResponse) {
                    if (pingResponse && pingResponse.type === "success" && pingResponse.data === pingTest)
                        return true;
                    return Promise.error(err);
                });
            }

        };
    }, {

        supported: function(options) {
            if (options.forceflash)
                return false;
            if (!RecorderWrapper.anySupport(options))
                return false;
            if (options.screen) {
                if (Support.globals().supportedConstraints.mediaSource && Info.isFirefox() && Info.firefoxVersion() > 55)
                    return true;
                if (Info.isChrome() && options.screen.chromeExtensionId)
                    return true;
                if (Info.isOpera() && options.screen.operaExtensionId)
                    return true;
                return false;
            }
            return true;
        }

    });
});



Scoped.define("module:ImageRecorder.FlashImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:Flash.FlashImageRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(FlashImageRecorderWrapper, FlashRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return FlashImageRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashRecorder(this._element, {
                    flip: !!this._options.flip,
                    camerawidth: this._options.recordingWidth,
                    cameraheight: this._options.recordingHeight,
                    fps: this._options.framerate,
                    videoRate: this._options.videoBitrate ? this._options.videoBitrate * 1000 : undefined
                });
                this._recorder.ready.forwardCallback(this.ready);
                this._recorder.on("require_display", function() {
                    this.trigger("require_display");
                }, this);
                this._recorder.on("endpoint_connectivity", function(endpoint, connectivity) {
                    this.trigger("endpoint_connectivity", endpoint, connectivity);
                }, this);
            },

            destroy: function() {
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia(this._options.flashFullSecurityDialog);
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            lightLevel: function() {
                return this._recorder.lightLevel();
            },

            enumerateDevices: function() {
                var result = this._recorder.enumerateDevices();
                return Promise.value({
                    videoCount: Objs.count(result.videos),
                    video: Objs.map(result.videos, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            },

            currentDevices: function() {
                return {
                    video: this._recorder.currentCamera()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot();
            },

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                return this._recorder.createSnapshotDisplay(snapshot, x, y, w, h);
            },

            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {
                return this._recorder.updateSnapshotDisplay(snapshot, display, x, y, w, h);
            },

            removeSnapshotDisplay: function(display) {
                this._recorder.removeSnapshotDisplay(display);
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                var uploader = new CustomUploader(Objs.extend({
                    source: snapshot,
                    type: type,
                    recorder: this._recorder
                }, uploaderOptions));
                uploader.on("upload", function(options) {
                    options.recorder.postSnapshot(
                            options.source,
                            options.url,
                            options.type
                        )
                        .success(uploader.successCallback, uploader)
                        .error(uploader.errorCallback, uploader);
                });
                return uploader;
            },

            isFlash: function() {
                return true;
            },

            _softwareDependencies: function() {
                return Info.flash().installed() ? Promise.value(true) : Promise.error([{
                    "title": "Adobe Flash",
                    "execute": function() {
                        window.open("https://get.adobe.com/flashplayer");
                    }
                }]);
            }

        };
    }, {

        supported: function(options) {
            return !Info.isMobile() && !options.noflash && Info.flash().supported() && !options.screen;
        }

    });
});


Scoped.extend("module:ImageRecorder.ImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:ImageRecorder.WebRTCImageRecorderWrapper"
], function(ImageRecorderWrapper, WebRTCImageRecorderWrapper) {
    ImageRecorderWrapper.register(WebRTCImageRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:ImageRecorder.ImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:ImageRecorder.FlashImageRecorderWrapper"
], function(ImageRecorderWrapper, FlashImageRecorderWrapper) {
    ImageRecorderWrapper.register(FlashImageRecorderWrapper, 1);
    return {};
});
Scoped.define("module:Player.Broadcasting", [
    "base:Class",
    "browser:Loader",
    "browser:Events"
], function(Class, Loader, DomEvents, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(instance) {
                inherited.constructor.apply(this);
                this.player = instance.player;
                this.googleCast = {};
                this.airplay = {};
                this.options = instance.commonOptions;
                this.googleCast.initialOptions = instance.castOptions;
                this.airplayOptions = instance.airplayOptions;

                this.player.on("pause-google-cast", function() {
                    this._googleCastRemotePause();
                }, this);

                this.player.on("play-google-cast", function() {
                    this._googleCastRemotePlay();
                }, this);

                this.player.on("google-cast-seeking", function(duration) {
                    this._seekToGoogleCast(duration);
                }, this);

                this.player.on("change-google-cast-volume", function(volume) {
                    volume = Math.min(1.0, volume);
                    this._changeGoogleCastVolume(volume);
                }, this);
            },

            attachAirplayEvent: function(video) {
                this._airplayEvent = this.auto_destroy(new DomEvents());
                this._airplayEvent.on(video, "webkitplaybacktargetavailabilitychanged", function(ev) {
                    switch (ev.availability) {
                        case "available":
                            this.player._broadcastingState.airplayConnected = true;
                            return true;
                        default:
                            return false;
                    }
                }, this);
            },

            attachGoggleCast: function() {
                var self = this;
                window.__onGCastApiAvailable = function(isAvailable) {
                    if (isAvailable) {
                        self._initializeCastApi();
                    }
                };

                Loader.loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1', function() {

                });
            },

            _initializeCastApi: function() {
                var self = this;
                self.player.trigger("cast-available", true);
                var googleCastInitialOptions = this.googleCast.initialOptions;

                var options = {};
                // [0] default media receiver app ID
                // [1] Custom Receiver app ID
                // [2] Styled Media Receiver app ID # can also add https css files from cast console
                // [3] Remote Display Receiver app ID
                var applicationIds = [
                    chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    '41A5ADFD', '8AA2B3F9', 'DE815B4F'
                ];

                // [0] no auto join
                // [1] same appID, same URL, same tab
                // [2] same appID and same origin URL
                var autoJoinPolicy = [
                    chrome.cast.AutoJoinPolicy.PAGE_SCOPED,
                    chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
                    chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                ];

                options.receiverApplicationId = applicationIds[2];
                options.autoJoinPolicy = autoJoinPolicy[1];

                cast.framework.CastContext.getInstance().setOptions(options);

                var castRemotePlayer = new cast.framework.RemotePlayer();
                castRemotePlayer.title = this.options.title;
                //castRemotePlayer.displayStatus =  "Please wait connecting",
                castRemotePlayer.canControlVolume = googleCastInitialOptions.canControlVolume;
                castRemotePlayer.canPause = googleCastInitialOptions.canPause;
                castRemotePlayer.canSeek = googleCastInitialOptions.canSeek;
                castRemotePlayer.duration = googleCastInitialOptions.duration;
                castRemotePlayer.imageUrl = googleCastInitialOptions.imageUrl;
                castRemotePlayer.isConnected = googleCastInitialOptions.isConnected;
                castRemotePlayer.isMuted = googleCastInitialOptions.isMuted;
                castRemotePlayer.isPaused = googleCastInitialOptions.isPaused;
                castRemotePlayer.title = this.options.title;
                castRemotePlayer.displayName = googleCastInitialOptions.displayName;

                var castRemotePlayerController = new cast.framework.RemotePlayerController(castRemotePlayer);
                //castRemotePlayerController methods
                //getSeekPosition(currentTime, duration), getSeekTime(currentPosition, duration)
                //castRemotePlayer.currentTime = position.in.seconds; muteOrUnmute(); playOrPause()
                // seek(), setVolumeLevel(), stop()


                castRemotePlayerController.addEventListener(
                    cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
                    function() {
                        if (cast && cast.framework) {
                            if (castRemotePlayer.isConnected) {
                                self._setupCastRemotePlayer(castRemotePlayer, castRemotePlayerController);
                            } else {
                                self._destroyCastRemotePlayer(castRemotePlayer, castRemotePlayerController);
                            }
                        }
                    }
                );
            },

            _setupCastRemotePlayer: function(castRemotePlayer, castRemotePlayerController) {
                var self = this;
                var player = this.player;
                var options = this.castOptions;
                var sources = player._options.sources[0];
                var mediaURL = player._element.currentSrc;
                var mediaMimeType = sources.type;

                var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

                var mediaInfo = new chrome.cast.media.MediaInfo(mediaURL, mediaMimeType);
                mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
                mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
                mediaInfo.metadata.title = this.options.title;
                mediaInfo.metadata.images = [{
                    url: this.options.poster
                }];

                var request = new chrome.cast.media.LoadRequest(mediaInfo);

                this.googleCast.castRemotePlayer = castRemotePlayer;
                this.googleCast.castRemotePlayerController = castRemotePlayerController;
                this.googleCast.castMediaInfo = mediaInfo;
                this.googleCast.castSession = castSession;

                castSession.loadMedia(request).then(
                    function() {

                        player._broadcastingState.googleCastConnected = true;
                        player.trigger("cast-loaded", castRemotePlayer, castRemotePlayerController);


                        var currentPosition = self.options.currentPosition;
                        if (currentPosition > 0) self._seekToGoogleCast(currentPosition);

                        // Listeners available for further actions with remote player
                        // https://developers.google.com/cast/docs/reference/chrome/cast.framework#.RemotePlayerEventType
                        castRemotePlayerController.addEventListener(
                            cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
                            function() {
                                player.trigger("cast-playpause", castRemotePlayer.isPaused);
                            }
                        );

                        castRemotePlayerController.addEventListener(
                            cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
                            function() {
                                var currentTime = self._getGoogleCastCurrentMediaTime(castRemotePlayer);
                                var totalMediaDuration = self._getGoogleCastMediaDuration(castRemotePlayer);
                                player.trigger("cast-time-changed", currentTime, totalMediaDuration);
                            }
                        );
                    },
                    function(errorCode) {
                        console.warn('Remote media load error : ' + self._googleCastPlayerErrorMessages(errorCode));
                    }
                );

            },

            _destroyCastRemotePlayer: function(castRemotePlayer, castRemotePlayerController) {
                var player = this.player;
                var currentPosition = this._getGoogleCastCurrentMediaTime(castRemotePlayer);

                if (castRemotePlayer.savedPlayerState && !castRemotePlayer.isConnected)
                    currentPosition = castRemotePlayer.savedPlayerState.currentTime;

                if (player._broadcastingState.googleCastConnected && currentPosition > 0)
                    player.trigger("proceed-when-ending-googlecast", currentPosition);

                this.player._broadcastingState.googleCastConnected = false;
            },

            _getGoogleCastRemotePlayer: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castRemotePlayer;
            },

            _getGoogleCastRemotePlayerController: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castRemotePlayerController;
            },

            _getGoogleCastMediaInfo: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castMediaInfo;
            },

            _getGoogleCastCurrentSession: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castSession;
            },

            _getGoogleCastCurrentMediaTime: function(remotePlayer) {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return remotePlayer.currentTime;

            },

            _getGoogleCastMediaDuration: function(remotePlayer) {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return remotePlayer.duration;
            },

            _googleCastRemotePlay: function() {
                if (this.player._broadcastingState.googleCastConnected) {
                    var castRemotePlayer = this._getGoogleCastRemotePlayer();
                    var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                    if (castRemotePlayer.playerState === 'PAUSED')
                        castRemotePlayerController.playOrPause();
                    return castRemotePlayer;
                } else return false;
            },

            _googleCastRemotePause: function() {
                if (this.player._broadcastingState.googleCastConnected) {
                    var castRemotePlayer = this._getGoogleCastRemotePlayer();
                    var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                    if (castRemotePlayer.playerState === 'PLAYING')
                        castRemotePlayerController.playOrPause();
                    return castRemotePlayer;
                } else return false;
            },

            _seekToGoogleCast: function(time) {
                var castRemotePlayer = this._getGoogleCastRemotePlayer();
                var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                castRemotePlayer.currentTime = time;
                castRemotePlayerController.seek();
            },

            _changeGoogleCastVolume: function(volumePosition) {
                var castRemoteController = this._getGoogleCastRemotePlayerController();
                var castRemotePlayer = this._getGoogleCastRemotePlayer();
                castRemotePlayer.volumeLevel = volumePosition;
                castRemoteController.setVolumeLevel();
            },

            _googleCastPlayerErrorMessages: function(error) {
                switch (error.code) {
                    case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
                        return 'The API is not initialized.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.CANCEL:
                        return 'The operation was canceled by the user' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.CHANNEL_ERROR:
                        return 'A channel to the receiver is not available.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.EXTENSION_MISSING:
                        return 'The Cast extension is not available.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.INVALID_PARAMETER:
                        return 'The parameters to the operation were not valid.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
                        return 'No receiver was compatible with the session request.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.SESSION_ERROR:
                        return 'A session could not be created, or a session was invalid.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.TIMEOUT:
                        return 'The operation timed out.' +
                            (error.description ? ' :' + error.description : '');
                }
            },

            lookForAirplayDevices: function(videoElement) {
                return videoElement.webkitShowPlaybackTargetPicker();
            }

        };
    });
});
Scoped.define("module:Player.FlashPlayer", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Promise"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Promise, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._source = this.__preferedSource();
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false
                }));
                this._flashObjs = {};
                this._flashData = {
                    status: 'idle'
                };
                this.ready = Promise.create();
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __preferedSource: function() {
                var preferred = [".mp4", ".flv"];
                var sources = [];
                if (this.readAttr("src") || this.readAttr("source") || this.readAttr("sources")) {
                    var src = this.readAttr("src") || this.readAttr("source") || this.readAttr("sources");
                    if (Types.is_array(src))
                        sources = src;
                    else
                        sources.push(src);
                }
                var element = this._element;
                if (!(Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)) {
                    for (var i = 0; i < this._element.childNodes.length; ++i) {
                        if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
                            sources.push(element.childNodes[i].src.toLowerCase());
                    }
                } else {
                    var current = this._element;
                    while (true) {
                        var next = current.nextSibling;
                        if (!next || !next.tagName || next.tagName.toLowerCase() != "source")
                            break;
                        sources.push(next.src.toLowerCase());
                        current = next;
                    }
                }
                sources = Objs.map(sources, function(source) {
                    return source.src || source;
                });
                var source = sources[0];
                var currentExtIndex = preferred.length - 1;
                for (var k = sources.length - 1; k >= 0; --k) {
                    for (var j = 0; j <= currentExtIndex; ++j) {
                        if (Strings.ends_with(sources[k], preferred[j])) {
                            source = sources[k];
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

            __initializeEmbedding: function() {
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");

                if (this.readAttr("poster")) {
                    this._flashObjs.imageLoader = this._embedding.newObject("flash.display.Loader");
                    var contentLoaderInfo = this._flashObjs.imageLoader.get("contentLoaderInfo");
                    contentLoaderInfo.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function() {
                        this.__imageLoaded = {
                            width: this._flashObjs.imageLoader.get("width"),
                            height: this._flashObjs.imageLoader.get("height")
                        };
                        if (!this.__metaLoaded)
                            this.recomputeBB();
                    }, this)));
                    contentLoaderInfo.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function() {
                        this.domEvent("postererror");
                    }, this)));
                    this._flashObjs.imageUrlRequest = this._embedding.newObject("flash.net.URLRequest", this.readAttr("poster"));
                    this._flashObjs.imageLoader.load(this._flashObjs.imageUrlRequest);
                    this._flashObjs.main.addChildVoid(this._flashObjs.imageLoader);
                }
                this._flashObjs.video = this._embedding.newObject(
                    "flash.media.Video",
                    this._flashObjs.stage.get("stageWidth"),
                    this._flashObjs.stage.get("stageHeight")
                );
                this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__connectionStatusEvent, this)));
                this._flashObjs.connection.connectVoid(this._source.connectionUrl);
            },

            __connectionStatusEvent: function() {
                this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
                this._flashObjs.stream.set("client", this._embedding.newCallback("onMetaData", Functions.as_method(function(info) {
                    this._flashData.meta = info;
                    this._element.duration = info.duration;
                    this.__metaLoaded = true;
                    Async.eventually(this.recomputeBB, this);
                }, this)));
                this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__streamStatusEvent, this)));
                this._flashObjs.soundTransform = this._embedding.newObject("flash.media.SoundTransform");
                this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
                this._flashObjs.video.attachNetStreamVoid(this._flashObjs.stream);
                this.writeAttr("volume", 1.0);
                if (this.hasAttr("muted")) {
                    this._flashObjs.soundTransform.set("volume", 0.0);
                    this._flashObjs.stream.set("soundTransform", null);
                    this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
                    this.writeAttr("volume", 0.0);
                }
                this._flashObjs.main.addChildVoid(this._flashObjs.video);
                if (this.hasAttr("autoplay"))
                    this._element.play();
                this.ready.asyncSuccess(this);
            },

            __streamStatusEvent: function(event) {
                var code = event.get("info").code;
                if (code == "NetStream.Play.StreamNotFound") {
                    this._flashData.status = "error";
                    this.domEvent("videoerror");
                }
                if (code == "NetStream.Play.Start")
                    this._flashData.status = "start";
                if (code == "NetStream.Play.Stop")
                    this._flashData.status = "stopping";
                if (code == "NetStream.Buffer.Empty" && this._flashData.status == "stopping") {
                    this._flashData.status = "stopped";
                    this.domEvent("ended");
                }
                if (this._flashData.status == "stopped" && this.hasAttr("loop")) {
                    this._flashData.status = "idle";
                    this._element.play();
                }
            },

            idealBB: function() {
                if (!this.__imageLoaded && !this.__metaLoaded)
                    return null;
                return {
                    width: this.__metaLoaded ? this._flashData.meta.width : this.__imageLoaded.width,
                    height: this.__metaLoaded ? this._flashData.meta.height : this.__imageLoaded.height
                };
            },

            setActualBB: function(actualBB) {
                ["object", "embed"].forEach(function(tag) {
                    var container = this._element.getElementsByTagName(tag.toUpperCase())[0];
                    if (container) {
                        ["width", "height"].forEach(function(attr) {
                            container.style[attr] = actualBB[attr] + "px";
                        });
                    }
                }, this);
                if (this.__metaLoaded) {
                    this._flashObjs.video.set("width", actualBB.width);
                    this._flashObjs.video.set("height", actualBB.height);
                }
                if (this.__imageLoaded) {
                    this._flashObjs.imageLoader.set("width", actualBB.width);
                    this._flashObjs.imageLoader.set("height", actualBB.height);
                }
            },

            videoWidth: function() {
                return this.__metaLoaded ? this._flashData.meta.width : (this.__imageLoaded ? this.__imageLoaded.width : NaN);
            },

            videoHeight: function() {
                return this.__metaLoaded ? this._flashData.meta.height : (this.__imageLoaded ? this.__imageLoaded.height : NaN);
            },

            _domMethods: ["play", "pause", "load"],

            _domAttrs: {
                "volume": {
                    set: "_setVolume"
                },
                "currentTime": {
                    get: "_getCurrentTime",
                    set: "_setCurrentTime"
                }
            },

            load: function() {},

            play: function() {
                if (this._flashObjs.main.imageLoader)
                    this._flashObjs.main.setChildIndex(this._flashObjs.video, 1);
                if (this._flashData.status === "paused")
                    this._flashObjs.stream.resumeVoid();
                else
                    this._flashObjs.stream.playVoid(this._source.playUrl);
                this._flashData.status = "playing";
                this.domEvent("playing");
            },

            pause: function() {
                if (this._flashData.status === "paused")
                    return;
                this._flashData.status = "paused";
                this._flashObjs.stream.pauseVoid();
                this.domEvent("pause");
            },

            _setVolume: function(volume) {
                this._flashObjs.soundTransform.set("volume", volume);
                this._flashObjs.stream.set("soundTransform", null);
                this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
                this.domEvent("volumechange");
            },

            _getCurrentTime: function() {
                return this._flashObjs.stream.get("time");
            },

            _setCurrentTime: function(time) {
                this._flashObjs.stream.seek(time);
            }

        };
    }, {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
                this.__flashRegistry.register("flash.display.Sprite", ["addChild", "setChildIndex"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
                this.__flashRegistry.register("flash.display.Loader", ["load"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
            }
            return this.__flashRegistry;
        },

        polyfill: function(element, polyfilltag, force, eventual) {
            if (eventual) {
                var promise = Promise.create();
                Async.eventually(function() {
                    promise.asyncSuccess(Cls.polyfill(element, polyfilltag, force));
                });
                return promise;
            }
            if (element.tagName.toLowerCase() != "video" || !("networkState" in element))
                return Cls.attach(element);
            else if (element.networkState == element.NETWORK_NO_SOURCE || force)
                return Cls.attach(Dom.changeTag(element, polyfilltag || "videopoly"));
            return element;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});
Scoped.define("module:Player.Support", [
    "base:Promise",
    "base:Objs"
], function(Promise, Objs) {
    return {

        resolutionToLabel: function(width, height) {
            if (height < 300)
                return "SD";
            if (height < 400)
                return "360p";
            if (height < 500)
                return "480p";
            return "HD";
        },

        elementFileInfo: function(elementType, elementEvent, elementAttrs, file) {
            try {
                var element = document.createElement(elementType);
                Objs.iter(elementAttrs, function(value, key) {
                    element[key] = value;
                });
                var promise = Promise.create();
                var failed = false;
                var timer = setTimeout(function() {
                    failed = true;
                    promise.asyncError("Timeout");
                }, 1000);
                element[elementEvent] = function() {
                    if (failed)
                        return;
                    clearTimeout(timer);
                    promise.asyncSuccess(element);
                };
                element.src = (window.URL || window.webkitURL).createObjectURL(file);
                return promise;
            } catch (e) {
                return Promise.error(e);
            }
        },

        videoFileInfo: function(file) {
            return this.elementFileInfo("video", "onloadeddata", {
                volume: 0,
                muted: true,
                preload: true
            }, file).mapSuccess(function(video) {
                return {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                };
            });
        },

        audioFileInfo: function(file) {
            return this.elementFileInfo("audio", "onloadeddata", {
                volume: 0,
                muted: true,
                preload: true
            }, file).mapSuccess(function(audio) {
                return {
                    duration: audio.duration
                };
            });
        },

        imageFileInfo: function(file) {
            return this.elementFileInfo("img", "onload", {}, file).mapSuccess(function(image) {
                return {
                    width: image.width,
                    height: image.height
                };
            });
        }

    };
});
Scoped.define("module:Player.VideoPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "browser:Events"
], function(OptimisticConditionalInstance, EventsMixin, Types, Objs, Strings, DomEvents, scoped) {
    return OptimisticConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options, transitionals) {
                inherited.constructor.call(this);
                options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
                this._poster = options.poster || null;
                var sources = options.source || options.sources || [];
                if (Types.is_string(sources))
                    sources = sources.split(" ");
                else if (!Types.is_array(sources))
                    sources = [sources];
                var sourcesMapped = [];
                Objs.iter(sources, function(source) {
                    if (Types.is_string(source))
                        source = {
                            src: source.trim()
                        };
                    else if (typeof Blob !== 'undefined' && source instanceof Blob)
                        source = {
                            src: source
                        };
                    if (source.ext && !source.type)
                        source.type = "video/" + source.ext;
                    if (!source.ext && source.type)
                        source.ext = Strings.last_after(source.type, "/");
                    if (!source.ext && !source.type && Types.is_string(source.src)) {
                        var temp = Strings.splitFirst(source.src, "?").head;
                        if (temp.indexOf(".") >= 0) {
                            source.ext = Strings.last_after(temp, ".");
                            source.type = "video/" + source.ext;
                        }
                    }
                    if (source.ext)
                        source.ext = source.ext.toLowerCase();
                    if (source.type)
                        source.type = source.type.toLowerCase();
                    if (typeof Blob !== 'undefined' && source.src instanceof Blob)
                        source.src = (typeof options.onlyaudio !== 'undefined' && options.onlyaudio) ?
                        (window.URL || window.webkitURL).createObjectURL(source.audiosrc) :
                        (window.URL || window.webkitURL).createObjectURL(source.src);
                    if (typeof Blob !== 'undefined' && source.audiosrc instanceof Blob)
                        source.audiosrc = (window.URL || window.webkitURL).createObjectURL(source.audiosrc);
                    sourcesMapped.push(source);
                }, this);
                this._sources = sourcesMapped;
                this._element = options.element;
                this._preload = options.preload || false;
                this._reloadonplay = options.reloadonplay || false;
                this._options = options;
                this._loop = options.loop || false;
                this._loaded = false;
                this._postererror = false;
                this._error = 0;
                this._domEvents = new DomEvents();
                this._broadcastingState = {
                    googleCastConnected: false,
                    airplayConnected: false
                };
            },

            destroy: function() {
                this._domEvents.destroy();
                inherited.destroy.call(this);
            },

            poster: function() {
                return this._poster;
            },

            sources: function() {
                return this._sources;
            },

            loaded: function() {
                return this._loaded;
            },

            postererror: function() {
                return this._postererror;
            },

            buffered: function() {},

            _eventLoaded: function() {
                this._loaded = true;
                this.trigger("loaded");
            },

            _eventPlaying: function() {
                if (!this._loaded)
                    this._eventLoaded();
                this.trigger("playing");
            },

            _eventPaused: function() {
                if (this.duration() && this.duration() === this.position())
                    return;
                this.trigger("paused");
            },

            _eventEnded: function() {
                this.trigger("ended");
            },

            _eventError: function(error) {
                this._error = error;
                this.trigger("error", error);
            },

            _eventPosterError: function() {
                this._postererror = true;
                this.trigger("postererror");
            },

            supportsFullscreen: function() {
                return false;
            },

            duration: function() {
                return this._element.duration;
            },

            position: function() {
                return this._element.currentTime;
            },

            enterFullscreen: function() {},

            exitFullscreen: function() {},

            isFullscreen: function() {
                return false;
            },

            error: function() {
                return this._error;
            },

            play: function() {
                if (this._reloadonplay)
                    this._element.load();
                this._reloadonplay = false;
                try {
                    var result = this._element.play();
                    if (result['catch'])
                        result['catch'](function() {});
                } catch (e) {}
            },

            pause: function() {
                this._element.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
            },

            muted: function() {
                return this._element.muted;
            },

            setMuted: function(muted) {
                this._element.muted = muted;
            },

            volume: function() {
                return this._element.volume;
            },

            setVolume: function(volume) {
                this._element.volume = volume;
            },

            videoWidth: function() {},

            videoHeight: function() {}

        };
    }], {

        ERROR_NO_PLAYABLE_SOURCE: 1,
        ERROR_FLASH_NOT_INSTALLED: 2

    });
});


Scoped.define("module:Player.Html5VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "browser:Dom",
    "browser:Events"
], function(VideoPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, Dom, DomEvents, scoped) {
    return VideoPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.nohtml5)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)
                    return Promise.error(true);
                if (this._options.forceflash)
                    return Promise.error(true);
                var self = this;
                var promise = Promise.create();
                this._element.innerHTML = "";
                var sources = this.sources();
                var blobSource = sources[0].src.indexOf("blob:") === 0 ? sources[0].src : false;
                var ie9 = (Info.isInternetExplorer() && Info.internetExplorerVersion() == 9) || Info.isWindowsPhone();
                if (this._element.tagName.toLowerCase() !== "video") {
                    this._element = Dom.changeTag(this._element, "video");
                    this._transitionals.element = this._element;
                } else if (ie9) {
                    var str = Strings.splitLast(this._element.outerHTML, "</video>").head;
                    Objs.iter(sources, function(source) {
                        str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
                    });
                    str += "</video>";
                    var replacement = Dom.elementByTemplate(str);
                    Dom.elementInsertAfter(replacement, this._element);
                    this._element.parentNode.removeChild(this._element);
                    this._element = replacement;
                    this._transitionals.element = this._element;
                }
                if (Info.isSafari() && Info.safariVersion() < 6) {
                    this._element.src = sources[0].src;
                    this._preload = true;
                }
                /*
                var loadevent = "loadedmetadata";
                if (Info.isSafari() && Info.safariVersion() < 9)
                	loadevent = "loadstart";
                	*/
                var loadevent = "loadstart";
                this._domEvents.on(this._element, "loadevent", function() {
                    if ( /*loadevent === "loadstart" && */ this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                        promise.asyncError(true);
                        return;
                    }
                    promise.asyncSuccess(true);
                }, this);
                var nosourceCounter = 10;
                var timer = new Timer({
                    context: this,
                    fire: function() {
                        if (this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                            nosourceCounter--;
                            if (nosourceCounter <= 0)
                                promise.asyncError(true);
                        } else if (this._element.networkState === this._element.NETWORK_IDLE)
                            promise.asyncSuccess(true);
                        else if (this._element.networkState === this._element.NETWORK_LOADING) {
                            if (Info.isEdge() || Info.isInternetExplorer())
                                promise.asyncSuccess(true);
                            else if (Info.isFirefox() && !!blobSource)
                                promise.asyncSuccess(true);
                        }
                    },
                    delay: 50
                });
                this._element.preload = this._preload ? "auto" : "none";
                if (this._loop)
                    this._element.loop = "loop";
                var errorCount = 0;
                this._audioElement = null;
                var errorEvents = new DomEvents();
                if (blobSource) {
                    this._element.src = blobSource;
                } else if (!ie9) {
                    Objs.iter(sources, function(source) {
                        var sourceEl = document.createElement("source");
                        if (source.type)
                            sourceEl.type = source.type;
                        this._element.appendChild(sourceEl);
                        errorEvents.on(sourceEl, "error", function() {
                            errorCount++;
                            if (errorCount === sources.length)
                                promise.asyncError(true);
                        });
                        sourceEl.src = source.src;
                        if (source.audiosrc) {
                            if (!this._audioElement) {
                                this._audioElement = document.createElement("audio");
                                Dom.elementInsertAfter(this._audioElement, this._element);
                            }
                            var audioSourceEl = document.createElement("source");
                            if (source.type)
                                audioSourceEl.type = source.type;
                            this._audioElement.appendChild(audioSourceEl);
                            audioSourceEl.src = source.audiosrc;
                        }
                    }, this);
                } else {
                    var sourceEls = this._element.getElementsByTagName("SOURCE");
                    var cb = function() {
                        errorCount++;
                        if (errorCount === sources.length)
                            promise.asyncError(true);
                    };
                    for (var i = 0; i < sourceEls.length; ++i) {
                        errorEvents.on(sourceEls[i], "error", cb);
                    }
                }
                if (this.poster())
                    this._element.poster = this.posterURL();
                promise.callback(function() {
                    errorEvents.weakDestroy();
                    timer.destroy();
                }, this);
                promise.success(function() {
                    this._setup();
                }, this);
                try {
                    if (!Info.isChrome())
                        this._element.load();
                } catch (e) {}
                return promise;
            },

            posterURL: function() {
                var poster = this.poster();
                if (poster && typeof Blob !== 'undefined' && poster instanceof Blob)
                    return (window.URL || window.webkitURL).createObjectURL(poster);
                return poster;
            },

            destroy: function() {
                if (this._audioElement)
                    this._audioElement.remove();
                if (this.supportsFullscreen() && this.__fullscreenListener)
                    Dom.elementOffFullscreenChange(this._element, this.__fullscreenListener);
                if (!Info.isInternetExplorer() || Info.internetExplorerVersion() > 8)
                    this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = false;
                this._domEvents.on(this._element, "canplay", this._eventLoaded, this);
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                var self = this;
                var sourceEls = this._element.getElementsByTagName("SOURCE");
                var cb = function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                };
                for (var i = 0; i < sourceEls.length; ++i) {
                    this._domEvents.on(sourceEls[i], "error", cb, this);
                }
                if (this.poster()) {
                    var image = new Image();
                    image.onerror = function() {
                        delete self._element.poster;
                        delete self._element.preload;
                        self._eventPosterError();
                    };
                    image.src = this.posterURL();
                    image.onload = function() {
                        self.__imageWidth = image.width;
                        self.__imageHeight = image.height;
                    };
                }
                if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
                    if (this._element.networkState === this._element.NETWORK_LOADING) {
                        Async.eventually(function() {
                            if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
                                this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                        }, this, 10000);
                    }
                }
                if (this.supportsFullscreen()) {
                    this.__videoClassBackup = "";
                    this.__fullscreenListener = Dom.elementOnFullscreenChange(this._element, function(element, inFullscreen) {
                        this.trigger("fullscreen-change", inFullscreen);
                        if (inFullscreen) {
                            this.__videoClassBackup = this._element.className;
                            this._element.className = "";
                        } else {
                            this._element.className = this.__videoClassBackup;
                            this.__videoClassBackup = "";
                        }
                    }, this);
                }
            },

            buffered: function() {
                return this._element.buffered.end(0);
            },

            // Element argument or this._element.parent* has to be top layer (https://fullscreen.spec.whatwg.org/#top-layer)
            // The z-index property has no effect in the top layer.
            _fullscreenElement: function(element) {
                //fullscreen issue was present on Chromium based browsers. Could recreate on Iron and Chrome.
                if (Info.isChromiumBased() && !Info.isMobile()) {
                    return element || this._element.parentNode;
                }

                return Info.isFirefox() ?
                    element || this._element.parentElement :
                    element || this._element;
            },

            supportsFullscreen: function(element) {
                return Dom.elementSupportsFullscreen(this._fullscreenElement(element));
            },

            enterFullscreen: function(element) {
                Dom.elementEnterFullscreen(this._fullscreenElement(element));
            },

            exitFullscreen: function() {
                Dom.documentExitFullscreen();
            },

            isFullscreen: function(element) {
                return Dom.elementIsFullscreen(this._fullscreenElement(element));
            },

            videoWidth: function() {
                return this._element.width || this.__imageWidth || NaN;
            },

            videoHeight: function() {
                return this._element.height || this.__imageHeight || NaN;
            },

            play: function() {
                inherited.play.call(this);
                if (this._audioElement) {
                    if (this._reloadonplay)
                        this._audioElement.load();
                    this._audioElement.play();
                }
            },

            pause: function() {
                this._element.pause();
                if (this._audioElement)
                    this._audioElement.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
                if (this._audioElement)
                    this._audioElement.currentTime = position;
            },

            setSpeed: function(speed) {
                if (speed < 0.5 && speed > 4.0) {
                    console.warn('Maximum allowed speed range is from 0.5 to 4.0');
                    return;
                }
                this._element.playbackRate = speed;
                if (this._audioElement)
                    this._audioElement.playbackRate = speed;
            },

            muted: function() {
                return (this._audioElement ? this._audioElement : this._element).muted;
            },

            setMuted: function(muted) {
                (this._audioElement ? this._audioElement : this._element).muted = muted;
            },

            volume: function() {
                return (this._audioElement ? this._audioElement : this._element).volume;
            },

            setVolume: function(volume) {
                (this._audioElement ? this._audioElement : this._element).volume = volume;
            }

        };
    });
});


Scoped.define("module:Player.FlashPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.FlashPlayer",
    "browser:Info",
    "base:Promise",
    "browser:Dom"
], function(VideoPlayerWrapper, FlashPlayer, Info, Promise, Dom, scoped) {
    return VideoPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.noflash)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isMobile() || !Info.flash().supported())
                    return Promise.error(true);
                if (!Info.flash().installed() && this._options.flashinstallrequired)
                    return Promise.error(true);
                if (!Info.flash().installed()) {
                    this._eventError(this.cls.ERROR_NO_FLASH_INSTALLED);
                    return Promise.value(true);
                }
                var self = this;
                var promise = Promise.create();
                if (this._element.tagName.toLowerCase() !== "div") {
                    this._element = Dom.changeTag(this._element, "div");
                    this._transitionals.element = this._element;
                }
                var opts = {
                    poster: this.poster(),
                    sources: this.sources()
                };
                if (this._loop)
                    opts.loop = true;
                this._flashPlayer = new FlashPlayer(this._element, opts);
                return this._flashPlayer.ready.success(function() {
                    this._setup();
                }, this);
            },

            destroy: function() {
                if (this._flashPlayer)
                    this._flashPlayer.weakDestroy();
                this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = true;
                this._eventLoaded();
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                this._domEvents.on(this._element, "videoerror", function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                }, this);
                this._domEvents.on(this._element, "postererror", this._eventPosterError, this);
            },

            position: function() {
                return this._element.get("currentTime");
            },

            buffered: function() {
                return this.position();
            },

            setPosition: function(position) {
                this._element.set("currentTime", position);
            },

            setVolume: function(volume) {
                this._element.set("volume", volume);
            },

            videoWidth: function() {
                return this._flashPlayer ? this._flashPlayer.videoWidth() : null;
            },

            videoHeight: function() {
                return this._flashPlayer ? this._flashPlayer.videoHeight() : null;
            }

        };
    });
});



Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.Html5VideoPlayerWrapper"
], function(VideoPlayerWrapper, Html5VideoPlayerWrapper) {
    VideoPlayerWrapper.register(Html5VideoPlayerWrapper, 2);
    return {};
});


Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.FlashPlayerWrapper"
], function(VideoPlayerWrapper, FlashPlayerWrapper) {
    VideoPlayerWrapper.register(FlashPlayerWrapper, 1);
    return {};
});
Scoped.define("module:Flash.FlashRecorder", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Timers.Timer",
    "base:Time",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, Promise, EventsMixin, PixelSampleMixin, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false,
                    hasEmbedding: this.readAttr("hasembedding") || false,
                    namespace: this.readAttr("embednamespace") || null
                }, {
                    parentBgcolor: true,
                    fixHalfPixels: true
                }));
                this._flashObjs = {};
                this.ready = Promise.create();
                this.__status = "idle";
                this.__disableVideo = this.readAttr('disablevideo') || false;
                this.__disableAudio = this.readAttr('disableaudio') || false;
                this.__cameraWidth = this.readAttr('camerawidth') || 640;
                this.__cameraHeight = this.readAttr('cameraheight') || 480;
                this.__audioRate = this.readAttr('audiorate') || 44;
                this.__audioQuality = this.readAttr('audioquality') || 10;
                this.__videoRate = this.readAttr('videorate') || 0;
                this.__videoQuality = this.readAttr('videoquality') || 90;
                this.__streamType = this.readAttr("streamtype") || 'mp4';
                this.__microphoneCodec = this.readAttr("microphonecodec") || 'speex';
                this.__fps = this.readAttr('fps') || 20;
                this.__defaultGain = 55;
                this._flip = Types.parseBool(this.readAttr("flip") || false);
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            averageFrameRate: function() {
                return this.__fps;
            },

            __initializeEmbedding: function() {
                this.__hasMicrophoneActivity = false;
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.video = this._embedding.newObject(
                    "flash.media.Video",
                    this._flashObjs.stage.get("stageWidth"),
                    this._flashObjs.stage.get("stageHeight")
                );
                this._flashObjs.cameraVideo = this._embedding.newObject(
                    "flash.media.Video",
                    this.__cameraWidth,
                    this.__cameraHeight
                );
                this._flashObjs.main.addChildVoid(this._flashObjs.video);
                this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
                this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
                this._flashObjs.microphone = !Types.is_empty(this._flashObjs.Microphone.get('names').length > 0) ? this._flashObjs.Microphone.getMicrophone(0) : null;
                this.setMicrophoneProfile();
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(0);
                this._currentCamera = 0;
                this._currentMicrophone = 0;
                this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
                this.recomputeBB();
                this.ready.asyncSuccess(this);
                this.auto_destroy(new Timer({
                    delay: 100,
                    fire: this._fire,
                    context: this
                }));
            },

            isAccessGranted: function() {
                try {
                    return ((!this._flashObjs.camera || !this._flashObjs.camera.get('muted')) &&
                        (!this._flashObjs.microphone || !this._flashObjs.microphone.get('muted')));
                } catch (e) {
                    return false;
                }
            },

            isSecurityDialogOpen: function() {
                var dummy = this._embedding.newObject("flash.display.BitmapData", 1, 1);
                var open = false;
                try {
                    dummy.draw(this._flashObjs.stage);
                } catch (e) {
                    open = true;
                }
                dummy.dispose();
                dummy.destroy();
                return open;
            },

            openSecurityDialog: function(fullSecurityDialog) {
                this.trigger("require_display");
                if (fullSecurityDialog)
                    this._flashObjs.Security.showSettings("privacy");
                else {
                    this._flashObjs.video.attachCamera(null);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                }
            },

            grantAccess: function(fullSecurityDialog, allowDeny) {
                var promise = Promise.create();
                var timer = new Timer({
                    fire: function() {
                        if (this.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        if (this.isSecurityDialogOpen())
                            return;
                        if (this.isAccessGranted()) {
                            timer.destroy();
                            promise.asyncSuccess(true);
                        } else {
                            if (allowDeny) {
                                timer.destroy();
                                promise.asyncError(true);
                            } else
                                this.openSecurityDialog(fullSecurityDialog);
                        }
                    },
                    context: this,
                    delay: 10,
                    start: true
                });
                return promise;
            },

            bindMedia: function(fullSecurityDialog, allowDeny) {
                return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function() {
                    this._mediaBound = true;
                    this._attachCamera();
                }, this);
            },

            unbindMedia: function() {
                this._detachCamera();
                this._mediaBound = false;
            },

            _attachCamera: function() {
                if (this._flashObjs.camera) {
                    this._flashObjs.camera.setMode(this.__cameraWidth, this.__cameraHeight, this.__fps);
                    this._flashObjs.camera.setQuality(this.__videoRate, this.__videoQuality);
                    this._flashObjs.camera.setKeyFrameInterval(5);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                    this._flashObjs.cameraVideo.attachCamera(this._flashObjs.camera);
                }
                if (this.__disableVideo) {
                    this._flashObjs.video.attachCamera(null);
                    this._flashObjs.cameraVideo.attachCamera(null);
                }
                if (this._flip) {
                    if (this._flashObjs.video.get("scaleX") > 0)
                        this._flashObjs.video.set("scaleX", -this._flashObjs.video.get("scaleX"));
                    this._flashObjs.video.set("x", this._flashObjs.video.get("width"));
                }
            },

            _detachCamera: function() {
                this._flashObjs.video.attachCamera(null);
                this._flashObjs.cameraVideo.attachCamera(null);
            },

            enumerateDevices: function() {
                return {
                    audios: this._flashObjs.Microphone.get('names'),
                    videos: this._flashObjs.Camera.get('names')
                };
            },

            selectMicrophone: function(index) {
                if (this._flashObjs.microphone)
                    this._flashObjs.microphone.weakDestroy();
                this.__hasMicrophoneActivity = false;
                this.__microphoneActivityTime = null;
                this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(index);
                this._currentMicrophone = index;
                this.setMicrophoneProfile(this._currentMicrophoneProfile);
            },

            selectCamera: function(index) {
                if (this._flashObjs.camera)
                    this._flashObjs.camera.weakDestroy();
                this.__cameraActivityTime = null;
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(index);
                this._currentCamera = index;
                if (this._mediaBound)
                    this._attachCamera();
            },

            currentCamera: function() {
                return this._currentCamera;
            },

            currentMicrophone: function() {
                return this._currentMicrophone;
            },

            microphoneInfo: function() {
                return this._flashObjs.microphone ? {
                    muted: this._flashObjs.microphone.get("muted"),
                    name: this._flashObjs.microphone.get("name"),
                    activityLevel: this._flashObjs.microphone.get("activityLevel"),
                    gain: this._flashObjs.microphone.get("gain"),
                    rate: this._flashObjs.microphone.get("rate"),
                    encodeQuality: this._flashObjs.microphone.get("encodeQuality"),
                    codec: this._flashObjs.microphone.get("codec"),
                    hadActivity: this.__hadMicrophoneActivity,
                    inactivityTime: this.__microphoneActivityTime ? Time.now() - this.__microphoneActivityTime : null
                } : {};
            },

            cameraInfo: function() {
                if (!this._flashObjs.camera)
                    return {};
                return {
                    muted: this._flashObjs.camera.get("muted"),
                    name: this._flashObjs.camera.get("name"),
                    activityLevel: this._flashObjs.camera.get("activityLevel"),
                    fps: this._flashObjs.camera.get("fps"),
                    width: this._flashObjs.camera.get("width"),
                    height: this._flashObjs.camera.get("height"),
                    inactivityTime: this.__cameraActivityTime ? Time.now() - this.__cameraActivityTime : null
                };
            },

            setMicrophoneProfile: function(profile) {
                if (!this._flashObjs.microphone)
                    return;
                profile = profile || {};
                this._flashObjs.microphone.setLoopBack(profile.loopback || false);
                this._flashObjs.microphone.set("gain", profile.gain || this.__defaultGain);
                this._flashObjs.microphone.setSilenceLevel(profile.silenceLevel || 0);
                this._flashObjs.microphone.setUseEchoSuppression(profile.echoSuppression || false);
                this._flashObjs.microphone.set("rate", profile.rate || this.__audioRate);
                this._flashObjs.microphone.set("encodeQuality", profile.encodeQuality || this.__audioQuality);
                this._flashObjs.microphone.set("codec", profile.codec || this.__microphoneCodec);
                this._currentMicrophoneProfile = profile;
            },

            getVolumeGain: function() {
                var gain = this._mediaBound ? this._flashObjs.micropone.get("gain") : 55;
                return gain / 55.0;
            },

            setVolumeGain: function(volumeGain) {
                this.__defaultGain = Math.min(Math.max(0, Math.round(volumeGain * 55)), 100);
                if (this._mediaBound && this._flashObjs.microphone)
                    this._flashObjs.microphone.set("gain", this.__defaultGain);
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var w = this._flashObjs.cameraVideo.get("width");
                var h = this._flashObjs.cameraVideo.get("height");
                var wc = Math.ceil(Math.sqrt(w / h * samples));
                var hc = Math.ceil(Math.sqrt(h / w * samples));
                var lightLevelBmp = this._embedding.newObject("flash.display.BitmapData", wc, hc);
                var scaleMatrix = this._embedding.newObject("flash.geom.Matrix");
                scaleMatrix.scale(wc / w, hc / h);
                lightLevelBmp.draw(this._flashObjs.cameraVideo, scaleMatrix);
                for (var i = 0; i < samples; ++i) {
                    var x = i % wc;
                    var y = Math.floor(i / wc);
                    var rgb = lightLevelBmp.getPixel(x, y);
                    callback.call(context || this, rgb % 256, (rgb / 256) % 256, (rgb / 256 / 256) % 256);
                }
                scaleMatrix.destroy();
                lightLevelBmp.destroy();
            },

            testSoundLevel: function(activate) {
                this.setMicrophoneProfile(activate ? {
                    loopback: true,
                    gain: 55,
                    silenceLevel: 100,
                    echoSuppression: true
                } : {});
            },

            soundLevel: function() {
                return this._flashObjs.microphone ? this._flashObjs.microphone.get("activityLevel") : 0;
            },

            _fire: function() {
                if (!this._mediaBound)
                    return;
                this.__hadMicrophoneActivity = this.__hadMicrophoneActivity || (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0);
                if (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0)
                    this.__microphoneActivityTime = Time.now();
                if (this._flashObjs.camera) {
                    var currentCameraActivity = this._flashObjs.camera.get("activityLevel");
                    if (!this.__lastCameraActivity || this.__lastCameraActivity !== currentCameraActivity)
                        this.__cameraActivityTime = Time.now();
                    this.__lastCameraActivity = currentCameraActivity;
                }
            },

            createSnapshot: function() {
                var bmp = this._embedding.newObject(
                    "flash.display.BitmapData",
                    this._flashObjs.cameraVideo.get("videoWidth"),
                    this._flashObjs.cameraVideo.get("videoHeight")
                );
                bmp.draw(this._flashObjs.cameraVideo);
                return bmp;
            },

            postSnapshot: function(bmp, url, type, quality) {
                var promise = Promise.create();
                quality = quality || 90;
                var header = this._embedding.newObject("flash.net.URLRequestHeader", "Content-type", "application/octet-stream");
                var request = this._embedding.newObject("flash.net.URLRequest", url);
                request.set("requestHeaders", [header]);
                request.set("method", "POST");
                if (type === "jpg") {
                    var jpgEncoder = this._embedding.newObject("com.adobe.images.JPGEncoder", quality);
                    request.set("data", jpgEncoder.encode(bmp));
                    jpgEncoder.destroy();
                } else {
                    var PngEncoder = this._embedding.getClass("com.adobe.images.PNGEncoder");
                    request.set("data", PngEncoder.encode(bmp));
                }
                var poster = this._embedding.newObject("flash.net.URLLoader");
                poster.set("dataFormat", "BINARY");

                // In case anybody is wondering, no, the progress event does not work for uploads:
                // http://stackoverflow.com/questions/2106682/a-progress-event-when-uploading-bytearray-to-server-with-as3-php/2107059#2107059

                poster.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncSuccess(true);
                }, this)));
                poster.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncError("IO Error");
                }, this)));
                poster.load(request);
                promise.callback(function() {
                    poster.destroy();
                    request.destroy();
                    header.destroy();
                });
                return promise;
            },

            createSnapshotDisplay: function(bmpData, x, y, w, h) {
                var bmp = this._embedding.newObject("flash.display.Bitmap", bmpData);
                this.updateSnapshotDisplay(bmpData, bmp, x, y, w, h);
                this._flashObjs.main.addChildVoid(bmp);
                return bmp;
            },

            updateSnapshotDisplay: function(bmpData, bmp, x, y, w, h) {
                bmp.set("x", x);
                bmp.set("y", y);
                bmp.set("scaleX", w / bmpData.get("width"));
                bmp.set("scaleY", h / bmpData.get("height"));
            },

            removeSnapshotDisplay: function(snapshot) {
                try {
                    this._flashObjs.main.removeChildVoid(snapshot);
                } catch (e) {}
                snapshot.destroy();
            },

            idealBB: function() {
                return {
                    width: this.__cameraWidth,
                    height: this.__cameraHeight
                };
            },

            setActualBB: function(actualBB) {
                ["object", "embed"].forEach(function(tag) {
                    var container = this._element.getElementsByTagName(tag.toUpperCase())[0];
                    if (container) {
                        ["width", "height"].forEach(function(attr) {
                            container.style[attr] = actualBB[attr] + "px";
                        });
                    }
                }, this);
                var video = this._flashObjs.video;
                if (video) {
                    video.set("width", actualBB.width);
                    video.set("height", actualBB.height);
                    if (this._flip) {
                        if (video.get("scaleX") > 0)
                            video.set("scaleX", -video.get("scaleX"));
                        video.set("x", video.get("width"));
                    }
                }
            },

            _error: function(s) {
                this.__status = "error";
                this.trigger("error", s);
            },

            _status: function(s) {
                if (s && s !== this.__status) {
                    this.__status = s;
                    this.trigger("status", s);
                    this.trigger(s);
                }
                return this.__status;
            },

            __newCallback: function(endpoint, endpoints) {
                var active = true;
                var timer = null;
                var badEndpoint = function() {
                    clearTimeout(timer);
                    if (!active)
                        return;
                    active = false;
                    this.trigger("endpoint_connectivity", this.__endpoint, -1);
                    if (endpoints.length > 0) {
                        endpoint = endpoints.shift();
                        this._flashObjs.connection.closeVoid();
                        this._flashObjs.connection.destroy();
                        this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                        this._flashObjs.connection.addEventListener("netStatus", this.__newCallback(endpoint, endpoints));
                        this.__endpoint = endpoint;
                        this._flashObjs.connection.connectVoid(endpoint.serverUrl);
                    } else
                        this._error("Could not connect to server");
                };
                var self = this;
                timer = setTimeout(function() {
                    badEndpoint.call(self);
                }, 10000);
                return this._embedding.newCallback(Functions.as_method(function(event) {
                    if (!active)
                        return;
                    var code = event.get("info").code;
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'recording') {
                        active = false;
                        this._error("Connection to server interrupted.");
                        return;
                    }
                    if ((code === "NetConnection.Connect.Success" && this._status() !== 'connecting') ||
                        (code === "NetConnection.Connect.Closed" && this._status() === 'connecting') ||
                        (code === "NetConnection.Connect.Failed" && this._status() === 'connecting')) {
                        badEndpoint.call(this);
                        return;
                    }
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'uploading') {
                        this._status('finished');
                        return;
                    }
                    if (code === "NetConnection.Connect.Success" && this._status() === 'connecting') {
                        this.trigger("endpoint_connectivity", this.__endpoint, 1);
                        clearTimeout(timer);
                        if (this.__streamType === 'mp4')
                            this._flashObjs.connection.callVoid("setStreamType", null, "live");
                        this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
                        this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(function(event) {
                            var code = event.get("info").code;
                            if (code === "NetStream.Record.Start") {
                                this._status('recording');
                                return;
                            }
                            if (code === "NetStream.Play.StreamNotFound") {
                                this._flashObjs.stream.closeVoid();
                                if (this._status() !== "none")
                                    this._error("Stream not found");
                                return;
                            }
                            // buffer empty and stopped means OK to close stream
                            if (code === "NetStream.Buffer.Empty") {
                                if (this._status() === "uploading" && this.__streamType === 'mp4') {
                                    this._flashObjs.stream.publish(null);
                                }
                            }
                            if (code === "NetStream.Unpublish.Success" ||
                                (this._status() === "uploading" && code === "NetStream.Buffer.Empty" &&
                                    this.__streamType === "flv" && this._flashObjs.stream.get('bufferLength') === 0)) {
                                this._flashObjs.stream.closeVoid();
                                this._flashObjs.stream.destroy();
                                this._flashObjs.stream = null;
                                this._flashObjs.connection.closeVoid();
                                this._flashObjs.connection.destroy();
                                this._flashObjs.connection = null;
                                this._status('finished');
                            }
                        }, this)));
                        this._flashObjs.stream.set("bufferTime", 120);
                        if (this.__streamType === 'mp4') {
                            this._flashObjs.h264Settings = this._embedding.newObject("flash.media.H264VideoStreamSettings");
                            this._flashObjs.h264Settings.setProfileLevel("baseline", "3.1");
                            this._flashObjs.stream.set("videoStreamSettings", this._flashObjs.h264Settings);
                        }
                        if (!this.__disableVideo)
                            this._flashObjs.stream.attachCameraVoid(this._flashObjs.camera);
                        if (!this.__disableAudio)
                            this._flashObjs.stream.attachAudioVoid(this._flashObjs.microphone);
                        this._flashObjs.stream.publish(endpoint.streamName, "record");
                    }
                }, this));
            },

            startRecord: function(endpoints) {
                if (arguments.length > 1) {
                    endpoints = {
                        serverUrl: endpoints,
                        streamName: arguments[1]
                    };
                }
                if (!Types.is_array(endpoints))
                    endpoints = [endpoints];
                this._status("connecting");
                var endpoint = endpoints.shift();
                var cb = this.__newCallback(endpoint, endpoints);
                this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                this._flashObjs.connection.addEventListener("netStatus", cb);
                this.__endpoint = endpoint;
                this._flashObjs.connection.connectVoid(endpoint.serverUrl);
            },

            stopRecord: function() {
                if (this._status() !== "recording")
                    return;
                this.__initialBufferLength = 0;
                this._status("uploading");
                this.__initialBufferLength = this._flashObjs.stream.get("bufferLength");
                try {
                    this._flashObjs.stream.attachAudioVoid(null);
                } catch (e) {}
                this._flashObjs.stream.attachCameraVoid(null);
                /*try {
                    if (this.__endpoint.serverUrl.indexOf("rtmpt") === 0) {
                        this._flashObjs.stream.publishVoid("null");
                        this._flashObjs.stream.closeVoid();
                    }
                } catch (e) {}*/
            },

            uploadStatus: function() {
                return {
                    total: this.__initialBufferLength,
                    remaining: this._flashObjs.stream.get("bufferLength")
                };
            }

        };
    }], {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Microphone", ["setLoopBack", "setSilenceLevel", "setUseEchoSuppression"], ["getMicrophone"]);
                this.__flashRegistry.register("flash.media.Camera", ["setMode", "setQuality", "setKeyFrameInterval", "addEventListener"], ["getCamera"]);
                this.__flashRegistry.register("flash.media.Video", ["attachCamera", "attachNetStream"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
                this.__flashRegistry.register("flash.media.H264VideoStreamSettings", ["setProfileLevel"]);
                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek", "attachCamera", "attachAudio", "publish", "close"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener", "call", "close"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.net.URLRequestHeader", []);
                this.__flashRegistry.register("flash.net.URLLoader", ["addEventListener", "load"]);
                this.__flashRegistry.register("flash.display.Sprite", ["addChild", "removeChild", "setChildIndex"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.display.Loader", ["load"]);
                this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
                this.__flashRegistry.register("flash.display.BitmapData", ["draw", "getPixel", "dispose"]);
                this.__flashRegistry.register("flash.display.Bitmap", []);
                this.__flashRegistry.register("flash.geom.Matrix", ["scale"]);
                this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
                this.__flashRegistry.register("com.adobe.images.PNGEncoder", [], ["encode"]);
                this.__flashRegistry.register("com.adobe.images.JPGEncoder", ["encode"]);
            }
            return this.__flashRegistry;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});
Scoped.define("module:Flash.Support", [
    "base:Promise",
    "base:Timers.Timer",
    "base:Async",
    "base:Objs",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "browser:Info"
], function(Promise, Timer, Async, Objs, FlashClassRegistry, FlashEmbedding, Info) {
    return {

        flashCanConnect: function(url, timeout) {
            if (!Info.flash().installed())
                return Promise.error(false);
            var promise = Promise.create();
            var registry = new FlashClassRegistry();
            registry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
            var embedding = new FlashEmbedding(null, {
                registry: registry,
                wrap: true
            });
            embedding.ready(function() {
                var connection = embedding.newObject("flash.net.NetConnection");
                connection.addEventListener("netStatus", embedding.newCallback(function(event) {
                    if (event.get("info") && event.get("info").code === "NetConnection.Connect.Success")
                        promise.asyncSuccess(true);
                    else
                        promise.asyncError(false);
                }));
                connection.connectVoid(url);
            });
            var timer = null;
            if (timeout) {
                timer = new Timer({
                    delay: timeout,
                    once: true,
                    start: true,
                    fire: function() {
                        promise.asyncError();
                    }
                });
            }
            promise.callback(function() {
                if (timer)
                    timer.destroy();
                Async.eventually(function() {
                    embedding.destroy();
                });
            });
            return promise;
        },

        enumerateMediaSources: function() {
            if (!Info.flash().installed())
                return Promise.error(false);
            var promise = Promise.create();
            var registry = new FlashClassRegistry();
            registry.register("flash.media.Microphone");
            registry.register("flash.media.Camera");
            var embedding = new FlashEmbedding(null, {
                registry: registry,
                wrap: true
            });
            embedding.ready(function() {
                var videos = embedding.getClass("flash.media.Camera").get("names");
                var audios = embedding.getClass("flash.media.Microphone").get("names");
                promise.asyncSuccess({
                    videoCount: Objs.count(videos),
                    audioCount: Objs.count(audios),
                    video: Objs.map(videos, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    }),
                    audio: Objs.map(audios, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            });
            promise.callback(function() {
                Async.eventually(function() {
                    embedding.destroy();
                });
            });
            return promise;
        }

    };
});
Scoped.define("module:Recorder.Support", [
    "module:WebRTC.Support",
    "browser:Upload.FileUploader",
    "browser:Upload.CustomUploader",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs"
], function(Support, FileUploader, CustomUploader, Dom, Info, Promise, Objs) {
    return {

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {boolean} isUploader
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        createSnapshot: function(type, video, isUploader, h, w, x, y, quality) {
            var _data = this._createSnapshot(type, video, isUploader, h, w, x, y, quality);
            return _data ? Support.dataURItoBlob(_data) : _data;
        },

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {boolean} isUploader
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        _createSnapshot: function(type, video, isUploader, h, w, x, y, quality) {
            x = x || 0;
            y = y || 0;
            quality = quality || 1.0;
            isUploader = isUploader || false;
            var canvas = document.createElement('canvas');
            canvas.width = w || (video.videoWidth || video.clientWidth);
            canvas.height = h || (video.videoHeight || video.clientHeight);
            var orientation = +(canvas.width / canvas.height) > 1.00 ? 'landscape' : 'portrait';
            var _isWebKit = (Info.isSafari() || (Info.isMobile() && Info.isiOS()));
            var _rotationRequired = (orientation === 'portrait') && isUploader && (Info.isFirefox() || _isWebKit);
            var _positionMove = Info.isFirefox() ? 1.00 : 1.25;
            var context = canvas.getContext('2d');

            if (_rotationRequired && this.__detectVerticalSquash(video, canvas.width, canvas.height) !== 1) {
                // Will rotate image
                canvas.width = canvas.width > canvas.height ? canvas.width : canvas.height;
                context.rotate((Math.PI / 180) * 90);
                context.drawImage(video, 0, -canvas.width / _positionMove, canvas.height, canvas.width);
            } else if (_isWebKit && orientation === 'portrait') {
                context.drawImage(video, 0, -canvas.width, canvas.height, canvas.width);
            } else {
                context.drawImage(video, x, y, canvas.width, canvas.height);
            }

            var data = canvas.toDataURL(type, quality);

            if (!this.__isCanvasBlank(canvas))
                return data;
            else
                return null;
        },

        /**
         * Check if snapshot image is blank image
         *
         * @param canvas
         * @return {boolean}
         * @private
         */
        __isCanvasBlank: function(canvas) {
            return !canvas.getContext('2d')
                .getImageData(0, 0, canvas.width, canvas.height).data
                .some(function(channel) {
                    return channel !== 0;
                });
        },

        /**
         * Detecting vertical squash in loaded image.
         * Fixes a bug which squash image vertically while drawing into canvas for some images.
         * This is a bug in iOS6 devices. This function from https://github.com/stomita/ios-imagefile-megapixel
         *
         */
        __detectVerticalSquash: function(media, w, h) {
            var iw = w || (media.naturalWidth || media.width),
                ih = h || (media.naturalHeight || media.height);
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = ih;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(media, 0, 0);
            var data = ctx.getImageData(0, 0, 1, ih).data;
            // search image edge pixel position in case it is squashed vertically.
            var sy = 0;
            var ey = ih;
            var py = ih;
            while (py > sy) {
                var alpha = data[(py - 1) * 4 + 3];
                if (alpha === 0) {
                    ey = py;
                } else {
                    sy = py;
                }
                py = (ey + sy) >> 1;
            }
            var ratio = (py / ih);
            return (ratio === 0) ? 1 : ratio;
        },

        /**
         * A replacement for context.drawImage
         * (args are for source and destination).
         */
        _drawImageIOSFix: function(ctx, media, sx, sy, sw, sh, dx, dy, dw, dh) {
            // Works only if whole image is displayed:
            // ctx.drawImage(media, sx, sy, sw, sh, dx, dy, dw, dh / vertSquashRatio);
            // The following works correct also when only a part of the image is displayed: ctx.drawImage(media, sx * vertSquashRatio, sy * vertSquashRatio, sw * vertSquashRatio, sh * vertSquashRatio, dx, dy, dw, dh );
        },

        removeSnapshot: function(snapshot) {},

        /**
         *
         * @param {HTMLImageElement} image
         */
        removeSnapshotDisplay: function(image) {
            image.remove();
        },

        /**
         *
         * @param {HTMLElement} parent
         * @param {Data URL} snapshot
         * @param {int} x
         * @param {int} y
         * @param {int} w
         * @param {int} h
         * @return {HTMLImageElement}
         */
        createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
            var url = Support.globals().URL.createObjectURL(snapshot);
            var image = document.createElement("img");
            image.style.position = "absolute";
            this.updateSnapshotDisplay(snapshot, image, x, y, w, h);
            image.src = url;
            if (parent.tagName.toLowerCase() === "video")
                Dom.elementInsertAfter(image, parent);
            else
                Dom.elementPrependChild(parent, image);
            return image;
        },

        /**
         *
         * @param {Data URL} snapshot
         * @return {Promise}
         */
        snapshotMetaData: function(snapshot) {
            var promise = Promise.create();
            var url = Support.globals().URL.createObjectURL(snapshot);
            var image = new Image();
            image.src = url;

            image.onload = function(ev) {
                var _imgHeight = image.naturalHeight || image.height;
                var _imgWidth = image.naturalWidth || image.width;
                var _ratio = +(_imgWidth / _imgHeight).toFixed(2);

                promise.asyncSuccess({
                    width: _imgWidth,
                    height: _imgHeight,
                    orientation: _ratio > 1.00 ? 'landscape' : 'portrait',
                    ratio: _ratio
                });
            };

            return promise;
        },

        /**
         * @param {Data URL} snapshot
         * @param {HTMLImageElement} image
         * @param {int} x
         * @param {int} y
         * @param {int} w
         * @param {int} h
         * @private
         * @return {void}
         */
        updateSnapshotDisplay: function(snapshot, image, x, y, w, h) {
            image.style.left = x + "px";
            image.style.top = y + "px";
            image.style.width = w + "px";
            image.style.height = h + "px";
        },

        /**
         * @param {Boolean} isFlash
         * @param {URI} snapshot
         * @param {string} type
         * @param {Object} uploaderOptions
         * @return {*}
         */
        createSnapshotUploader: function(isFlash, snapshot, type, uploaderOptions) {
            if (isFlash) {
                var uploader = new CustomUploader(Objs.extend({
                    source: snapshot,
                    type: type,
                    recorder: this._recorder
                }, uploaderOptions));
                uploader.on("upload", function(options) {
                    options.recorder.postSnapshot(
                            options.source,
                            options.url,
                            options.type
                        )
                        .success(uploader.successCallback, uploader)
                        .error(uploader.errorCallback, uploader);
                });
                return uploader;
            } else {
                return FileUploader.create(Objs.extend({
                    source: snapshot
                }, uploaderOptions));
            }
        }
    };
});
Scoped.define("module:Recorder.PixelSampleMixin", [], function() {
    return {

        lightLevel: function(samples) {
            samples = samples || 100;
            var total_light = 0.0;
            this._pixelSample(samples, function(r, g, b) {
                total_light += r + g + b;
            });
            return total_light / (3 * samples);
        },

        blankLevel: function(samples) {
            samples = samples || 100;
            var total_light = 0.0;
            this._pixelSample(samples, function(r, g, b) {
                total_light += Math.pow(r, 2) + Math.pow(g, 2) + Math.pow(b, 2);
            });
            return Math.sqrt(total_light / (3 * samples));
        },

        _materializePixelSample: function(sample) {
            var result = [];
            this._pixelSample(sample, function(r, g, b) {
                result.push([r, g, b]);
            });
            return result;
        },

        deltaCoefficient: function(samples) {
            samples = samples || 100;
            var current = this._materializePixelSample(samples);
            if (!this.__deltaSample) {
                this.__deltaSample = current;
                return null;
            }
            var delta_total = 0.0;
            for (var i = 0; i < current.length; ++i)
                for (var j = 0; j < 3; ++j)
                    delta_total += Math.pow(current[i][j] - this.__deltaSample[i][j], 2);
            this.__deltaSample = current;
            return Math.sqrt(delta_total / (3 * samples));
        }

    };
});


Scoped.define("module:Recorder.VideoRecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise"
], function(ConditionalInstance, EventsMixin, Objs, Promise, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._element = this._options.element;
                this.ready = Promise.create();
            },

            destroy: function() {
                inherited.destroy.call(this);
            },

            bindMedia: function() {
                return this._bindMedia();
            },

            _bindMedia: function() {},

            unbindMedia: function() {
                return this._unbindMedia();
            },

            _unbindMedia: function() {},

            softwareDependencies: function() {
                return this._softwareDependencies();
            },

            _softwareDependencies: function() {},

            cameraWidth: function() {
                return this._options.recordingWidth;
            },

            cameraHeight: function() {
                return this._options.recordingHeight;
            },

            lightLevel: function() {},
            soundLevel: function() {},
            testSoundLevel: function(activate) {},
            blankLevel: function() {},
            deltaCoefficient: function() {},

            getVolumeGain: function() {},
            setVolumeGain: function(volumeGain) {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},
            setCameraFace: function(faceFront) {},

            createSnapshot: function() {},
            removeSnapshot: function(snapshot) {},
            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {},
            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {},
            removeSnapshotDisplay: function(display) {},
            createSnapshotUploader: function(snapshot, type, uploaderOptions) {},

            startRecord: function(options) {},
            stopRecord: function(options) {},

            isFlash: function() {
                return false;
            },

            isWebrtcStreaming: function() {
                return false;
            },

            supportsLocalPlayback: function() {
                return false;
            },

            supportsCameraFace: function() {
                return false;
            },

            snapshotToLocalPoster: function(snapshot) {
                return null;
            },

            localPlaybackSource: function() {
                return null;
            },

            averageFrameRate: function() {
                return null;
            },

            recordDelay: function(opts) {
                return 0;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                recordingWidth: 640,
                recordingHeight: 480,
                recordVideo: true,
                recordAudio: true
            }, options);
        }

    });
});


Scoped.define("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "module:WebRTC.AudioAnalyser",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "base:Timers.Timer",
    "base:Comparators",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(VideoRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Info, Time, Objs, Timer, Comparators, FileUploader, MultiUploader, Promise, scoped) {
    return VideoRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "video")
                    this._element = Dom.changeTag(this._element, "video");
                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    flip: !!this._options.flip,
                    framerate: this._options.framerate,
                    recordVideo: this._options.recordVideo,
                    recordFakeVideo: !this._options.recordVideo,
                    recordAudio: this._options.recordAudio,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    videoBitrate: this._options.videoBitrate,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming,
                    webrtcStreamingIfNecessary: this._options.webrtcStreamingIfNecessary,
                    localPlaybackRequested: this._options.localPlaybackRequested,
                    screen: this._options.screen
                });
                this._recorder.on("bound", function() {
                    if (this._analyser)
                        this.testSoundLevel(true);
                }, this);
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
                if (this._analyser)
                    this._analyser.weakDestroy();
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            recordDelay: function(opts) {
                return this._recorder.recordDelay(opts);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia();
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            lightLevel: function() {
                return this._recorder.lightLevel();
            },

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            isWebrtcStreaming: function() {
                return this._recorder.isWebrtcStreaming();
            },

            soundLevel: function() {
                if (!this._analyser && this._recorder && this._recorder.stream() && AudioAnalyser.supported())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
                return this._analyser ? this._analyser.soundLevel() : 0.0;
            },

            testSoundLevel: function(activate) {
                if (this._analyser) {
                    this._analyser.weakDestroy();
                    delete this._analyser;
                }
                if (activate && AudioAnalyser.supported())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
            },

            currentDevices: function() {
                return {
                    video: this._currentVideo,
                    audio: this._currentAudio
                };
            },

            /**
             * Promise which will return available devices with their counts also will set
             * current video and audio devices for the recorder
             * @return {*}
             */
            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {

                    this._detectCurrendDeviceId(result.video, result.videoCount, true);
                    this._detectCurrendDeviceId(result.audio, result.audioCount, false);

                    var timer = this.auto_destroy(new Timer({
                        start: true,
                        delay: 100,
                        context: this,
                        destroy_on_stop: true,
                        fire: function() {
                            if (this._currentVideo && this._currentAudio) {
                                this.trigger("currentdevicesdetected", {
                                    video: this._currentVideo,
                                    audio: this._currentAudio
                                });
                                timer.stop();
                            }
                        }
                    }));

                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            setCameraFace: function(faceFront) {
                if (Info.isMobile())
                    this._recorder.selectCameraFace(faceFront);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot(type);
            },

            removeSnapshot: function(snapshot) {},

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                var url = Support.globals().URL.createObjectURL(snapshot);
                var image = document.createElement("img");
                image.style.position = "absolute";
                this.updateSnapshotDisplay(snapshot, image, x, y, w, h);
                image.src = url;
                if (parent.tagName.toLowerCase() === "video")
                    Dom.elementInsertAfter(image, parent);
                else
                    Dom.elementPrependChild(parent, image);
                return image;
            },

            updateSnapshotDisplay: function(snapshot, image, x, y, w, h) {
                image.style.left = x + "px";
                image.style.top = y + "px";
                image.style.width = w + "px";
                image.style.height = h + "px";
            },

            removeSnapshotDisplay: function(image) {
                image.remove();
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                return FileUploader.create(Objs.extend({
                    source: snapshot
                }, uploaderOptions));
            },

            startRecord: function(options) {
                this.__localPlaybackSource = null;
                return this._recorder.startRecord(options);
            },

            stopRecord: function(options) {
                var promise = Promise.create();
                this._recorder.once("data", function(videoBlob, audioBlob, noUploading) {
                    this.__localPlaybackSource = {
                        src: videoBlob,
                        audiosrc: audioBlob
                    };
                    var multiUploader = new MultiUploader();
                    if (!this._options.simulate && !noUploading) {
                        if (videoBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: videoBlob
                            }, options.video)));
                        }
                        if (audioBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: audioBlob
                            }, options.audio)));
                        }
                    }
                    promise.asyncSuccess(multiUploader);
                }, this);
                this._recorder.stopRecord();
                return promise;
            },

            supportsLocalPlayback: function() {
                return !!this.__localPlaybackSource.src;
            },

            supportsCameraFace: function() {
                return Info.isMobile();
            },

            snapshotToLocalPoster: function(snapshot) {
                return snapshot;
            },

            localPlaybackSource: function() {
                return this.__localPlaybackSource;
            },

            averageFrameRate: function() {
                return this._recorder.averageFrameRate();
            },

            _softwareDependencies: function() {
                if (!this._options.screen || Support.globals().supportedConstraints.mediaSource)
                    return Promise.value(true);
                var ext = Support.chromeExtensionExtract(this._options.screen);
                var err = [{
                    title: "Screen Recorder Extension",
                    execute: function() {
                        window.open(ext.extensionInstallLink);
                    }
                }];
                var pingTest = Time.now();
                return Support.chromeExtensionMessage(ext.extensionId, {
                    type: "ping",
                    data: pingTest
                }).mapError(function() {
                    return err;
                }).mapSuccess(function(pingResponse) {
                    if (pingResponse && pingResponse.type === "success" && pingResponse.data === pingTest)
                        return true;
                    return Promise.error(err);
                });
            },

            /**
             * Reason why set this._currentVideo & _currentAudio based on return value is that Firefox returns 'undefined'
             * before waiting Objs.iter methods callback
             * @param devices
             * @param devicesCount
             * @param isVideo
             * @return {*}
             * @private
             */
            _detectCurrendDeviceId: function(devices, devicesCount, isVideo) {
                var _currentDeviceTrack, _currentDeviceSettings, _counter;
                if (isVideo) {
                    _currentDeviceTrack = this._recorder._videoTrack;
                    _currentDeviceSettings = this._recorder._videoTrackSettings;
                } else {
                    _currentDeviceTrack = this._recorder._audioTrack;
                    _currentDeviceSettings = this._recorder._audioTrackSettings;
                }

                // First will check if browser could provide device ID via device settings
                if (_currentDeviceSettings && _currentDeviceTrack) {
                    if (_currentDeviceSettings.deviceId) {
                        if (isVideo)
                            this._currentVideo = devices[_currentDeviceSettings.deviceId].id;
                        else
                            this._currentAudio = devices[_currentDeviceSettings.deviceId].id;
                        return devices[_currentDeviceSettings.deviceId].id;
                    }
                    // If browser can provide label of the current device will compare based on label
                    else if (_currentDeviceTrack.label) {
                        _counter = 1;
                        Objs.iter(devices, function(device, index) {
                            // If determine label will return device ID
                            if (Comparators.byValue(device.label, _currentDeviceTrack.label) === 0) {
                                if (isVideo)
                                    this._currentVideo = index;
                                else
                                    this._currentAudio = index;
                                return index;
                            }

                            if (_counter >= devicesCount) {
                                if (isVideo)
                                    this._currentVideo = Objs.ithKey(devices);
                                else
                                    this._currentAudio = Objs.ithKey(devices);
                                return Objs.ithKey(devices);
                            }

                            _counter++;
                        }, this);
                    } else {
                        if (isVideo)
                            this._currentVideo = Objs.ithKey(devices);
                        else
                            this._currentAudio = Objs.ithKey(devices);
                        return Objs.ithKey(devices);
                    }
                } else {
                    if (isVideo)
                        this._currentVideo = Objs.ithKey(devices);
                    else
                        this._currentAudio = Objs.ithKey(devices);
                    return Objs.ithKey(devices);
                }
            }
        };
    }, {

        supported: function(options) {
            if (options.forceflash)
                return false;
            if (!RecorderWrapper.anySupport(options))
                return false;
            if (options.screen) {
                if (Support.globals().supportedConstraints.mediaSource && Info.isFirefox() && Info.firefoxVersion() > 55)
                    return true;
                if (Info.isChrome() && options.screen.chromeExtensionId)
                    return true;
                if (Info.isOpera() && options.screen.operaExtensionId)
                    return true;
                return false;
            }
            return true;
        }

    });
});



Scoped.define("module:Recorder.FlashVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Flash.FlashRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(VideoRecorderWrapper, FlashRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return VideoRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashRecorder(this._element, {
                    flip: !!this._options.flip,
                    disableaudio: !this._options.recordAudio,
                    disablevideo: !this._options.recordVideo,
                    streamtype: this._options.rtmpStreamType,
                    camerawidth: this._options.recordingWidth,
                    cameraheight: this._options.recordingHeight,
                    microphonecodec: this._options.rtmpMicrophoneCodec,
                    fps: this._options.framerate,
                    audioRate: this._options.audioBitrate ? Math.floor(this._options.audioBitrate / 1000) : undefined,
                    videoRate: this._options.videoBitrate ? this._options.videoBitrate * 1000 : undefined
                });
                this._recorder.ready.forwardCallback(this.ready);
                this._recorder.on("require_display", function() {
                    this.trigger("require_display");
                }, this);
                this._recorder.on("endpoint_connectivity", function(endpoint, connectivity) {
                    this.trigger("endpoint_connectivity", endpoint, connectivity);
                }, this);
            },

            destroy: function() {
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia(this._options.flashFullSecurityDialog);
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            lightLevel: function() {
                return this._recorder.lightLevel();
            },

            soundLevel: function() {
                var sl = this._recorder.soundLevel();
                return sl <= 1 ? 1.0 : (1.0 + (sl - 1) / 100);
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            testSoundLevel: function(activate) {
                this._recorder.testSoundLevel(activate);
            },

            enumerateDevices: function() {
                var result = this._recorder.enumerateDevices();
                return Promise.value({
                    videoCount: Objs.count(result.videos),
                    audioCount: Objs.count(result.audios),
                    video: Objs.map(result.videos, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    }),
                    audio: Objs.map(result.audios, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            },

            currentDevices: function() {
                return {
                    video: this._recorder.currentCamera(),
                    audio: this._recorder.currentMicrophone()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot();
            },

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                return this._recorder.createSnapshotDisplay(snapshot, x, y, w, h);
            },

            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {
                return this._recorder.updateSnapshotDisplay(snapshot, display, x, y, w, h);
            },

            removeSnapshotDisplay: function(display) {
                this._recorder.removeSnapshotDisplay(display);
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                var uploader = new CustomUploader(Objs.extend({
                    source: snapshot,
                    type: type,
                    recorder: this._recorder
                }, uploaderOptions));
                uploader.on("upload", function(options) {
                    options.recorder.postSnapshot(
                            options.source,
                            options.url,
                            options.type
                        )
                        .success(uploader.successCallback, uploader)
                        .error(uploader.errorCallback, uploader);
                });
                return uploader;
            },

            startRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(true);
                var self = this;
                var ctx = {};
                var promise = Promise.create();
                this._recorder.on("recording", function() {
                    promise.asyncSuccess();
                    self._recorder.off(null, null, ctx);
                }, ctx).on("error", function(s) {
                    promise.asyncError(s);
                    self._recorder.off(null, null, ctx);
                }, ctx);
                this._recorder.startRecord(options.rtmp);
                return promise;
            },

            stopRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(new MultiUploader());
                var self = this;
                var ctx = {};
                var uploader = new CustomUploader();
                var timer = null;
                timer = new Timer({
                    delay: 100,
                    context: this,
                    fire: function() {
                        if (!this._recorder || this._recorder.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        var status = this._recorder.uploadStatus();
                        uploader.progressCallback(status.total - status.remaining, status.total);
                    }
                });
                this._recorder.on("finished", function() {
                    uploader.successCallback(true);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx).on("error", function(s) {
                    uploader.errorCallback(s);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx);
                this._recorder.stopRecord();
                return Promise.create(uploader);
            },

            isFlash: function() {
                return true;
            },

            averageFrameRate: function() {
                return this._recorder.averageFrameRate();
            },

            _softwareDependencies: function() {
                return Info.flash().installed() ? Promise.value(true) : Promise.error([{
                    "title": "Adobe Flash",
                    "execute": function() {
                        window.open("https://get.adobe.com/flashplayer");
                    }
                }]);
            }

        };
    }, {

        supported: function(options) {
            return !Info.isMobile() && !options.noflash && Info.flash().supported() && !options.screen;
        }

    });
});


Scoped.extend("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.WebRTCVideoRecorderWrapper"
], function(VideoRecorderWrapper, WebRTCVideoRecorderWrapper) {
    VideoRecorderWrapper.register(WebRTCVideoRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:Recorder.VideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.FlashVideoRecorderWrapper"
], function(VideoRecorderWrapper, FlashVideoRecorderWrapper) {
    VideoRecorderWrapper.register(FlashVideoRecorderWrapper, 1);
    return {};
});
Scoped.define("module:WebRTC.AudioAnalyser", [
    "base:Class",
    "module:WebRTC.Support"
], function(Class, Support, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(stream) {
                inherited.constructor.call(this);
                /*
                var AudioContext = Support.globals().AudioContext;
                this._audioContext = new AudioContext();
                */
                this._audioContext = Support.globals().audioContext;
                this._analyserNode = this._audioContext.createAnalyser.call(this._audioContext);
                //this._analyserNode = Support.globals().createAnalyser.call(this._audioContext);
                this._analyserNode.fftSize = 32;
                if (stream.getAudioTracks().length > 0) {
                    this._audioInput = this._audioContext.createMediaStreamSource(stream);
                    this._audioInput.connect(this._analyserNode);
                }
            },

            destroy: function() {
                this._analyserNode.disconnect();
                delete this._analyserNode;
                //this._audioContext.close();
                //delete this._audioContext;
                inherited.destroy.call(this);
            },

            soundLevel: function() {
                if (!this._audioInput)
                    return 0.0;
                var bufferLength = this._analyserNode.fftSize;
                var dataArray = new Uint8Array(bufferLength);
                this._analyserNode.getByteTimeDomainData(dataArray);
                var mx = 0.0;
                for (var i = 0; i < bufferLength; i++)
                    mx = Math.max(mx, Math.abs(dataArray[i] / 128.0));
                return mx;
            }

        };
    }, {

        supported: function() {
            return !!Support.globals().AudioContext && !!Support.globals().createAnalyser && !!Support.globals().audioContext;
        }

    });
});
// Credits: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.AudioRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise",
    "base:Functions",
    "module:WebRTC.Support",
    "module:Encoding.WaveEncoder.Support"
], function(Class, EventsMixin, Objs, Promise, Functions, Support, WaveEncoder, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
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
                this._volumeGainValue = 1.0;
                //this.__initializeContext();
            },

            _audioProcess: function(e) {
                if (!this._started)
                    return;
                this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, this._actualBufferSize));
                this._recordingLength += this._actualBufferSize;
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
                var offset = 0;
                var endOffset = this._actualBufferSize;
                if (sampleStartTime < this._startContextTime)
                	offset = Math.round((this._startContextTime - sampleStartTime) * this._actualSampleRate);
                if (this._stopped && sampleStopTime > this._stopContextTime)
                	endOffset = Math.round((this._stopContextTime - sampleStartTime) * this._actualSampleRate);
                this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, endOffset, offset));
                this._recordingLength += endOffset - offset;
                if (this._stopped && sampleStopTime > this._stopContextTime) {
                	this._started = false;
                	this._generateData();
                	return;
                }
                */
            },

            destroy: function() {
                this.stop();
                //this.__finalizeContext();
                inherited.destroy.call(this);
            },

            getVolumeGain: function() {
                return this._volumeGainValue;
            },

            setVolumeGain: function(volumeGain) {
                this._volumeGainValue = volumeGain;
                if (this._volumeGain)
                    this._volumeGain.value.gain = volumeGain;
            },

            __initializeContext: function() {
                var AudioContext = Support.globals().AudioContext;
                this._audioContext = new AudioContext();
                this._actualSampleRate = this._audioContext.sampleRate || this._options.sampleRate;
                this._volumeGain = this._audioContext.createGain();
                this._volumeGain.gain.value = this._volumeGainValue;
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

            __finalizeContext: function() {
                this._scriptProcessor.disconnect();
                this._volumeGain.disconnect();
                this._audioInput.disconnect();
                this._scriptProcessor.onaudioprocess = null;
                this._audioContext.close();
                delete this._scriptProcessor;
                delete this._volumeGain;
                delete this._audioInput;
                delete this._audioContext;
            },

            start: function() {
                if (this._started)
                    return Promise.value(true);
                this.__initializeContext();
                this._startContextTime = this._audioContext.currentTime;
                this._started = true;
                this._stopped = false;
                this._recordingLength = 0;
                this._channels = [];
                this.trigger("started");
                return Promise.value(true);
            },

            stop: function() {
                if (!this._started || this._stopped)
                    return;
                this._stopContextTime = this._audioContext.currentTime;
                this._stopped = true;
                this.trigger("stopped");
                this.__finalizeContext();
                this._started = false;
                this._generateData();
            },

            _generateData: function() {
                var volume = 1;
                var index = 44;
                var totalSize = this._recordingLength * this._options.audioChannels * 2 + 44;
                var buffer = new ArrayBuffer(totalSize);
                var view = new DataView(buffer);
                WaveEncoder.generateHeader(totalSize, this._options.audioChannels, this._actualSampleRate, buffer);
                this._channels.forEach(function(channel) {
                    WaveEncoder.waveChannelTransform(channel, volume).value().forEach(function(v) {
                        view.setInt16(index, v, true);
                        index += 2;
                    });
                });
                this._data = new Blob([view], {
                    type: 'audio/wav'
                });
                this._leftChannel = [];
                this._rightChannel = [];
                this._recordingLength = 0;
                this.trigger("data", this._data);
            }

        };
    }], {

        supported: function() {
            return !!Support.globals().AudioContext && !!Support.globals().audioContextScriptProcessor;
        }

    });
});
Scoped.define("module:WebRTC.MediaRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Promise",
    "browser:Info",
    "module:WebRTC.Support"
], function(Class, EventsMixin, Functions, Promise, Info, Support, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
                options = options || {};
                inherited.constructor.call(this);
                this._stream = stream;
                this._started = false;
                var MediaRecorder = Support.globals().MediaRecorder;
                /*
                 * This is supposed to work according to the docs, but it is not:
                 * 
                 * https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder#Example
                 */
                var mediaRecorderOptions = {
                    mimeType: ""
                };
                //mediaRecorderOptions.mimeType = "video/mp4";
                try {
                    if (options.audioonly) {
                        if (MediaRecorder.isTypeSupported('audio/mp3')) {
                            mediaRecorderOptions = {
                                mimeType: 'audio/mp3'
                            };
                        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                            mediaRecorderOptions = {
                                mimeType: 'audio/ogg;codecs=opus'
                            };
                        }
                    } else {
                        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm;codecs=vp9'
                            };
                        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm;codecs=vp8'
                            };
                        } else if (MediaRecorder.isTypeSupported('video/webm')) {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm'
                            };
                        }
                    }
                } catch (e) {
                    mediaRecorderOptions = {};
                }
                if (options.videoBitrate)
                    mediaRecorderOptions.videoBitsPerSecond = options.videoBitrate * 1000;
                if (options.audioBitrate)
                    mediaRecorderOptions.audioBitsPerSecond = options.audioBitrate * 1000;
                this.__audioonly = options.audioonly;
                this.__mediaRecorderOptions = mediaRecorderOptions;
                this._mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
                this._mediaRecorder.ondataavailable = Functions.as_method(this._dataAvailable, this);
                this._mediaRecorder.onstop = Functions.as_method(this._dataStop, this);
            },

            destroy: function() {
                this.stop();
                inherited.destroy.call(this);
            },

            start: function() {
                if (this._started)
                    return Promise.value(true);
                this._started = true;
                this._chunks = [];
                this._mediaRecorder.start(10);
                this.trigger("started");
                return Promise.value(true);
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                this._mediaRecorder.stop();
                this.trigger("stopped");
            },

            _dataAvailable: function(e) {
                if (e.data && e.data.size > 0)
                    this._chunks.push(e.data);
            },

            _dataStop: function(e) {
                this._data = new Blob(this._chunks, {
                    type: (this.__mediaRecorderOptions.mimeType.split(";"))[0] || (this.__audioonly ? "audio/ogg" : "video/webm")
                });
                this._chunks = [];
                if (Info.isFirefox()) {
                    var self = this;
                    var fileReader = new FileReader();
                    fileReader.onload = function() {
                        self._data = new Blob([this.result], {
                            type: self._data.type
                        });
                        self.trigger("data", self._data);
                    };
                    fileReader.readAsArrayBuffer(this._data);
                } else
                    this.trigger("data", this._data);
            }

        };
    }], {

        supported: function() {
            if (!Support.globals().MediaRecorder)
                return false;
            if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                if (Info.isOpera() || Info.isChrome())
                    return false;
            }
            if (Info.isOpera() && Info.operaVersion() < 44)
                return false;
            if (Info.isChrome() && Info.chromeVersion() < 57)
                return false;
            return true;
        }

    });
});
Scoped.define("module:WebRTC.PeerRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Objs",
    "base:Promise",
    "base:Async",
    "browser:Info",
    "module:WebRTC.Support"
], function(Class, EventsMixin, Functions, Objs, Promise, Async, Info, Support, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this._stream = stream;
                if (!options.videoBitrate && options.recorderWidth && options.recorderHeight)
                    options.videoBitrate = Math.round(options.recorderWidth * options.recorderHeight / 250);
                this._videoBitrate = options.videoBitrate || 1024;
                this._audioBitrate = options.audioBitrate || 256;
                this._audioonly = options.audioonly;
                this._started = false;
            },

            destroy: function() {
                this.stop();
                inherited.destroy.call(this);
            },

            start: function(options) {
                if (this._started)
                    return Promise.value(true);
                this._wssUrl = options.wssUrl;
                this._streamInfo = options.streamInfo;
                this._userData = options.userData || {};
                this._delay = options.delay || 0;
                this._started = true;
                this._wsConnection = new(Support.globals()).WebSocket(this._wssUrl);
                this._wsConnection.binaryType = 'arraybuffer';
                this._wsConnection.onopen = Functions.as_method(this._wsOnOpen, this);
                this._wsConnection.onmessage = Functions.as_method(this._wsOnMessage, this);
                this._wsConnection.onclose = Functions.as_method(this._wsOnClose, this);
                this._wsConnection.onerror = this._errorCallback("WS_CONNECTION");
                var promise = Promise.create();
                var ctx = {};
                var self = this;
                this.on("started", function() {
                    self.off(null, null, ctx);
                    promise.asyncSuccess(true);
                }, ctx).on("error", function(error) {
                    self.off(null, null, ctx);
                    promise.asyncError(error);
                }, ctx);
                return promise;
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                if (this._peerConnection)
                    this._peerConnection.close();
                this._peerConnection = null;
                if (this._wsConnection)
                    this._wsConnection.close();
                this._wsConnection = null;
                this.trigger("stopped");
            },

            _wsOnOpen: function() {
                this._peerConnection = new(Support.globals()).RTCPeerConnection({
                    'iceServers': []
                });
                if (this._stream.getTracks && this._peerConnection.addTrack) {
                    Objs.iter(this._stream.getTracks(), function(localTrack) {
                        this._peerConnection.addTrack(localTrack, this._stream);
                    }, this);
                } else
                    this._peerConnection.addStream(this._stream);
                var offer = this._peerConnection.createOffer();
                offer.then(Functions.as_method(this._offerGotDescription, this));
                offer['catch'](this._errorCallback("PEER_CREATE_OFFER"));
            },

            _wsOnMessage: function(evt) {
                var data = JSON.parse(evt.data);
                var status = parseInt(data.status, 10);
                var command = data.command;
                if (status !== 200) {
                    this._error("MESSAGE_ERROR", {
                        status: status,
                        description: data.statusDescription
                    });
                } else {
                    if (data.sdp !== undefined) {
                        var remoteDescription = this._peerConnection.setRemoteDescription(new(Support.globals()).RTCSessionDescription(data.sdp));
                        remoteDescription.then(function() {
                            // peerConnection.createAnswer(gotDescription, errorHandler);
                        });
                        remoteDescription['catch'](this._errorCallback("PEER_REMOTE_DESCRIPTION"));
                    }
                    if (data.iceCandidates) {
                        Objs.iter(data.iceCandidates, function(iceCandidate) {
                            this._peerConnection.addIceCandidate(new(Support.globals()).RTCIceCandidate(iceCandidate));
                        }, this);
                    }
                    Async.eventually(function() {
                        this.trigger("started");
                    }, this, this._delay);
                }
                if (this._wsConnection)
                    this._wsConnection.close();
                this._wsConnection = null;
            },

            _offerGotDescription: function(description) {
                var enhanceData = {};
                if (this._audioBitrate)
                    enhanceData.audioBitrate = this._audioBitrate;
                if (this._videoBitrate && !this._audioonly)
                    enhanceData.videoBitrate = this._videoBitrate;
                description.sdp = this._enhanceSDP(description.sdp, enhanceData);
                return this._peerConnection.setLocalDescription(description).then(Functions.as_method(function() {
                    this._wsConnection.send(JSON.stringify({
                        direction: "publish",
                        command: "sendOffer",
                        streamInfo: this._streamInfo,
                        sdp: description,
                        userData: this._userData
                    }));
                }, this))['catch'](this._errorCallback("PEER_LOCAL_DESCRIPTION"));
            },

            _enhanceSDP: function(sdpStr, enhanceData) {
                var sdpLines = sdpStr.split(/\r\n/);
                var sdpSection = 'header';
                var hitMID = false;
                var sdpStrRet = '';
                Objs.iter(sdpLines, function(sdpLine) {
                    if (sdpLine.length <= 0)
                        return;
                    sdpStrRet += sdpLine + '\r\n';
                    if (sdpLine.indexOf("m=audio") === 0) {
                        sdpSection = 'audio';
                        hitMID = false;
                    } else if (sdpLine.indexOf("m=video") === 0) {
                        sdpSection = 'video';
                        hitMID = false;
                    }
                    if (sdpLine.indexOf("a=mid:") !== 0)
                        return;
                    if (hitMID)
                        return;
                    if ('audio'.localeCompare(sdpSection) === 0) {
                        if (enhanceData.audioBitrate !== undefined) {
                            sdpStrRet += 'b=AS:' + enhanceData.audioBitrate + '\r\n';
                            sdpStrRet += 'b=TIAS:' + (enhanceData.audioBitrate * 1024) + '\r\n';
                        }
                    } else if ('video'.localeCompare(sdpSection) === 0) {
                        if (enhanceData.videoBitrate !== undefined) {
                            sdpStrRet += 'b=AS:' + enhanceData.videoBitrate + '\r\n';
                            sdpStrRet += 'b=TIAS:' + (enhanceData.videoBitrate * 1024) + '\r\n';
                        }
                    }
                    hitMID = true;
                }, this);
                return sdpStrRet;
            },

            _wsOnClose: function() {},

            _error: function(errorName, errorData) {
                this.trigger("error", errorName, errorData);
                this.stop();
            },

            _errorCallback: function(errorName) {
                return Functions.as_method(function(errorData) {
                    this._error(errorName, errorData);
                }, this);
            }

        };
    }], {

        supported: function() {
            if (Info.isEdge())
                return false;
            if (Info.isSafari() && Info.safariVersion() < 11)
                return false;
            if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                if (Info.isChrome() && Info.chromeVersion() >= 47)
                    return false;
                if (Info.isOpera() && Info.operaVersion() >= 34)
                    return false;
            }
            return (Support.globals()).RTCPeerConnection &&
                (Support.globals()).RTCIceCandidate &&
                (Support.globals()).RTCSessionDescription &&
                (Support.globals()).WebSocket;
        }

    });
});
Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "module:WebRTC.Support",
    "module:Recorder.Support",
    "base:Time",
    "module:Recorder.PixelSampleMixin"
], function(ConditionalInstance, EventsMixin, Objs, Support, RecorderSupport, Time, PixelSampleMixin, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._video = options.video;
                this._localPlaybackRequested = options.localPlaybackRequested;
                this._recording = false;
                this._bound = false;
                this._hasAudio = false;
                this._hasVideo = false;
                this._screen = options.screen;
                this._flip = !!options.flip;
            },

            _getConstraints: function() {
                return {
                    audio: this._options.recordAudio ? {
                        sourceId: this._options.audioId
                    } : false,
                    video: this._options.recordVideo ? {
                        frameRate: this._options.framerate,
                        sourceId: this._options.videoId,
                        width: this._options.recordResolution.width,
                        height: this._options.recordResolution.height,
                        cameraFaceFront: this._options.cameraFaceFront
                    } : false,
                    screen: this._screen
                };
            },

            recordDelay: function(opts) {
                return 0;
            },

            stream: function() {
                return this._stream;
            },

            isWebrtcStreaming: function() {
                return false;
            },

            bindMedia: function() {
                if (this._bound)
                    return;
                return Support.userMedia2(this._getConstraints()).success(function(stream) {
                    this._hasAudio = this._options.recordAudio && stream.getAudioTracks().length > 0;
                    this._hasVideo = this._options.recordVideo && stream.getVideoTracks().length > 0;
                    this._bound = true;
                    this._stream = stream;
                    Support.bindStreamToVideo(stream, this._video, this._flip);
                    this.trigger("bound", stream);
                    if (typeof stream.getVideoTracks() !== 'undefined') {
                        if (stream.getVideoTracks()[0]) {
                            this._videoTrack = stream.getVideoTracks()[0];
                            if (typeof this._videoTrack.getSettings() !== 'undefined')
                                this._videoTrackSettings = this._videoTrack.getSettings();
                        }
                    }
                    if (typeof stream.getAudioTracks() !== 'undefined') {
                        if (stream.getAudioTracks()[0]) {
                            this._audioTrack = stream.getAudioTracks()[0];
                            if (typeof this._audioTrack.getSettings() !== 'undefined')
                                this._audioTrackSettings = this._audioTrack.getSettings();
                        }
                    }
                    this._boundMedia();
                }, this);
            },

            selectCamera: function(cameraId) {
                this._options.videoId = cameraId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            selectMicrophone: function(microphoneId) {
                this._options.audioId = microphoneId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            selectCameraFace: function(faceFront) {
                this._options.cameraFaceFront = faceFront;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            startRecord: function(options) {
                if (this._recording)
                    return Promise.value(true);
                this._recording = true;
                var promise = this._startRecord(options);
                promise.success(function() {
                    this._startTime = Time.now();
                }, this);
                return promise;
            },

            stopRecord: function() {
                if (!this._recording)
                    return;
                this._recording = false;
                this._stopRecord();
                this._stopTime = Time.now();
            },

            duration: function() {
                return (this._recording || !this._stopTime ? Time.now() : this._stopTime) - this._startTime;
            },

            unbindMedia: function() {
                if (!this._bound || this._recording)
                    return;
                Support.stopUserMediaStream(this._stream);
                this._bound = false;
                this.trigger("unbound");
                this._unboundMedia();
            },

            createSnapshot: function(type) {
                return RecorderSupport.createSnapshot(type, this._video);
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var w = this._video.videoWidth || this._video.clientWidth;
                var h = this._video.videoHeight || this._video.clientHeight;
                var wc = Math.ceil(Math.sqrt(w / h * samples));
                var hc = Math.ceil(Math.sqrt(h / w * samples));
                var canvas = document.createElement('canvas');
                canvas.width = wc;
                canvas.height = hc;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(this._video, 0, 0, wc, hc);
                for (var i = 0; i < samples; ++i) {
                    var x = i % wc;
                    var y = Math.floor(i / wc);
                    var data = ctx.getImageData(x, y, 1, 1).data;
                    callback.call(context || this, data[0], data[1], data[2]);
                }
            },

            _boundMedia: function() {},

            _unboundMedia: function() {},

            _startRecord: function(options) {},

            _stopRecord: function() {},

            _error: function(errorType, errorData) {
                this.trigger("error", errorType, errorData);
            },

            getVolumeGain: function() {},

            setVolumeGain: function(volumeGain) {},

            _dataAvailable: function(videoBlob, audioBlob, noUploading) {
                if (this.destroyed())
                    return;
                this.trigger("data", videoBlob, audioBlob, noUploading);
            },

            destroy: function() {
                this.stopRecord();
                this.unbindMedia();
                inherited.destroy.call(this);
            },

            averageFrameRate: function() {
                return null;
            }

        };
    }], {

        _initializeOptions: function(options) {
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

        supported: function(options) {
            return !!Support.globals().getUserMedia && !!Support.globals().URL;
        }

    });
});


Scoped.define("module:WebRTC.PeerRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorder",
    "module:WebRTC.MediaRecorder",
    "browser:Info",
    "base:Async"
], function(RecorderWrapper, PeerRecorder, MediaRecorder, Info, Async, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {

        _boundMedia: function() {
            this._recorder = new PeerRecorder(this._stream, {
                recorderWidth: this._options.recordResolution.width,
                recorderHeight: this._options.recordResolution.height,
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate,
                audioonly: !this._options.recordVideo
            });
            if (this._localPlaybackRequested && MediaRecorder.supported())
                this.__localMediaRecorder = new MediaRecorder(this._stream);
            this._recorder.on("error", this._error, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
            if (this.__localMediaRecorder)
                this.__localMediaRecorder.weakDestroy();
        },

        _startRecord: function(options) {
            if (this.__localMediaRecorder)
                this.__localMediaRecorder.start();
            return this._recorder.start(options.webrtcStreaming);
        },

        isWebrtcStreaming: function() {
            return true;
        },

        _stopRecord: function() {
            this._recorder.stop();
            var localBlob = null;
            if (this.__localMediaRecorder) {
                this.__localMediaRecorder.once("data", function(blob) {
                    localBlob = blob;
                });
                this.__localMediaRecorder.stop();
            }
            Async.eventually(function() {
                this._dataAvailable(localBlob, null, true);
            }, this, this.__stopDelay || this._options.webrtcStreaming.stopDelay || 0);
        },

        recordDelay: function(opts) {
            this.__stopDelay = opts.webrtcStreaming.stopDelay;
            return opts.webrtcStreaming.delay || 0;
        },

        getVolumeGain: function() {},

        setVolumeGain: function(volumeGain) {},

        averageFrameRate: function() {
            return null;
        }

    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                /*
                if (!options.recordVideo)
                    return false;
                    */
                if (options.screen && Info.isFirefox())
                    return false;
                return options.webrtcStreaming && PeerRecorder.supported() && !options.webrtcStreamingIfNecessary;
            }

        };
    });
});


Scoped.define("module:WebRTC.PeerRecorderWrapperIfNecessary", [
    "module:WebRTC.PeerRecorderWrapper",
    "base:Objs"
], function(PeerRecorderWrapper, Objs, scoped) {
    return PeerRecorderWrapper.extend({
        scoped: scoped
    }, {}, function(inherited) {
        return {

            supported: function(options) {
                if (options.webrtcStreamingIfNecessary) {
                    options = Objs.clone(options, 1);
                    options.webrtcStreamingIfNecessary = false;
                    options.webrtcStreaming = true;
                }
                return inherited.supported.call(this, options);
            }

        };
    });
});


Scoped.define("module:WebRTC.MediaRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.MediaRecorder"
], function(RecorderWrapper, MediaRecorder, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {

        _boundMedia: function() {
            this._recorder = new MediaRecorder(this._stream, {
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate,
                audioonly: !this._options.recordVideo
            });
            this._recorder.on("data", function(blob) {
                this._dataAvailable(blob);
            }, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
        },

        _startRecord: function() {
            return this._recorder.start();
        },

        _stopRecord: function() {
            this._recorder.stop();
        },

        getVolumeGain: function() {},

        setVolumeGain: function(volumeGain) {},

        averageFrameRate: function() {
            return null;
        }

    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                if (options.recordFakeVideo)
                    return false;
                return MediaRecorder.supported();
            }

        };
    });
});


Scoped.define("module:WebRTC.WhammyAudioRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.AudioRecorder",
    "module:WebRTC.WhammyRecorder",
    "browser:Info",
    "base:Promise"
], function(RecorderWrapper, AudioRecorder, WhammyRecorder, Info, Promise, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {
        /*
        		_getConstraints: function () {
        			return {
        				audio: this._options.recordAudio,
        				video: this._options.recordVideo
        			}
        		},
        */
        _createSnapshot: function(type) {
            return this._whammyRecorder.createSnapshot(type);
        },

        _boundMedia: function() {
            this._videoBlob = null;
            this._audioBlob = null;
            if (this._hasVideo) {
                this._whammyRecorder = new WhammyRecorder(this._stream, {
                    //recorderWidth: this._options.recordResolution.width,
                    //recorderHeight: this._options.recordResolution.height,
                    video: this._video,
                    framerate: this._options.framerate
                });
            } else {
                this._whammyRecorder = new WhammyRecorder(null, {
                    framerate: this._options.framerate
                });
            }
            if (this._hasAudio) {
                this._audioRecorder = new AudioRecorder(this._stream);
                this._audioRecorder.on("data", function(blob) {
                    this._audioBlob = blob;
                    if (this._videoBlob || !this._hasVideo)
                        this._dataAvailable(this._videoBlob, this._audioBlob);
                }, this);
            }
            //if (this._hasVideo) {
            this._whammyRecorder.on("data", function(blob) {
                this._videoBlob = blob;
                if (this._audioBlob || !this._hasAudio)
                    this._dataAvailable(this._videoBlob, this._audioBlob);
            }, this);
            //}
            /*
            this._whammyRecorder.on("onStartedDrawingNonBlankFrames", function () {
            	if (this._recording)
            		this._audioRecorder.start();
            }, this);
            */
        },

        _unboundMedia: function() {
            if (this._hasAudio)
                this._audioRecorder.destroy();
            //if (this._hasVideo)
            this._whammyRecorder.destroy();
        },

        _startRecord: function() {
            var promises = [];
            //if (this._hasVideo)
            promises.push(this._whammyRecorder.start());
            if (this._hasAudio)
                promises.push(this._audioRecorder.start());
            return Promise.and(promises);
        },

        _stopRecord: function() {
            //if (this._hasVideo)
            this._whammyRecorder.stop();
            if (this._hasAudio)
                this._audioRecorder.stop();
        },

        getVolumeGain: function() {
            return this._audioRecorder ? this._audioRecorder.getVolumeGain() : 1.0;
        },

        setVolumeGain: function(volumeGain) {
            if (this._audioRecorder)
                this._audioRecorder.setVolumeGain(volumeGain);
        },

        averageFrameRate: function() {
            return this._whammyRecorder.averageFrameRate();
            //return this._hasVideo ? this._whammyRecorder.averageFrameRate() : 0;
        }


    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                    if (Info.isChrome() && Info.chromeVersion() >= 47)
                        return false;
                    if (Info.isOpera() && Info.operaVersion() >= 34)
                        return false;
                }
                return AudioRecorder.supported() && WhammyRecorder.supported(!options.recordVideo);
            }

        };
    });
});


Scoped.extend("module:WebRTC.RecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorderWrapper",
    "module:WebRTC.MediaRecorderWrapper",
    "module:WebRTC.WhammyAudioRecorderWrapper",
    "module:WebRTC.PeerRecorderWrapperIfNecessary"
], function(RecorderWrapper, PeerRecorderWrapper, MediaRecorderWrapper, WhammyAudioRecorderWrapper, PeerRecorderWrapperIfNecessary) {
    RecorderWrapper.register(PeerRecorderWrapper, 4);
    RecorderWrapper.register(MediaRecorderWrapper, 3);
    RecorderWrapper.register(WhammyAudioRecorderWrapper, 2);
    RecorderWrapper.register(PeerRecorderWrapperIfNecessary, 1);
    return {};
});
Scoped.define("module:WebRTC.Support", [
    "base:Promise",
    "base:Objs",
    "browser:Info",
    "browser:Dom",
    "base:Time"
], function(Promise, Objs, Info, Dom, Time) {
    return {

        canvasSupportsImageFormat: function(imageFormat) {
            try {
                var data = document.createElement('canvas').toDataURL(imageFormat);
                var headerIdx = data.indexOf(";");
                return data.substring(0, data.indexOf(";")).indexOf(imageFormat) != -1;
            } catch (e) {
                return false;
            }
        },

        getGlobals: function() {
            var getUserMedia = null;
            var getUserMediaCtx = null;
            var audioContext = null;

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                getUserMedia = navigator.mediaDevices.getUserMedia;
                getUserMediaCtx = navigator.mediaDevices;
            } else {
                getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
                getUserMediaCtx = navigator;
            }

            var URL = window.URL || window.webkitURL;
            var MediaRecorder = window.MediaRecorder;
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            var audioContextScriptProcessor = null;
            var createAnalyser = null;
            if (AudioContext) {
                Dom.userInteraction(function() {
                    if (!this.__globals)
                        return;
                    var audioContext = new AudioContext();
                    this.__globals.audioContext = audioContext;
                    this.__globals.audioContextScriptProcessor = audioContext.createJavaScriptNode || audioContext.createScriptProcessor;
                    this.__globals.createAnalyser = audioContext.createAnalyser;
                }, this);
            }
            var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
            var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
            var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
            var WebSocket = window.WebSocket;
            return {
                getUserMedia: getUserMedia,
                getUserMediaCtx: getUserMediaCtx,
                URL: URL,
                MediaRecorder: MediaRecorder,
                AudioContext: AudioContext,
                //audioContext: audioContext,
                //createAnalyser: createAnalyser,
                //audioContextScriptProcessor: audioContextScriptProcessor,
                webpSupport: this.canvasSupportsImageFormat("image/webp"),
                RTCPeerConnection: RTCPeerConnection,
                RTCIceCandidate: RTCIceCandidate,
                RTCSessionDescription: RTCSessionDescription,
                WebSocket: WebSocket,
                supportedConstraints: navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints ? navigator.mediaDevices.getSupportedConstraints() : {}
            };
        },

        globals: function() {
            if (!this.__globals)
                this.__globals = this.getGlobals();
            return this.__globals;
        },

        userMediaSupported: function() {
            return !!this.globals().getUserMedia;
        },

        enumerateMediaSources: function() {
            var promise = Promise.create();
            var promiseCallback = function(sources) {
                var result = {
                    audio: {},
                    audioCount: 0,
                    video: {},
                    videoCount: 0
                };
                Objs.iter(sources, function(source) {
                    // Capabilities method which will show more detailed information about device
                    // https://www.chromestatus.com/feature/5145556682801152 - Status of the feature
                    var _sourceCapabilities;
                    if (source.kind.indexOf("video") === 0) {
                        result.videoCount++;
                        if (typeof source.getCapabilities !== 'undefined')
                            _sourceCapabilities = source.getCapabilities();
                        result.video[source.id || source.deviceId] = {
                            id: source.id || source.deviceId,
                            label: source.label,
                            capabilities: _sourceCapabilities
                        };
                    }
                    if (source.kind.indexOf("audio") === 0) {
                        result.audioCount++;
                        if (typeof source.getCapabilities !== 'undefined')
                            _sourceCapabilities = source.getCapabilities();
                        result.audio[source.id || source.deviceId] = {
                            id: source.id || source.deviceId,
                            label: source.label,
                            capabilities: _sourceCapabilities
                        };
                    }
                });
                promise.asyncSuccess(result);
            };
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
                    navigator.mediaDevices.enumerateDevices().then(promiseCallback);
                else if (MediaStreamTrack && MediaStreamTrack.getSources)
                    MediaStreamTrack.getSources(promiseCallback);
                else
                    promise.asyncError("Unsupported");
            } catch (e) {
                promise.asyncError(e);
            }
            return promise;
        },

        streamQueryResolution: function(stream) {
            var promise = Promise.create();
            var video = this.bindStreamToVideo(stream);
            video.addEventListener("playing", function() {
                setTimeout(function() {
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

        chromeExtensionMessage: function(extensionId, data) {
            var promise = Promise.create();
            chrome.runtime.sendMessage(extensionId, data, promise.asyncSuccessFunc());
            return promise;
        },

        chromeExtensionExtract: function(meta) {
            var result = {};
            if (Info.isChrome()) {
                result.extensionId = meta.chromeExtensionId;
                result.extensionInstallLink = meta.chromeExtensionInstallLink;
            } else if (Info.isOpera()) {
                result.extensionId = meta.operaExtensionId;
                result.extensionInstallLink = meta.operaExtensionInstallLink;
            }
            return result;
        },

        userMedia: function(options) {
            var promise = Promise.create();
            var result = this.globals().getUserMedia.call(this.globals().getUserMediaCtx, options, function(stream) {
                promise.asyncSuccess(stream);
            }, function(e) {
                promise.asyncError(e);
            });
            try {
                if (result.then) {
                    result.then(function(stream) {
                        promise.asyncSuccess(stream);
                    });
                }
                if (result["catch"]) {
                    result["catch"](function(e) {
                        promise.asyncError(e);
                    });
                }
            } catch (e) {}
            return promise;
        },

        /*
         * audio: {} | undefined
         * video: {} | undefined
         * 	  width, height, aspectRatio
         * screen: true | {chromeExtensionId, operaExtensionId} | false
         */
        userMedia2: function(options) {
            var opts = {};
            if (options.audio)
                opts.audio = options.audio;
            if (options.screen && !options.video)
                options.video = {};
            if (!options.video)
                return this.userMedia(opts);
            if (options.screen) {
                options.video.width = options.video.width || window.innerWidth || document.body.clientWidth;
                options.video.height = options.video.height || window.innerHeight || document.body.clientHeight;
            }
            if (Info.isiOS()) {
                opts.video = {};
                if (options.video.width)
                    opts.video.width = options.video.width;
                if (options.video.height)
                    opts.video.height = options.video.height;
                if (options.video.frameRate)
                    opts.video.frameRate = options.video.frameRate;
                if (options.video.cameraFaceFront !== undefined)
                    opts.video.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                return this.userMedia(opts);
            } else if (Info.isFirefox()) {
                opts.video = {};
                if (options.screen) {
                    opts.video.mediaSource = "screen";
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getSupportedConstraints || !navigator.mediaDevices.getSupportedConstraints().mediaSource)
                        return Promise.error("This browser does not support screen recording.");
                }
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
                if (options.video.frameRate) {
                    opts.video.frameRate = {
                        ideal: options.video.frameRate
                    };
                }
                if (options.video.sourceId)
                    opts.video.sourceId = options.video.sourceId;
                if (options.video.cameraFaceFront !== undefined && Info.isMobile())
                    opts.video.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                return this.userMedia(opts);
            } else if (Info.isEdge() && options.screen) {
                if (navigator.getDisplayMedia) {
                    var promise = Promise.create();
                    var pr = navigator.getDisplayMedia({
                        video: true
                    });
                    pr.then(promise.asyncSuccessFunc());
                    pr['catch'](promise.asyncErrorFunc());
                    return promise;
                } else
                    return Promise.error("This browser does not support screen recording.");
            } else {
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
                var as = options.video.aspectRatio ? options.video.aspectRatio : (options.video.width && options.video.height ? options.video.width / options.video.height : null);
                if (as) {
                    opts.video.mandatory.minAspectRatio = as;
                    opts.video.mandatory.maxAspectRatio = as;
                }
                if (options.video.sourceId)
                    opts.video.mandatory.sourceId = options.video.sourceId;
                if (options.video.cameraFaceFront !== undefined && Info.isMobile())
                    // The { exact: } syntax means the constraint is required, and things fail if the user doesn't have the right camera.
                    // If you leave it out then the constraint is optional, which in Firefox for Android means it only changes the default
                    // in the camera chooser in the permission prompt.
                    opts.video.mandatory.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                if (options.video.frameRate) {
                    opts.video.mandatory.minFrameRate = options.video.frameRate;
                    opts.video.mandatory.maxFrameRate = options.video.frameRate;
                }
                var probe = function(count) {
                    var mandatory = opts.video.mandatory;
                    return this.userMedia(opts).mapError(function(e) {
                        count--;
                        if (e.name !== "ConstraintNotSatisfiedError" && e.name !== "OverconstrainedError")
                            return e;
                        var c = (e.constraintName || e.constraint).toLowerCase();
                        Objs.iter(mandatory, function(value, key) {
                            var lkey = key.toLowerCase();
                            if (lkey.indexOf(c) >= 0) {
                                var flt = lkey.indexOf("aspect") > 0;
                                var d = lkey.indexOf("min") === 0 ? -1 : 1;
                                var u = Math.max(0, mandatory[key] * (1.0 + d / 10));
                                mandatory[key] = flt ? u : Math.round(u);
                                if (count < 0) {
                                    delete mandatory[key];
                                    count = 100;
                                }
                            }
                        }, this);
                        return probe.call(this, count);
                    }, this);
                };
                if (options.screen) {
                    var extensionId = this.chromeExtensionExtract(options.screen).extensionId;
                    if (!extensionId)
                        return Promise.error("This browser does not support screen recording.");
                    var pingTest = Time.now();
                    return this.chromeExtensionMessage(extensionId, {
                        type: "ping",
                        data: pingTest
                    }).mapSuccess(function(pingResponse) {
                        var promise = Promise.create();
                        if (!pingResponse || pingResponse.type !== "success" || pingResponse.data !== pingTest)
                            return Promise.error("This browser does not support screen recording.");
                        else
                            promise.asyncSuccess(true);
                        return promise.mapSuccess(function() {
                            return this.chromeExtensionMessage(extensionId, {
                                type: "acquire",
                                sources: ['window', 'screen', 'tab'],
                                url: window.self !== window.top ? window.location.href : null // if recorder is inside of iframe
                            }).mapSuccess(function(acquireResponse) {
                                if (!acquireResponse || acquireResponse.type !== 'success')
                                    return Promise.error("Could not acquire permission to access screen.");
                                opts.video.mandatory.chromeMediaSource = 'desktop';
                                opts.video.mandatory.chromeMediaSourceId = acquireResponse.streamId;
                                delete opts.audio;
                                return probe.call(this, 100).mapSuccess(function(videoStream) {
                                    return !options.audio ? videoStream : this.userMedia({
                                        audio: true
                                    }).mapError(function() {
                                        return Promise.value(videoStream);
                                    }).mapSuccess(function(audioStream) {
                                        try {
                                            return new MediaStream([videoStream.getVideoTracks()[0], audioStream.getAudioTracks()[0]]);
                                        } catch (e) {
                                            return videoStream;
                                        }
                                    });
                                }, this);
                            }, this);
                        }, this);
                    }, this);
                }
                return probe.call(this, 100);
            }
        },

        stopUserMediaStream: function(stream) {
            var stopped = false;
            try {
                if (stream.getTracks) {
                    stream.getTracks().forEach(function(track) {
                        track.stop();
                        stopped = true;
                    });
                }
            } catch (e) {}
            try {
                if (!stopped && stream.stop)
                    stream.stop();
            } catch (e) {}
        },

        bindStreamToVideo: function(stream, video, flip) {
            if (!video)
                video = document.createElement("video");
            video.volume = 0;
            video.muted = true;
            if ('mozSrcObject' in video)
                video.mozSrcObject = stream;
            else if ('srcObject' in video)
                video.srcObject = stream;
            else
                video.src = this.globals().URL.createObjectURL(stream);
            if (flip) {
                video.style["-moz-transform"] = "scale(-1, 1)";
                video.style["-webkit-transform"] = "scale(-1, 1)";
                video.style["-o-transform"] = "scale(-1, 1)";
                video.style.transform = "scale(-1, 1)";
                video.style.filter = "FlipH";
            } else {
                delete video.style["-moz-transform"];
                delete video.style["-webkit-transform"];
                delete video.style["-o-transform"];
                delete video.style.transform;
                delete video.style.filter;
            }
            video.autoplay = true;
            video.play();
            return video;
        },

        dataURItoBlob: function(dataURI) {
            // If dataURI is empty return empty
            if (dataURI === '') return;
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
            var blob = new Blob([dataView], {
                type: mimeString
            });
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
    "base:Promise",
    "base:Async",
    "module:WebRTC.Support",
    "module:Encoding.WebmEncoder.Support"
], function(Class, EventsMixin, Objs, Time, Functions, Promise, Async, Support, WebmSupport, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {

        var CLUSTER_MAX_DURATION = 30000;
        var NO_STREAM_WIDTH = 40;
        var NO_STREAM_HEIGHT = 30;
        var NO_STREAM_WEBP = "data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAADwAgCdASooAB4APpFGnkslo6KhpWgAsBIJaQAAKUNt8AD++E0AAAAA";

        return {

            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this._stream = stream;
                this._options = Objs.extend({
                    recordWidth: 320,
                    recordHeight: 240,
                    quality: undefined,
                    video: null,
                    framerate: null
                }, options);
                this._started = false;
            },

            destroy: function() {
                this._started = false;
                this.trigger("stopped");
                inherited.destroy.call(this);
            },

            start: function() {
                if (this._started)
                    return Promise.value(true);
                this._started = true;
                if (this._options.video) {
                    this._options.recordWidth = this._options.video.videoWidth || this._options.video.clientWidth;
                    this._options.recordHeight = this._options.video.videoHeight || this._options.video.clientHeight;
                }
                this._video = document.createElement('video');
                this._video.width = this._options.recordWidth || NO_STREAM_WIDTH;
                this._video.height = this._options.recordHeight || NO_STREAM_HEIGHT;
                if (this._stream)
                    Support.bindStreamToVideo(this._stream, this._video);
                this._canvas = document.createElement('canvas');
                this._canvas.width = this._options.recordWidth || NO_STREAM_WIDTH;
                this._canvas.height = this._options.recordHeight || NO_STREAM_HEIGHT;
                this._context = this._canvas.getContext('2d');
                this._frames = [];
                //this._isOnStartedDrawingNonBlankFramesInvoked = false;
                this._lastTime = Time.now();
                this._startTime = this._lastTime;
                this.trigger("started");
                Async.eventually(this._process, [], this);
                return Promise.value(true);
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                this.trigger("stopped");
                this._generateData();
            },

            _process: function() {
                if (!this._started)
                    return;
                var now = Time.now();
                var duration = now - this._lastTime;
                this._lastTime = now;
                this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
                this._frames.push({
                    duration: duration,
                    image: this._stream ? this._canvas.toDataURL('image/webp', this._options.quality) : NO_STREAM_WEBP
                });
                /*
		        if (!this._isOnStartedDrawingNonBlankFramesInvoked && !WebmSupport.isBlankFrame(this._canvas, this._frames[this._frames.length - 1])) {
		            this._isOnStartedDrawingNonBlankFramesInvoked = true;
		            this.trigger("onStartedDrawingNonBlankFrames");
		        }
		        */
                var maxTime = this._options.framerate ? 1000 / this._options.framerate : 10;
                Async.eventually(this._process, [], this, Math.max(1, maxTime - (Time.now() - now)));
            },

            averageFrameRate: function() {
                return this._frames.length > 0 ? (this._frames.length / (Time.now() - this._startTime) * 1000) : null;
            },

            _generateData: function() {
                if (!this._frames.length)
                    return;
                this._data = this.__compile(this._stream ? this.__dropBlackFrames(this._canvas, this._frames) : this._frames);
                this.trigger("data", this._data);
            },

            __compile: function(frames) {
                var totalDuration = 0;
                var width = null;
                var height = null;
                var clusters = [];

                var clusterTimecode = 0;

                var clusterFrames = null;
                var clusterDuration = null;

                frames.forEach(function(frame) {
                    if (!clusterFrames) {
                        clusterFrames = [];
                        clusterDuration = 0;
                    }

                    var webp = WebmSupport.parseWebP(WebmSupport.parseRIFF(atob(frame.image.slice(23))));

                    clusterFrames.push(WebmSupport.serializeEBML(WebmSupport.makeTimecodeDataBlock(webp.data, clusterDuration)));

                    clusterDuration += frame.duration;
                    totalDuration += frame.duration;
                    width = width || webp.width;
                    height = height || webp.height;

                    if (clusterDuration >= CLUSTER_MAX_DURATION) {
                        clusters.push(WebmSupport.serializeEBML(WebmSupport.makeCluster(clusterFrames, clusterTimecode)));
                        clusterTimecode = totalDuration;
                        clusterFrames = null;
                        clusterDuration = 0;
                    }
                }, this);

                if (clusterFrames)
                    clusters.push(WebmSupport.serializeEBML(WebmSupport.makeCluster(clusterFrames, clusterTimecode)));

                var EBML = WebmSupport.generateEBMLHeader(totalDuration, width, height);
                EBML[1].data = EBML[1].data.concat(clusters);
                return WebmSupport.serializeEBML(EBML);
            },

            __dropBlackFrames: function(canvas, _frames, _pixTolerance, _frameTolerance) {
                var idx = 0;
                while (idx < _frames.length) {
                    if (!WebmSupport.isBlankFrame(canvas, _frames[idx], _pixTolerance, _frameTolerance))
                        break;
                    idx++;
                }
                return _frames.slice(idx);
            },

            createSnapshot: function(type) {
                this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
                return this._canvas.toDataURL(type);
            }

        };
    }], {

        supported: function(nostream) {
            return nostream || Support.globals().webpSupport;
        }

    });
});
}).call(Scoped);