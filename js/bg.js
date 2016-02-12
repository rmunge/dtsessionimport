//
// bg.js - background script of the chrome extension
// 

/* Main functionality: 
 *
 * - Update connection state to client
 * - Handle messages which are sent by content scripts
 */
						                    	
var clientConnected = false;
var extensionId = chrome.runtime.id;
var manifest = chrome.runtime.getManifest();

function namespace_bg() {
	
	var log = logging.getLogger("bg");

	// Add connection status listener which updates connection status within the Chrome browser (icon in the top right corner)
	dtclient.addConnectionListener(function(connected) {
		if (connected) {
			log.info("Connected to Dynatrace client, version: " + dtclient.version);
		} else {
			log.info("Disconnected from Dynatrace client");
		}
		clientConnected = connected;
		
		var title;
		
		if (dtclient.error === undefined || dtclient.error.length == 0) {
			title = "Connected to Dynatrace Client (" + dtclient.version + ")\n" + manifest.name + " (" +  manifest.version + ")";
		} else {
			title =  dtclient.error  + "\n" + manifest.name + " (" +  manifest.version + ")";
		}
		
		chrome.browserAction.setTitle({title: title});
		chromelink.browserAction.update();
	});
	
	// ping immediately - otherwise we would always have a dely of 10 seconds, even when there's already a client
	dtclient.ping();

	// Ensure regular connection state updates
	window.setInterval(function() {
		dtclient.ping();
		
	}, 10000); // every 10 seconds



	/*
	 * Returns a function with a single parameter which handles messages, sent from content scripts.
	 *  
	 * session : object {
     *   port                 : object	............ port object which allows send responses (see https://developer.chrome.com/extensions/runtime#type-Port) 
	 *   unconfirmedResponses : array of strings ... identifiers of all sent MSG_Import_Response which haven't been confirmed by the content script
	 * }
	 *
	 * returns: function(msg)
	 *
	 *  msg : object {
	 *
	 *   id         : string ................. Globally unique identifier for the request (also used for sending a response for this request)
	 *   type       : string ................. MSG_Import_Request or MSG_ConfirmResponse
	 *
	 *   Following properties are only allowed for type = MSG_Import_Request:
	 *
	 *     url        : string ................. relative URL of the attached session file
	 *     referrer   : string ................. absolute URL of the page, where the file is attached
	 *     key        : string ................. A key which identifies 
	 *     file       : string ................. The local copy of the session / the downloaded session file
	 *     attachment : string ................. Name of the session on the web page, from where it was downloaded
	 *     version    : string (optional) ...... Dynatrace product version which was used to create the session file (is added as additional label)	 
     * }
	*/
	function createMessageHandler(session) {

		var port = session.port;
		var unconfirmedResponses = session.unconfirmedResponses;

		return function(msg) {
		
			if (msg.type === MSG_ConfirmResponse) {
				// Content script was able to handle the response, no need to remember the response anymore
				unconfirmedResponses.forEach(function(element, index, array) {
					if (element.id === msg.response.id) {
						array.splice(index, 1);
					}
				});
				
			} else if (msg.type === MSG_Import_Request) {
				// Content script requests an import
				var sendResponse = function() {
					var response = {type: MSG_Import_Response, id: msg.id};
					port.postMessage(response);
					unconfirmedResponses.push(response);
				};
			
				if (!clientConnected) {
					return;
				}
				
				var downloadUrl = encodeURI(resolveRelative(msg.url, msg.referrer));

				chrome.downloads.search({url: downloadUrl}, function(results) {
					var imported = false;
					results.forEach(function(item) {
						if (imported === false && item.state === 'complete' && item.exists === true) {
							dtclient.importSession({url: downloadUrl, referrer: msg.referrer, file: item.filename, version: msg.version, key: msg.key, attachment: msg.attachment, labels: msg.labels}, sendResponse);
							imported = true;
						}
					});
					
					if (imported === true) {
						return;
					}
			
					chrome.downloads.download({url: downloadUrl}, function(downloadId) { 
						if (downloadId === undefined) {
							sendResponse();
							return;
						}
					
						chromelink.addDownloadHandler({
							id: downloadId,
							handle: function() {
								importDownload(downloadId, downloadUrl, msg.referrer, msg.version, msg.key, msg.attachment, msg.labels, sendResponse);
							}
						})
						
						log.info("Download triggered for " + downloadUrl);
					});
				});
			}
		};
	}


	function importDownload(downloadId, url, referrer, version, key, attachment, labels, callback) {
		chrome.downloads.search({id: downloadId}, function(items) {
			items.forEach(function(item) {
				
				if (downloadId !== item.id) {
					return;
				}
				
				if (item.state ===  "complete") {
					log.info("Download finished for " + item.url);
					dtclient.importSession({url: item.url, referrer: referrer, file: item.filename, version: version, key: key, attachment: attachment, labels: labels}, callback);
					chromelink.removeDownloadHandler(downloadId);
					callback();
					
				} else if (item.state === "interrupted") {
					log.info("Download interrupted for " + item.url);
					// the user canceled the download or the download failed ... TODO: what about pausing?
					chromelink.removeDownloadHandler(downloadId);
					callback();
				}
				
			});
		});
	}



	chrome.runtime.onConnect.addListener(function(port) {
		
		log.fine("Connected to " + port.sender.url);

		var session = {};
		session.port = port;
		session.unconfirmedResponses = [];
		
		// Note: when we send a response message to a content script it may not receive it when it's not in the active chrome tab 
		// According to official documentation this shouldn't happen, but testing showed that it happens sometimes (Chrome bug?)
		// Therefore we remember unconfirmed response messages and re-send them when the active tab changes.
		session.activeTabListener = function(activeInfo) {
			session.unconfirmedResponses.forEach(function(element) {
				if (log.doLog(LOG_FINE)) {
					log.fine("Sending unconfirmed response: " + JSON.stringify(element) + "activeInfo: " + JSON.stringify(activeInfo));
				}
				port.postMessage(element);
			});
		}
		session.clientConnectionListener = function() {
			port.postMessage( {type: MSG_StatusUpdate, clientConnected: dtclient.connected, connectionError: dtclient.error });
		};
		
		chrome.tabs.onActivated.addListener(session.activeTabListener);
		
		dtclient.addConnectionListener(session.clientConnectionListener);
		session.clientConnectionListener();
		
		var messageHandler = createMessageHandler(session);
		
		port.onMessage.addListener(messageHandler);
		port.onDisconnect.addListener(function() {
			log.fine("Disconnected from " + port.sender.url);
			port.onMessage.removeListener(messageHandler);
			chrome.tabs.onActivated.removeListener(session.activeTabListener);
			dtclient.removeConnectionListener(session.clientConnectionListener);
		});
	});

}
namespace_bg();


