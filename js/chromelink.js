// Copyright (c) 2015 Roland Mungenast

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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