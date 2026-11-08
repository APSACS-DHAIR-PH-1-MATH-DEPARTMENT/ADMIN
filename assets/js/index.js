/* index.js — send the visitor to the right page. */
(function () { location.replace(Storage.getToken() ? "dashboard.html" : Storage.loginPage()); })();
