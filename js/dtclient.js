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
// dtclient.js - Communication with the Dynatrace Client
//

var dtclient = {connected: false, version: undefined, error: ""};

function namespace_dtclient() {

	var URL_SESSION_IMPORT = "http://localhost:8030/rest/integration/requests/import/session/";
	var URL_VERSION_CHECK = "http://localhost:8030/rest/management/version";
	
	var log = logging.getLogger("dtclient");
	var minVersion = "6.3";
    var connectionListeners = [];

	
	dtclient.addConnectionListener = function(listener) {
		connectionListeners.push(listener);
    };
	
	dtclient.removeConnectionListener = function(listener) {
		connectionListeners.remove(listener);
	};
	
	function fireConnectionStateChanged() {
		connectionListeners.forEach(function(listener) {
			listener(dtclient.connected);
		});
	}
	/*
	 * Send a session import request to the connected Dynatrace Client. 
	 *
	 * descriptor : object {
     *   key        : string ................. A key which identifies 
	 *   file       : string ................. The local copy of the session / the downloaded session file
	 *   attachment : string ................. Name of the session on the web page, from where it was downloaded
	 *   version    : string (optional) ...... Dynatrace product version which was used to create the session file (is added as additional label)	 
	 * }
	 *
	 *  callback : function .... called after successful / failed import
	 */
	dtclient.importSession = function(descriptor, callback) {
		
		log.info("Importing: " + JSON.stringify(descriptor));
		
		var key = descriptor.key;
		var version = descriptor.version;
		var file = descriptor.file;
		var attachment = descriptor.attachment;
		
		var data = {};
		data.file = file;
		data.labels = [];
		
		if (key !== undefined) {
			data.labels.push(key); 
		}
		
		if (version !== undefined) {
			data.labels.push("Version: " + version); 
		}
		
		if ("labels" in descriptor){
			if (descriptor.labels !== undefined) {
				data.labels = data.labels.concat(descriptor.labels);
			}
		}
		
		var isSelfMonSession = attachment.isSelfMonitoringSession();
		
		if (attachment.isSupportArchiveFile()) {
			// a support archive always contains a self-monitoring session
			isSelfMonSession = true;
		}
		
		if (isSelfMonSession) {
			data.namepostfix = " (" + key + ")";
		}
		
		$.ajax({
			url: URL_SESSION_IMPORT + window.encodeURIComponent(attachment) + " from " + window.encodeURIComponent(key),
			type: "POST",
			data: JSON.stringify(data),
			contentType: "application/json",
			dataType: "json",
			error: function() { return function(xhr) {
				var statusCode = xhr.status;
				var response = xhr.responseJSON;
				
				if (statusCode == 400 && response.code == 43) {
					chrome.notifications.create(key + attachment, {type: "basic", iconUrl: IMG_ERROR, title: "Failed Import", message: attachment + " from " + key + " does not contain a Self-Monitoring session."});
				}
				
				//TODO: handle other kind of errors here
				
			}}()	
		  }).always(function() {
			 if (callback !== undefined) {
				 callback();
			 }
		  });
	};

	dtclient.ping = function updateClientConnectionState() {
		
		log.finer("Pinging Dynatrace client");
		
		loadClientVersion(function(result) {
			
			var connectedOld = dtclient.connected;
			var oldError = dtclient.error;
			
			if (result.success === false) {
				dtclient.connected = false;
				dtclient.version = undefined;
				dtclient.error = "No Dynatrace Client detected.";
			} else {
				
				if (!stringStartsWith(result.version, minVersion)) {
					dtclient.error = "Incompatible version of Dynatrace Client: " + result.version + ". Minimal required version is " + minVersion;
					dtclient.connected = false;
				} else {
					dtclient.error = "";
					dtclient.connected = true;
				}
				dtclient.version = result.version;
			}
			
			if (connectedOld !== dtclient.connected || oldError !== dtclient.error) {
				fireConnectionStateChanged();
			}
			
		});
	}

	function loadClientVersion(callback) {
		
	$.ajax
	({
	  type: "GET",
	  url: URL_VERSION_CHECK,
	  dataType: 'xml',
	  async: true,
	  success: function (data) {
		 callback({success: true, version: $(data).find("result").attr("value")});
	  },
	  error: function() {
	  }

	}).fail( function (data) {
		  callback({success: false});
	});
	}
}
namespace_dtclient();