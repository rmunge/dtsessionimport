
//
// content.js - Content script which provides base functionality to incject additional links to loaded HTML pages for links to:
// 1. Dynatrace sessions (file ending .dts)
// 2. Dynatrace support archives
//

var injectImportLinks;

function namespace_content_common() {

	var DATA_ROTATING = "dtsession_rotating";
	var WINDOW_EVENT_IMPORT = "dtsession-import";
	
	// css/content.cs
	var CSS_LINK = "dtsession-link";
	var CSS_LINK_ENABLED = "dtsession-link-enabled";
	var CSS_LINK_DISABLED = "dtsession-link-disabled";
	
	var TITLE_SESSION = "Click to import this Dynatrace session";
	var TITLE_ARCHIVE = "Click to import the self-monitoring session of this Dynatrace support archive";

	var clientConnected = false;
	var connectionError = undefined;
	
	
	function getLinkClass() {
		if (clientConnected) {
			return CSS_LINK_ENABLED;
		}
		return CSS_LINK_DISABLED;
	}
	
	function existingLinks() {
		return $("." + CSS_LINK);
	}
	
	
	var animation = {};
	animation.startRotation = function(id) {
		
		var selector = "#" + id;
		var element = $(selector).first();
		$(element).data(DATA_ROTATING, true);
		
		var rotation = function (){
		  
		  if (!$(selector).first().data(DATA_ROTATING)) {
			  return;
		  }
		  $(selector).rotate({
			 angle: 0,
			 animateTo: 360,
			 callback: rotation
		  });
		}
		rotation();
	};

	animation.stopRotation = function (element) {
		$(element).removeData(DATA_ROTATING);
	};


	var port = chrome.runtime.connect();
	var idCounter = 0;
	
	function handleMessage(msg) {
		if (msg.type === MSG_Import_Response) {
			var selector = "#" + msg.id;
			var elements = $(selector);
			if (elements.length == 1) {
				animation.stopRotation(elements.first());
				port.postMessage({type: MSG_ConfirmResponse, response: msg})
			}
		} else if (msg.type === MSG_StatusUpdate) {
			clientConnected = msg.clientConnected;
			connectionError = msg.connectionError;
			
			if (clientConnected) {
				existingLinks().each(function() {
					$(this).removeClass(CSS_LINK_DISABLED);
					$(this).addClass(CSS_LINK_ENABLED);
					$(this).removeAttr("title");
				});
			} else {
				existingLinks().each(function() {
					$(this).addClass(CSS_LINK_DISABLED);
					$(this).removeClass(CSS_LINK_ENABLED);
					$(this).attr("title", connectionError);
				});
			}
		}
	}

	port.onMessage.addListener(function(msg) {
		handleMessage(msg);
	});


	window.addEventListener("message", function(event) {
	  
	  if (event.source != window) {
		return;
	  }
	  
	  if (!clientConnected) {
		  return;
	  }
	  if (event.data.type && (event.data.type == WINDOW_EVENT_IMPORT)) {
		animation.startRotation(event.data.id);
		port.postMessage({type: MSG_Import_Request, id: event.data.id, referrer: window.location.href, url: event.data.url, version: event.data.version, key: event.data.key, attachment: event.data.attachment, labels: event.data.labels});
	  }
	}, false);


	injectImportLinks = function(key, labels, version) {
		
	  if (labels === undefined) {
		  labels = [];
	  }	
	  
	  if (version !== undefined) {
		  labels.push("Version: " + version);
	  }
		
	  $("a").initialize(handleLink(key, labels));
	};

	function handleLink(key, labels) {
	  return function() {
		var attachment = $(this).text().trim();
	  
		if (attachment == "") {
			return;
		}

		// Ignore expanded zip files where the link may contains subdirecories like Server/../Self-Monitoring.dts ... this would lead to attachment names / import IDs which cannot be handled
		if (attachment.lastIndexOf("/") != -1) {
		  return;
		}
	  
		var link = $(this).attr('href');
	  
		if (link === undefined) {
		  return;
		}

		var isSessionFile = attachment.isSessionFile();
		var isArchiveFile = attachment.isSupportArchiveFile();
	  
		if (isSessionFile || isArchiveFile) {
			
		  var labelsString = "";
		  
		  if (labels === undefined) {
			  labelsString = ", labels: []";
		  } else {
			  var labelsArray = JSON.stringify(labels);
			  labelsString = ", labels: " + labelsArray.replaceAll("\"", "\'"); 
		  }
			
		  idCounter++;
		  
		  // the ID has to be global / unique over all open tabs within Chrome
		  var id = key + idCounter;
		  var cssClass = CSS_LINK + " " + getLinkClass();	
		  
		  var title = "";
		  if (clientConnected === false && connectionError != undefined) {
			  title = " title='" + connectionError + "'";
		  }
			
		  var onClick = "javascript:window.postMessage({ id:'" + id + "', type: '" + WINDOW_EVENT_IMPORT + "', url: '" + link + "', key: '" + key + "', attachment: '" + attachment + "'" + labelsString + "}, '*');";
		  $(this).append("<a href=\"" + onClick + "\"><img id='" + id + "' src='" + chrome.extension.getURL(IMG_IMPORT_SESSION) + "' class='" + cssClass + "'" + title + "/></a>");
		  
		}
	  };
	}
}
namespace_content_common();
