//
// chromelink.js - wrapper for chrome extension APIs
//

var chromelink = {};
chromelink.downloadHandlers = [];
chromelink.browserAction = {};

function namespace_chromelink() {
	chromelink.addDownloadHandler = function(handler) {
		chromelink.downloadHandlers.push(handler);
	};

	chromelink.removeDownloadHandler = function(id) {
		chromelink.downloadHandlers.forEach(function(handler, index, array) {
			if (handler.id === id) {
				array.splice(index, 1);
			}
		});
	};

	chrome.downloads.onChanged.addListener(function(downloadDelta) {
		chromelink.downloadHandlers.forEach(function(handler) {
			handler.handle(downloadDelta);
		});
	});


	var i = 0;
	var step = 1;
	var animateLogo = false;
	var animationInterval = 30;
	var iconEnabled = false;

	var timer = window.setInterval(function() {
	  
	  if (animateLogo == false && i == 0) {
		return;
	  }
	  
	  i += step;
	  if (i == IMG_BROWSER_ACTION.length) {
		step = -1;
	  }
	  
	  if (i == 0) {
		step = 1;
	  }

	 chrome.browserAction.setIcon({path: IMG_BROWSER_ACTION[i]});

	}, animationInterval);


	chromelink.browserAction.animate = function(times) {
		animateLogo = true;
		var interval = window.setInterval(function() {
			animateLogo = false;
			window.clearInterval(interval);
			
		}, animationInterval * 5 * times * 2);
		
	};

	chromelink.browserAction.update = function() {

		var enabled = clientConnected === true;

		if (enabled) {
			  chrome.browserAction.setIcon({path: IMG_BROWSER_ACTION[0]});
			  if (iconEnabled === false) {
				  chromelink.browserAction.animate(2);
			  }
		} else {
			  chrome.browserAction.setIcon({path: IMG_BROWSER_ACTION_DISABLED});
		}
		iconEnabled = enabled;
	};
}
namespace_chromelink();