/*!
betajs-browser - v1.0.0 - 2015-07-08
Copyright (c) Oliver Friedmann
MIT Software License.
*/
(function () {

var Scoped = this.subScope();

Scoped.binding("module", "global:BetaJS.Browser");
Scoped.binding("base", "global:BetaJS");

Scoped.binding("jquery", "global:jQuery");
Scoped.binding("json", "global:JSON");
Scoped.binding("resumablejs", "global:Resumable");

Scoped.define("base:$", ["jquery:"], function (jquery) {
	return jquery;
});

Scoped.define("module:", function () {
	return {
		guid: "02450b15-9bbf-4be2-b8f6-b483bc015d06",
		version: '28.1436390349895'
	};
});

Scoped.define("module:JQueryAjax", [
	    "base:Net.AbstractAjax",
	    "base:Net.AjaxException",
	    "base:Promise",
	    "module:Info",
	    "jquery:"
	], function (AbstractAjax, AjaxException, Promise, BrowserInfo, $, scoped) {
	return AbstractAjax.extend({scoped: scoped}, function (inherited) {
		return {
			
			_syncCall: function (options) {
				var result;
				$.ajax({
					type: options.method,
					async: false,
					url: options.uri,
					dataType: options.decodeType ? options.decodeType : null, 
					data: options.encodeType && options.encodeType == "json" ? JSON.stringify(options.data) : options.data,
					success: function (response) {
						result = response;
					},
					error: function (jqXHR, textStatus, errorThrown) {
						var err = "";
						try {
							err = JSON.parse(jqXHR.responseText);
						} catch (e) {
							err = JSON.parse('"' + jqXHR.responseText + '"');
						}
						throw new AjaxException(jqXHR.status, errorThrown, err);
					}
				});
				return result;
			},
			
			_asyncCall: function (options, callbacks) {
				var promise = Promise.create();
				if (BrowserInfo.isInternetExplorer() && BrowserInfo.internetExplorerVersion() <= 9)
					$.support.cors = true;
				$.ajax({
					type: options.method,
					async: true,
					url: options.uri,
					dataType: options.decodeType ? options.decodeType : null, 
					data: options.encodeType && options.encodeType == "json" ? JSON.stringify(options.data) : options.data,
					success: function (response) {
						promise.asyncSuccess(response);
					},
					error: function (jqXHR, textStatus, errorThrown) {
						var err = "";
						try {
							err = JSON.parse(jqXHR.responseText);
						} catch (e) {
							err = JSON.parse('"' + jqXHR.responseText + '"');
						}
						promise.asyncError(new AjaxException(jqXHR.status, errorThrown, err));
					}
				});
				return promise;
			}
			
		};
	});
});
	
Scoped.define("module:Cookies", ["base:Strings"], function (Strings) {
	return {		
	
		get : function(key) {
			return Strings.read_cookie_string(document.cookie, key);
		},
	
		set : function(key, value) {
			document.cookie = Strings.write_cookie_string(document.cookie, key, value);
		}
		
	};
});
Scoped.define("module:Dom", ["base:Objs", "jquery:"], function (Objs, $) {
	return {	
		
		changeTag: function (node, name) {
			var replacement = document.createElement(name);
			for (var i = 0; i < node.attributes.length; ++i)
				replacement.setAttribute(node.attributes[i].nodeName, node.attributes[i].nodeValue);
		    while (node.firstChild)
		        replacement.appendChild(node.firstChild);
		    node.parentNode.replaceChild(replacement, node);
			return replacement;
		},		
		
		traverseNext: function (node, skip_children) {
			if ("get" in node)
				node = node.get(0);
			if (node.firstChild && !skip_children)
				return $(node.firstChild);
			if (!node.parentNode)
				return null;
			if (node.nextSibling)
				return $(node.nextSibling);
			return this.traverseNext(node.parentNode, true);
		},
		
		/** @suppress {checkTypes} */
		selectNode : function(node, offset) {
			node = $(node).get(0);
			var selection = null;
			var range = null;
			if (window.getSelection) {
				selection = window.getSelection();
				selection.removeAllRanges();
				range = document.createRange();
			} else if (document.selection) {
				selection = document.selection;
				range = selection.createRange();
			}
			if (offset) {
				range.setStart(node, offset);
				range.setEnd(node, offset);
				selection.addRange(range);
			} else {
				range.selectNode(node);
				selection.addRange(range);
			}
		},
	
		/** @suppress {checkTypes} */
		selectionStartNode : function() {
			if (window.getSelection)
				return $(window.getSelection().getRangeAt(0).startContainer);
			else if (document.selection)
				return $(document.selection.createRange().startContainer);
			return null;
		},
		
		/** @suppress {checkTypes} */
		selectedHtml : function() {
			if (window.getSelection)
				return window.getSelection().toString();
			else if (document.selection)
				return document.selection.createRange().htmlText;
			return "";
		},
		
		/** @suppress {checkTypes} */
		selectionAncestor : function() {
			if (window.getSelection)
				return $(window.getSelection().getRangeAt(0).commonAncestorContainer);
			else if (document.selection)
				return $(document.selection.createRange().parentElement());
			return null;
		},
		
		/** @suppress {checkTypes} */
		selectionStartOffset: function () {
			if (window.getSelection)
				return window.getSelection().getRangeAt(0).startOffset;
			else if (document.selection)
				return document.selection.createRange().startOffset;
			return null;
		},
		
		/** @suppress {checkTypes} */
		selectionEndOffset: function () {
			if (window.getSelection)
				return window.getSelection().getRangeAt(0).endOffset;
			else if (document.selection)
				return document.selection.createRange().endOffset;
			return null;
		},
	
		/** @suppress {checkTypes} */
		selectionStart : function() {
			if (window.getSelection)
				return $(window.getSelection().getRangeAt(0).startContainer);
			else if (document.selection)
				return $(document.selection.createRange().startContainer);
			return null;
		},
	
		/** @suppress {checkTypes} */
		selectionEnd : function() {
			if (window.getSelection)
				return $(window.getSelection().getRangeAt(0).endContainer);
			else if (document.selection)
				return $(document.selection.createRange().endContainer);
			return null;
		},
		
		/** @suppress {checkTypes} */
		selectionNonEmpty: function () {
			var start = this.selectionStart();
			var end = this.selectionEnd();
			return start && end && start.get(0) && end.get(0) && (start.get(0) != end.get(0) || this.selectionStartOffset() != this.selectionEndOffset());
		},
		
		/** @suppress {checkTypes} */
		selectionContained: function (node) {
			return node.has(this.selectionStart()).length > 0 && node.has(this.selectionEnd()).length > 0;
		},
	
		/** @suppress {checkTypes} */
		selectionNodes: function () {
			var result = [];
			var start = this.selectionStart();
			var end = this.selectionEnd();
			result.push(start);
			var current = start;
			while (current.get(0) != end.get(0)) {
				current = this.traverseNext(current);
				result.push(current);
			}
			return result;
		},
		
		/** @suppress {checkTypes} */
		selectionLeaves: function () {
			return Objs.filter(this.selectionNodes(), function (node) { return node.children().length === 0; });
		},
		
		contentSiblings: function (node) {
			return node.parent().contents().filter(function () {
				return this != node.get(0);
			});
		},
		
		remove_tag_from_parent_path: function (node, tag, context) {	
			tag = tag.toLowerCase();
			node = $(node);
			var parents = node.parents(context ? context + " " + tag : tag);
			for (var i = 0; i < parents.length; ++i) {
				var parent = parents.get(i);
				parent = $(parent);
				while (node.get(0) != parent.get(0)) {
					this.contentSiblings(node).wrap("<" + tag + "></" + tag + ">");
					node = node.parent();
				}
				parent.contents().unwrap();
			}
		},
		
		/** @suppress {checkTypes} */
		selectionSplitOffsets: function () {
			var startOffset = this.selectionStartOffset();
			var endOffset = this.selectionEndOffset();
			var start = this.selectionStart();
			var end = this.selectionEnd();
			var single = start.get(0) == end.get(0);
			if (endOffset < end.get(0).wholeText.length) {
				var endElem = end.get(0);
				endElem.splitText(endOffset);
				end = $(endElem);
				if (single)
					start = end;
			}
			if (startOffset > 0) {
				start = $(start.get(0).splitText(startOffset));
				if (single)
					end = start;
			}
			this.selectRange(start, end);
		},
		
		/** @suppress {checkTypes} */
		selectRange: function (start_node, end_node, start_offset, end_offset) {
			start_node = $(start_node);
			end_node = $(end_node);
			var selection = null;
			var range = null;
			if (window.getSelection) {
				selection = window.getSelection();
				selection.removeAllRanges();
				range = document.createRange();
			} else if (document.selection) {
				selection = document.selection;
				range = selection.createRange();
			}
			range.setStart(start_node.get(0), start_offset || 0);
			range.setEnd(end_node.get(0), end_offset || end_node.get(0).data.length);
			selection.addRange(range);
		},
		
		splitNode: function (node, start_offset, end_offset) {
			node = $(node);
			start_offset = start_offset || 0;
			end_offset = end_offset || node.get(0).data.length;
			if (end_offset < node.get(0).data.length) {
				var elem = node.get(0);
				elem.splitText(end_offset);
				node = $(elem);
			}
			if (start_offset > 0) 
				node = $(node.get(0).splitText(start_offset));
			return node;
		}
				
	};
});
/*
Copyright (c) Copyright (c) 2007, Carl S. Yestrau All rights reserved.
Code licensed under the BSD License: http://www.featureblend.com/license.txt
Version: 1.0.4
*/

Scoped.define("module:FlashDetect", ["base:Class"], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function () {
				inherited.constructor.call(this);
				this.__version = null;
		        if (navigator.plugins && navigator.plugins.length > 0) {
		            var type = 'application/x-shockwave-flash';
		            var mimeTypes = navigator.mimeTypes;
		            if (mimeTypes && mimeTypes[type] && mimeTypes[type].enabledPlugin && mimeTypes[type].enabledPlugin.description)
		                this.__version = this.parseVersion(mimeTypes[type].enabledPlugin.description);
		        } else if (navigator.appVersion.indexOf("Mac") == -1 && window.execScript) {
		            for (var i = 0; i < this.__activeXDetectRules.length; i++) {
				        try {
				            var obj = new ActiveXObject(this.__activeXDetectRules[i].name);
				            var version = this.__activeXDetectRules[i].version(obj);
		                    if (version) {
		                    	this.__version = this.parseActiveXVersion(version);
		                    	break;
		                    }
				        } catch (err) { }
				    }
				}
			},
			
		    parseVersion: function(str) {
		        var descParts = str.split(/ +/);
		        var majorMinor = descParts[2].split(/\./);
		        var revisionStr = descParts[3];
		        return {
		            "raw": str,
		            "major": parseInt(majorMinor[0], 10),
		            "minor": parseInt(majorMinor[1], 10), 
		            "revisionStr": revisionStr,
		            "revision": parseInt(revisionStr.replace(/[a-zA-Z]/g, ""), 10)
		        };
		    },
			
		    parseActiveXVersion : function(str) {
		        var versionArray = str.split(",");
		        return {
		            "raw": str,
		            "major": parseInt(versionArray[0].split(" ")[1], 10),
		            "minor": parseInt(versionArray[1], 10),
		            "revision": parseInt(versionArray[2], 10),
		            "revisionStr": versionArray[2]
		        };
		    },
			
			version: function () {
				return this.__version;
			},
			
			installed: function () {
				return this.__version !== null;
			},
			
			supported: function () {
				var ua = navigator.userAgent;
				return this.installed() || !(ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1 || ua.indexOf('iPad') != -1);
			},
			
		    majorAtLeast : function (version) {
		        return this.installed() && this.version().major >= version;
		    },
		
		    minorAtLeast : function (version) {
		        return this.installed() && this.version().minor >= version;
		    },
		
		    revisionAtLeast : function (version) {
		        return this.installed() && this.version().revision >= version;
		    },
		
		    versionAtLeast : function (major) {
		    	if (!this.installed())
		    		return false;
		        var properties = [this.version().major, this.version().minor, this.version().revision];
		        var len = Math.min(properties.length, arguments.length);
		        for (var i = 0; i < len; i++) {
		            if (properties[i] != arguments[i]) 
		            	return properties[i] > arguments[i];
		        }
		        return true;
		    },
			
		    __activeXDetectRules: [{
		        name: "ShockwaveFlash.ShockwaveFlash.7",
		        version: function(obj) {
			        try {
			            return obj.GetVariable("$version");
			        } catch(err) {
			        	return null;
			        }
			    }
			}, {
				name: "ShockwaveFlash.ShockwaveFlash.6",
		        version: function(obj) {
		            try {
		                obj.AllowScriptAccess = "always";
				        try {
				            return obj.GetVariable("$version");
				        } catch(err) {
				        	return null;
				        }
		            } catch(err) {
		            	return "6,0,21";
		            }
		        }
			}, {
				name: "ShockwaveFlash.ShockwaveFlash",
				version: function(obj) {
			        try {
			            return obj.GetVariable("$version");
			        } catch(err) {
			        	return null;
			        }
		        }
		    }]
		    
		};
	});
});


Scoped.define("module:FlashHelper", [
    "base:Time", "base:Objs", "base:Types", "base:Net.Uri", "module:Info", "jquery:"
], function (Time, Objs, Types, Uri, Info, $) {
	return {
		
		getFlashObject: function (container) {
			var embed = $(container).find("embed").get(0);
			if (Info.isInternetExplorer() && Info.internetExplorerVersion() <= 10)
				embed = null;
			if (!embed)
				embed = $(container).find("object").get(0);
			if (!embed) {
				var objs = $("object");
				for (var i = 0; i < objs.length; ++i) {
					if ($(objs[i]).closest(container).length > 0)
						embed = $(objs[i]).get(0);
				}
			}
			return embed;
		},
		
		embedTemplate: function (options) {
			options = options || {};
			var params = [];
			params.push({
				"objectKey": "classid",
				"value": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"
			});
			params.push({
				"objectKey": "codebase",
				"value": "http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab"
			});
			params.push({
				"embedKey": "align",
				"value": "middle"
			});
			params.push({
				"embedKey": "play",
				"value": "true"
			});
			params.push({
				"embedKey": "loop",
				"value": "false"
			});
			params.push({
				"embedKey": "type",
				"value": "application/x-shockwave-flash"
			});
			params.push({
				"embedKey": "pluginspage",
				"value": "http://www.adobe.com/go/getflashplayer"
			});
			params.push({
				"objectParam": "quality",
				"embedKey": "quality",
				"value": "high"
			});
			params.push({
				"objectParam": "allowScriptAccess",
				"embedKey": "allowScriptAccess",
				"value": "always"
			});
			params.push({
				"objectParam": "wmode",
				"embedKey": "wmode",
				"value": "opaque"
			});
			params.push({
				"objectParam": "movie",
				"embedKey": "src",
				"value": options.flashFile + (options.forceReload ? "?" + Time.now() : "") 
			});
			if (options.width) {
				params.push({
					"objectKey": "width",
					"embedKey": "width",
					"value": options.width
				});
			}
			if (options.height) {
				params.push({
					"objectKey": "height",
					"embedKey": "height",
					"value": options.height
				});
			}
			if (options.bgcolor) {
				params.push({
					"objectParam": "bgcolor",
					"embedKey": "bgcolor",
					"value": options.bgcolor
				});
			}
			if (options.FlashVars) {
				params.push({
					"objectParam": "FlashVars",
					"embedKey": "FlashVars",
					"value": Types.is_object(options.FlashVars) ? Uri.encodeUriParams(options.FlashVars) : options.FlashVars
				});
			}
			if (options.objectId) {
				params.push({
					"objectKey": "id",
					"value": options.objectId
				});
			}
			var objectKeys = [];
			var objectParams = [];
			var embedKeys = [];
			Objs.iter(params, function (param) {
				if (param.objectKey)
					objectKeys.push(param.objectKey + '="' + param.value + '"');
				if (param.embedKey)
					embedKeys.push(param.embedKey + '="' + param.value + '"');
				if (param.objectParam)
					objectParams.push('<param name="' + param.objectParam + '" value="' + param.value + '" />');
			}, this);
			return "<object " + objectKeys.join(" ") + ">" + objectParams.join(" ") + "<embed " + embedKeys.join(" ") + "></embed></object>";
		},
		
		embedFlashObject: function (container, options) {
			if (options && options.parentBgcolor) {
				try {
					var hex = $(container).css("background-color");
					if (hex.indexOf("rgb") >= 0) {
						var rgb = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
					    var convert = function (x) {
					        return ("0" + parseInt(x, 10).toString(16)).slice(-2);
					    };
					    if (rgb && rgb.length > 3)
					    	hex = "#" + convert(rgb[1]) + convert(rgb[2]) + convert(rgb[3]);
					}
					options.bgcolor = hex;
				} catch (e) {}
			}
			$(container).html(this.embedTemplate(options));
			return this.getFlashObject(container);
		}
		
	};	
});

/*
 * Uses modified portions of:
 * 
 * http://www.openjs.com/scripts/events/keyboard_shortcuts/
 * Version : 2.01.B
 * By Binny V A
 * License : BSD
 */

Scoped.define("module:Hotkeys", ["base:Objs", "jquery:"], function (Objs, $) {
	return {		
		
		SHIFT_NUMS: {
			"`":"~",
			"1":"!",
			"2":"@",
			"3":"#",
			"4":"$",
			"5":"%",
			"6":"^",
			"7":"&",
			"8":"*",
			"9":"(",
			"0":")",
			"-":"_",
			"=":"+",
			";":":",
			"'":"\"",
			",":"<",
			".":">",
			"/":"?",
			"\\":"|"
		},
		
		SPECIAL_KEYS: {
			'esc':27,
			'escape':27,
			'tab':9,
			'space':32,
			'return':13,
			'enter':13,
			'backspace':8,
	
			'scrolllock':145,
			'scroll_lock':145,
			'scroll':145,
			'capslock':20,
			'caps_lock':20,
			'caps':20,
			'numlock':144,
			'num_lock':144,
			'num':144,
			
			'pause':19,
			'break':19,
			
			'insert':45,
			'home':36,
			'delete':46,
			'end':35,
			
			'pageup':33,
			'page_up':33,
			'pu':33,
	
			'pagedown':34,
			'page_down':34,
			'pd':34,
	
			'left':37,
			'up':38,
			'right':39,
			'down':40,
	
			'f1':112,
			'f2':113,
			'f3':114,
			'f4':115,
			'f5':116,
			'f6':117,
			'f7':118,
			'f8':119,
			'f9':120,
			'f10':121,
			'f11':122,
			'f12':123
		},
		
		MODIFIERS: ["ctrl", "alt", "shift", "meta"],
		
		keyCodeToCharacter: function (code) {
			if (code == 188)
				return ",";
			else if (code == 190)
				return ".";
			return String.fromCharCode(code).toLowerCase();
		},
		
		register: function (hotkey, callback, context, options) {
			var self = this;
			options = Objs.extend({
				"type": "keyup",
				"propagate": false,
				"disable_in_input": false,
				"target": document,
				"keycode": false
			}, options);
			options.target = $(options.target);
			var keys = hotkey.toLowerCase().split("+");
			var func = function (e) {
				if (options.disable_in_input) {
					var element = e.target || e.srcElement || null;
					if (element && element.nodeType == 3)
						element = element.parentNode;
					if (element && (element.tagName == 'INPUT' || element.tagName == 'TEXTAREA'))
						return;
				}
				var code = e.keyCode || e.which || 0;
				var character = self.keyCodeToCharacter(code);
				var kp = 0;
				var modifier_map = {};
				Objs.iter(self.MODIFIERS, function (mod) {
					modifier_map[mod] = {
						pressed: e[mod + "Key"],
						wanted: false
					};
				}, this);
				Objs.iter(keys, function (key) {
					if (key in modifier_map) {
						modifier_map[key].wanted = true;
						kp++;
					} else if (key.length > 1) {
						if (self.SPECIAL_KEYS[key] == code)
							kp++;
					} else if (options.keycode) {
						if (options.keycode == code)
							kp++;
					} else if (character == key || (e.shiftKey && self.SHIFT_NUMS[character] == key)) {
						kp++;
					}
				}, this);
				if (kp == keys.length && Objs.all(modifier_map, function (data) { return data.wanted == data.pressed; })) {
					callback.apply(context || this);
					if (!options.propagate)
						e.preventDefault();
				}
			};
			options.target.on(options.type, func);
			return {
				target: options.target,
				type: options.type,
				func: func
			};
		},
		
		unregister: function (handle) {
			handle.target.off(handle.type, handle.func);
		} 
		
	};
});
Scoped.define("module:Info", [
        "base:Objs", "module:FlashDetect"
    ], function (Objs, FlashDetect) {
	return {
		
		__navigator: null,
		
		getNavigator: function () {
			if (!this.__navigator) {
				this.__navigator = {
					appCodeName: navigator.appCodeName,
					appName: navigator.appName,
					appVersion: navigator.appVersion,
					cookieEnabled: navigator.cookieEnabled,
					onLine: navigator.onLine,
					platform: navigator.platform,
					userAgent: navigator.userAgent,
					window_chrome: "chrome" in window,
					window_opera: "opera" in window
				};
			}
			return this.__navigator;
		},
		
		__cache: {},
		
		__cached: function (key, value_func) {
			if (!(key in this.__cache)) {
				var n = this.getNavigator();
				this.__cache[key] = value_func.call(this, n, n.userAgent, n.userAgent.toLowerCase());
			}
			return this.__cache[key];
		},
		
		setNavigator: function (obj) {
			this.__navigator = obj;
			this.__cache = {};
		},
	
		flash: function () {
			return this.__cached("flash", function () {
				return new FlashDetect();
			});
		},
		
		isiOS: function () {
			return this.__cached("isiOS", function (nav, ua) {
				if (this.isInternetExplorer())
					return false;
				return ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1 || ua.indexOf('iPad') != -1;
			});
		},
		
		isChrome: function () {
			return this.__cached("isChrome", function (nav, ua) {
				return (nav.window_chrome || ua.indexOf('CriOS') != -1) && !this.isOpera();
			});
		},
		
		isOpera: function () {
			return this.__cached("isOpera", function (nav, ua) {
				return nav.window_opera || ua.indexOf(' OPR/') >= 0 || ua.indexOf("OPiOS") >= 0;
			});
		},
		
		isAndroid: function () {
			return this.__cached("isAndroid", function (nav, ua, ualc) {
				return ualc.indexOf("android") != -1;
			});
		},
		
		isWebOS: function () {
			return this.__cached("isWebOS", function (nav, ua, ualc) {
				return ualc.indexOf("webos") != -1;
			});
		},
	
		isWindowsPhone: function () {
			return this.__cached("isWindowsPhone", function (nav, ua, ualc) {
				return ualc.indexOf("windows phone") != -1;
			});
		},
	
		isBlackberry: function () {
			return this.__cached("isBlackberry", function (nav, ua, ualc) {
				return ualc.indexOf("blackberry") != -1;
			});
		},
	
		iOSversion: function () {
			return this.__cached("iOSversion", function (nav) {
				if (!this.isiOS())
					return false;
			    var v = (nav.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
			    return {
			    	major: parseInt(v[1], 10),
			    	minor: parseInt(v[2], 10),
			    	revision: parseInt(v[3] || 0, 10)
			    };
			});
		},
		
		isMobile: function () {
			return this.__cached("isMobile", function () {
				return this.isiOS() || this.isAndroid() || this.isWebOS() || this.isWindowsPhone() || this.isBlackberry();
			});
		},
		
		isDesktop: function () {
			return this.__cached("isDesktop", function () {
				return !this.isMobile();
			});
		},
		
		isInternetExplorer: function () {
			return this.__cached("isInternetExplorer", function () {
				//return navigator.appName == 'Microsoft Internet Explorer';
				return this.internetExplorerVersion() !== null;
			});
		},
		
		isFirefox: function () {
			return this.__cached("isFirefox", function (nav, ua, ualc) {
				return ualc.indexOf("firefox") != -1;
			});
		},
		
		isSafari: function () {
			return this.__cached("isSafari", function (nav, ua, ualc) {
				return !this.isChrome() && !this.isOpera() && ualc.indexOf("safari") != -1;
			});
		},
		
		isWindows: function () {
			return this.__cached("isWindows", function (nav) {
				return nav.appVersion.toLowerCase().indexOf("win") != -1;
			});
		},
		
		isMacOS: function () {
			return this.__cached("isMacOS", function (nav) {
				return !this.isiOS() && nav.appVersion.toLowerCase().indexOf("mac") != -1;
			});
		},
		
		isUnix: function () {
			return this.__cached("isUnix", function (nav) {
				return nav.appVersion.toLowerCase().indexOf("x11") != -1;
			});
		},
		
		isLinux: function () {
			return this.__cached("isLinux", function (nav) {
				return !this.isAndroid() && nav.appVersion.toLowerCase().indexOf("linux") != -1;
			});
		},
		
		internetExplorerVersion: function () {
			return this.__cached("internetExplorerVersion", function (nav, ua) {
				if (nav.appName == 'Microsoft Internet Explorer') {
				    var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
				    var ma = re.exec(ua);
				    if (ma)
				    	return ma[1];
				} else if (nav.appName == 'Netscape') {
				    var re2 = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
				    var ma2 = re2.exec(nav.userAgent); 
				    if (ma2)
				    	return parseFloat(ma2[1]);
				}
				return null;
			});
		},
		
		inIframe: function () {
		    try {
		        return window.self !== window.top;
		    } catch (e) {
		        return true;
		    }
		},
		
		__devicesMap: {
		    mobile: {
		    	format: "Mobile",
		    	check: function () { return this.isMobile(); }
		    }, desktop: {
		    	format: "Desktop",
		    	check: function () { return this.isDesktop(); }
		    }
		},
		
		__obtainMatch: function (map, def) {
			var result = null;
			Objs.iter(map, function (value, key) {
				if (value.check.apply(this)) {
					if (result) {
						result = null;
						return false;
					}
					result = Objs.clone(value, 1);
					delete result.check;
					result.key = key;
				}
			}, this);
			return result || def;
		},
		
		getDevice: function () {
			return this.__cached("getDevice", function () {
				return this.__obtainMatch(this.__devicesMap, {
					key: "unknown",
					format: "Unknown Device"
				});
			});
		},
		
		formatDevice: function () {
			return this.getDevice().format;
		},
		
		__osMap: {
		    macosx: {
		    	format: "Mac OS-X",
		    	check: function () { return this.isMacOS(); }
		    }, windows: {
		    	format: "Windows",
		    	check: function () { return this.isWindows(); }
		    }, unix: {
		    	format: "Unix",
		    	check: function () { return this.isUnix(); }
		    }, linux: {
		    	format: "Linux",
		    	check: function () { return this.isLinux(); }
		    }, ios: {
		    	format: "iOS",
		    	check: function () { return this.isiOS(); },
		    	version: function () {
		    		return this.iOSversion().major + "." + this.iOSversion().minor + "." + this.iOSversion().revision;
		    	}
		    }, android: {
		    	format: "Android",
		    	check: function () { return this.isAndroid(); }
		    }, webos: {
		    	format: "WebOS",
		    	check: function () { return this.isWebOS(); }
		    }, windowsphone: {
		    	format: "Windows Phone",
		    	check: function () { return this.isWindowsPhone(); }
		    }, blackberry: {
		    	format: "Blackberry",
		    	check: function () { return this.isBlackberry(); }
		    }
		},
		
		getOS: function () {
			return this.__cached("getOS", function () {
				return this.__obtainMatch(this.__osMap, {
					key: "unknown",
					format: "Unknown Operating System"
				});
			});
		},
		
		formatOS: function () {
			return this.getOS().format;
		},
		
		formatOSVersion: function () {
			return this.getOS().version ? this.getOS().version.apply(this) : ""; 
		},
			
		__browserMap: {
		    chrome: {
		    	format: "Chrome",
		    	check: function () { return this.isChrome(); }
		    }, opera: {
		    	format: "Opera",
		    	check: function () { return this.isOpera(); }
		    }, internetexplorer: {
		    	format: "Internet Explorer",
		    	check: function () { return this.isInternetExplorer(); },
		    	version: function () {
		    		return this.internetExplorerVersion();
		    	}
		    }, firefox: {
		    	format: "Firefox",
		    	check: function () { return this.isFirefox(); }
		    }, safari: {
		    	format: "Safari",
		    	check: function () { return this.isSafari(); }
		    }, android: {
		    	format: "Android",
		    	check: function () { return this.isAndroid() && !this.isChrome(); }
		    }, webos: {
		    	format: "WebOS",
		    	check: function () { return this.isWebOS(); }
		    }, windowsphone: {
		    	format: "Windows Phone",
		    	check: function () { return this.isWindowsPhone(); }
		    }, blackberry: {
		    	format: "Blackberry",
		    	check: function () { return this.isBlackberry(); }
		    }
		},
		
		getBrowser: function () {
			return this.__cached("getBrowser", function () {
				return this.__obtainMatch(this.__browserMap, {
					key: "unknown",
					format: "Unknown Browser"
				});
			});
		},
		
		formatBrowser: function () {
			return this.getBrowser().format;
		},
		
		formatBrowserVersion: function () {
			return this.getBrowser().version ? this.getBrowser().version.apply(this) : ""; 
		},

		formatFlash: function () {
			return this.flash().installed() ?
				("Flash " + this.flash().version().raw) :
				(this.flash().supported() ?
					"Flash not installed but supported" :
					"Flash not supported");
		}
		
	};
});	

Scoped.define("module:Loader", ["jquery:"], function ($) {
	return {				
		
		loadScript: function (url, callback, context) {
			var executed = false;
			var head = document.getElementsByTagName("head")[0];
			var script = document.createElement("script");
			script.src = url;
			script.onload = script.onreadystatechange = function() {
				if (!executed && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					executed = true;
					script.onload = script.onreadystatechange = null;
					if (callback)
						callback.call(context || this, url);
					// Does not work properly if we remove the script for some reason if it is used the second time !?
					//head.removeChild(script);
				}
			};
			head.appendChild(script);
		},
		
		loadStyles: function (url, callback, context) {
			var executed = false;
			var head = document.getElementsByTagName("head")[0];
			var style = document.createElement("link");
			style.rel = "stylesheet";
			style.href = url;
			style.onload = style.onreadystatechange = function() {
				if (!executed && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
					executed = true;
					style.onload = style.onreadystatechange = null;
					if (callback)
						callback.call(context || this, url);
				}
			};
			head.appendChild(style);
		},
	
		inlineStyles: function (styles) {
			$('<style>' + styles + "</style>").appendTo("head");
		},
		
		loadHtml: function (url, callback, context) {
			$.ajax({
				url: url,
				dataType: "html"
			}).done(function(content) {
				callback.call(context || this, content, url);
			});
		},
		
		findScript: function (substr) {
			for (var i = 0; i < document.scripts.length; ++i)
				if (document.scripts[i].src.toLowerCase().indexOf(substr.toLowerCase()) >= 0)
					return document.scripts[i];
			return null;
		}

	};
});
Scoped.define("module:HashRouteBinder", ["base:Router.RouteBinder", "jquery:"], function (RouteBinder, $, scoped) {
	return RouteBinder.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (router) {
				inherited.constructor.call(this, router);
				var self = this;
				$(window).on("hashchange.events" + this.cid(), function () {
					self._localRouteChanged();
				});
			},
			
			destroy: function () {				
				$(window).off("hashchange.events" + this.cid());
				inherited.destroy.call(this);
			},
			
			_getLocalRoute: function () {
				var hash = window.location.hash;
				return (hash.length && hash[0] == '#') ? hash.slice(1) : hash;
			},
			
			_setLocalRoute: function (currentRoute) {
				window.location.hash = "#" + currentRoute.route;
			}
			
		};
	});
});


Scoped.define("module:HistoryRouteBinder", ["base:Router.RouteBinder", "jquery:"], function (RouteBinder, $, scoped) {
	return RouteBinder.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (router) {
				inherited.constructor.call(this, router);
				var self = this;
				this.__used = false;
				$(window).on("popstate.events" + this.cid(), function () {
					if (self.__used)
						self._localRouteChanged();
				});
			},
			
			destroy: function () {
				$(window).off("popstate.events" + this.cid());
				inherited.destroy.call(this);
			},
		
			_getLocalRoute: function () {
				return window.location.pathname;
			},
			
			_setLocalRoute: function (currentRoute) {
				window.history.pushState({}, document.title, currentRoute.route);
				this.__used = true;
			}
		};
	}, {
		supported: function () {
			return window.history && window.history.pushState;
		}
	});
});


Scoped.define("module:LocationRouteBinder", ["base:Router.RouteBinder"], function (RouteBinder, scoped) {
	return RouteBinder.extend({scoped: scoped}, {
		
		_getLocalRoute: function () {
			return window.location.pathname;
		},
		
		_setLocalRoute: function (currentRoute) {
			window.location.pathname = currentRoute.route;
		}
		
	});
});

Scoped.define("module:Upload.FileUploader", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Types"
], function (ConditionalInstance, EventsMixin, Objs, Types, scoped) {
	return ConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				this._uploading = false;
			},

			upload: function () {
				this._uploading = true;
				this._options.resilience--;
				this._upload();
				this.trigger("uploading");
				return this;
			},
			
			_upload: function () {},
			
			_progressCallback: function (uploaded, total) {
				this.trigger("progress", uploaded, total);
			},
			
			_successCallback: function (data) {
				this._uploading = false;
				this.trigger("success", data);
			},
			
			_errorCallback: function (data) {
				this._uploading = false;
				this.trigger("error", data);
				if (this._options.resilience > 0)
					this.upload();
			}
			
		};
	}], {
		
		_initializeOptions: function (options) {
			return Objs.extend({
				//url: "",
				//source: null,
				serverSupportChunked: false,
				serverSupportPostMessage: false,
				isBlob: typeof Blob !== "undefined" && options.source instanceof Blob,
				resilience: 1
			}, options);
		}
		
	});
});


Scoped.define("module:Upload.FormDataFileUploader", [
    "module:Upload.FileUploader",
    "module:Info",
    "jquery:"
], function (FileUploader, Info, $, scoped) {
	var Cls = FileUploader.extend({scoped: scoped}, {
		
		_upload: function () {
			var self = this;
			var formData = new FormData();
        	formData.append("file", this._options.isBlob ? this._options.source : this._options.source.files[0]);
			$.ajax({
				type: "POST",
				async: true,
				url: this._options.url,
				data: formData,
    			cache: false,
    			contentType: false,
				processData: false,				
				xhr: function() {
		            var myXhr = $.ajaxSettings.xhr();
		            if (myXhr.upload) {
		                myXhr.upload.addEventListener('progress', function (e) {
							if (e.lengthComputable)
			                	self._progressCallback(e.loaded, e.total);
		                }, false);
		            }
		            return myXhr;
		        }
			}).success(function (data) {
				self._successCallback(data);
			}).error(function (data) {
				self._errorCallback(data);
			});
		}
		
	}, {
		
		supported: function (options) {
			if (Info.isInternetExplorer() && Info.internetExplorerVersion() <= 9)
				return false;
			try {
				new FormData();
			} catch (e) {
				return false;
			}
			return true;
		}
		
	});	
	
	FileUploader.register(Cls, 2);
	
	return Cls;
});



Scoped.define("module:Upload.FormIframeFileUploader", [
     "module:Upload.FileUploader",
     "jquery:",
     "base:Net.Uri",
     "json:"
], function (FileUploader, $, Uri, JSON, scoped) {
	var Cls = FileUploader.extend({scoped: scoped}, {
		
		_upload: function () {
			var self = this;
			var iframe = document.createElement("iframe");
			var id = "upload-iframe-" + this.cid();
			iframe.id = id;
			iframe.name = id;
			iframe.style.display = "none";
			var form = document.createElement("form");
			form.method = "POST";
			form.target = id;
			form.style.display = "none";
			document.body.appendChild(iframe);
			document.body.appendChild(form);
			var oldParent = this._options.source.parent;
			form.appendChild(this._options.source);
			var post_message_fallback = !("postMessage" in window);
			iframe.onerror = function () {
				if (post_message_fallback)
					window.postMessage = null;
				$(window).off("message." + self.cid());
				if (oldParent)
					oldParent.appendChild(this._options.source);
				document.body.removeChild(form);
				document.body.removeChild(iframe);
				self._errorCallback();
			};				
			form.action = Uri.appendUriParams(this._options.url, {"_postmessage": true});
			form.encoding = form.enctype = "multipart/form-data";
			var handle_success = function (raw_data) {
				if (post_message_fallback)
					window.postMessage = null;
				$(window).off("message." + self.cid());
				if (oldParent)
					oldParent.appendChild(this._options.source);
				var data = JSON.parse(raw_data);
				document.body.removeChild(form);
				document.body.removeChild(iframe);
				self._successCallback(data);
			};
			$(window).on("message." + this.cid(), function (event) {
				handle_success(event.originalEvent.data);
			});
			if (post_message_fallback) 
				window.postMessage = handle_success;
			form.submit();
		}
		
	}, {
		
		supported: function (options) {
			return !options.isBlob && options.serverSupportPostMessage;
		}
		
	});	
	
	FileUploader.register(Cls, 1);
	
	return Cls;
});



Scoped.define("module:Upload.ResumableFileUploader", [
    "module:Upload.FileUploader",
    "resumablejs:"
], function (FileUploader, ResumableJS, scoped) {
	var Cls = FileUploader.extend({scoped: scoped}, {
		
		_upload: function () {
			this._resumable = new ResumableJS({
				target: this._options.url
			});
			this._resumable.addFile(this._options.source);
			var self = this;
			this._resumable.on("fileProgress", function (file) {
				var size = self._resumable.size;
				self._progressCallback(Math.floor(self._resumable.progress() / size), size);
			}).on("fileSuccess", function (file, message) {
				self._successCallback(message);
			}).on("fileError", function (file, message) {
				self._errorCallback(message);
			});
			this._resumable.upload();
		}
		
	}, {
		
		supported: function (options) {
			return options.serverSupportChunked && (new ResumableJS()).support;
		}
		
	});	
	
	FileUploader.register(Cls, 3);
	
	return Cls;
});
}).call(Scoped);