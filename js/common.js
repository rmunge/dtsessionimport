//
// common.js - Global constants / functions for backend and content scripts
//

// Messages which are sent between bg.js and the content scripts
var MSG_Import_Request = "request-import";     // content stript requests a session import
var MSG_Import_Response = "response";          // background script informas about finished session import
var MSG_ConfirmResponse = "confirm-response";  // content script confirms that it received the response (and stopped animiation)
var MSG_StatusUpdate = "status-update";        // background script sends update about connection status of the client

var IMG_ERROR = "/img/error.png";
var IMG_IMPORT_SESSION = "img/dynatrace.png";
var IMG_BROWSER_ACTION_DISABLED = "img/logo_disabled.png";
var IMG_BROWSER_ACTION = [
							"img/logo_0.png", 
							"img/logo_1.png", 
							"img/logo_2.png", 
							"img/logo_3.png", 
							"img/logo_4.png", 
							"img/logo_5.png"];


var LOG_OFF = { name: "INFO", value: Number.MAX_VALUE };
var LOG_SEVERE = { name: "SEVERE", value: 1000 };
var LOG_WARNING = {name: "WARNING", value: 900 };
var LOG_INFO = { name: "INFO", value: 800 };
var LOG_FINE = { name: "FINE", value: 500 };
var LOG_FINER = { name: "FINER", value: 400 };
var LOG_ALL = { name: "ALL", value: Number.MIN_VALUE };

var logging = {};
var consoleLogLevel = LOG_INFO.value;

// Simple logging 
// ... so far only intended for debugging but prepared to integrate any js loggin framework

function namespace_logging() {

	function doLog(logger, level, message) {
		if (isLoggable(level)) {
			console.log(level.name + " [" + logger + "] ", message);
		}
	}

	function isLoggable(level) {
		return level.value >= consoleLogLevel;
	}

	logging.getLogger = function(name) {
		var loggerName = name;
		if (loggerName === undefined) {
			loggerName = "";
		}
		var logger = {
			severe: function(message) {
				doLog(loggerName, LOG_SEVERE, message);
			},
			warning: function(message) {
				doLog(loggerName, LOG_WARNING, message);
			},
			info: function(message) {
				doLog(loggerName, LOG_INFO, message);
			},
			fine: function(message) {
				doLog(loggerName, LOG_FINE, message);
			},
			finer: function(message) {
				doLog(loggerName, LOG_FINER, message);
			},
			doLog: function(level) {
				return isLoggable(level);
			}
		};
		return logger;
	};
}
namespace_logging();

//TODO:
// Use standalone functions instead of prototypes:
// We use this code also within content scripts. While extending String and Array simplifies usage 
// it may have an impact on other javascript code on a page

String.prototype.endsWith = function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
};

String.prototype.isSupportArchiveFile = function() {
	var lowerCase = this.toLowerCase();
    return lowerCase.endsWith(".zip") && lowerCase.indexOf("support") != -1 && lowerCase.indexOf("archive") != -1;
};

String.prototype.isSessionFile = function() {
	var lowerCase = this.toLowerCase();
	return lowerCase.endsWith(".dts");
};

String.prototype.isSelfMonitoringSession = function() {
	return this.indexOf("Self-Monitoring") != -1;
};

String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find, 'g'), replace);
};

Array.prototype.remove = function(item) {
	var i = this.indexOf(item);
	if(i != -1) {
		this.splice(i, 1);
	}	
};

// Getting an absolute URL from a relative one
// public domain ... source: http://stackoverflow.com/questions/470832/getting-an-absolute-url-from-a-relative-one-ie6-issue
function resolveRelative(path, base) {
	// Upper directory
	if (path.startsWith("../")) {
		return resolveRelative(path.slice(3), base.replace(/\/[^\/]*$/, ''));
	}
	// Relative to the root
	if (path.startsWith('/')) {
		var match = base.match(/(\w*:\/\/)?[^\/]*\//) || [base];
		return match[0] + path.slice(1);
	}
	//relative to the current directory
	return base.replace(/\/[^\/]*$/, "") + '/' + path;
}

function stringStartsWith(string, prefix) {
	return string.slice(0, prefix.length) == prefix;
}

