//
// devjira.js - Content script for dev JIRA tickets
// Used JIRA issue number as key. No additional labels
//
var key = $(".issue-link:first").text();
injectImportLinks(key);