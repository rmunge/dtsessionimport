//
// Communication with a Dynatrace server 
// (Not used at the moment, base for potential future extension)
//

var user = 'admin';
var password = 'admin';

$.ajaxSetup({
  headers: {
    'Authorization': "Basic " + btoa(user + ":" + password)
  }
});

function loadSessions(protocol, host, port, callback) {
var sessions = [];
$.ajax
({
  type: "GET",
  url: protocol + "://" + host + ":" + port + "/rest/management/storedsessions",
  dataType: 'xml',
  async: true,
  success: function (data){
	 var references = $(data).find("sessionreference");
	 console.log(references.length + " sessions found on " + host);
     references.each(function (index) {
		 var session = {};
		 session.id = $(this).attr("id");
         session.url = $(this).attr("href");
		 loadSessionLabels(session.url, session.id, function(sessionId, labels) {
			 session.labels = labels;
			 sessions.push(session);
			 
	    if (index === references.length - 1) {
           callback(sessions);
         }
		 });
    });
  }
});
}

loadSessions("https", "localhost", 8021, function(sessions) {
	console.log(JSON.stringify(sessions));
});


function loadSessionLabels(sessionUrl, sessionId, callback) {
$.ajax
({
  type: "GET",
  url: sessionUrl,
  dataType: 'xml',
  async: true,
  success: function (data){
	 
	 var labels = [];
		 
     $(data).find("label").each(function () {
		 labels.push($(this).text());
    });
    callback(sessionId, labels);
  }

});
}
