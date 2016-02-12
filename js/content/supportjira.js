//
// content/supportjira.js - Content script for support JIRA tickets
// Uses JIRA issue number as key and adds also:
// - Account name (if available)
// - Dynatrace product version
//
var version = $("#customfield_12702-val:first").text().trim();
var key = $(".issue-link:first").text();
var accountElement = $("#customfield_12307-val");

var labels = [];

// Account attribute may not be visible / not available for older tickets
if (accountElement !== undefined) {
	var account = accountElement.text().trim();
	if (account.length > 0) {
		labels.push("Account: " + accountElement.text().trim());
	}
}

injectImportLinks(key, labels, version);