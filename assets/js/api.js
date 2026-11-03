/* api.js — THE ONLY file that talks to the backend (staff routes). Pages never call fetch() themselves.
   Wire contract: POST API_BASE_URL, Content-Type text/plain (no CORS preflight),
   body { operation, apiKey, token?, ...params }, reply { success, data } | { success:false, error:{code,message} }.
   AUTH_003 / AUTH_004 = session over -> login page. AUTH_002 = account not active. */
(function () {
  var CFG = window.APS_CONFIG;
  var RETRYABLE = { "health": 1, "staff/me": 1, "staff/summary": 1, "staff/listStudents": 1, "staff/listTeachers": 1, "staff/listIssues": 1, "staff/listFeedback": 1, "staff/issueOptions": 1 };   // harmless reads only

  function notConfigured() {
    return !CFG || !CFG.API_BASE_URL || !CFG.API_KEY || CFG.API_BASE_URL.indexOf("PASTE_") === 0 || CFG.API_KEY.indexOf("PASTE_") === 0;
  }

  function call(operation, params, attempt) {
    attempt = attempt || 1;
    if (notConfigured()) return Promise.reject(new Error("This site is not set up yet (config.js still has a PASTE_ placeholder)."));
    var body = { operation: operation, apiKey: CFG.API_KEY };
    Object.keys(params || {}).forEach(function (k) { body[k] = params[k]; });

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CFG.REQUEST_TIMEOUT_MS) : null;
    function done() { if (timer) clearTimeout(timer); }

    return fetch(CFG.API_BASE_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) { return res.text(); }).then(function (text) {
      done();
      var payload = null;
      try { payload = JSON.parse(text); } catch (e) { payload = null; }
      if (payload === null) {
        if (RETRYABLE[operation] && attempt < 3) {
          return new Promise(function (resolve) { setTimeout(function () { resolve(call(operation, params, attempt + 1)); }, 700 * attempt); });
        }
        throw new Error("The server is waking up. Please try again in a few seconds.");
      }
      if (payload.success) return payload.data || {};
      var err = new Error((payload.error && payload.error.message) || "Something went wrong.");
      err.code = payload.error && payload.error.code;
      throw err;
    }, function (e) {
      done();
      if (e && e.name === "AbortError") throw new Error("The server is taking too long. Please try again.");
      throw new Error("Cannot reach the server. Check your internet and try again.");
    });
  }

  function isSessionOver(err) { return err && (err.code === "AUTH_003" || err.code === "AUTH_004"); }
  function isInactive(err) { return err && err.code === "AUTH_002"; }

  function authed(operation, params) {
    var p = params || {};
    p.token = window.Storage.getToken();
    return call(operation, p).catch(function (err) {
      if (isSessionOver(err) || isInactive(err)) {
        window.Storage.clearSession();
        window.location.replace("login.html?" + (isInactive(err) ? "inactive=1" : "expired=1"));
      }
      throw err;
    });
  }

  window.Api = {
    call: call, authed: authed,
    health: function () { return call("health"); },
    staff: {
      requestOtp: function (email) { return call("staff/requestOtp", { email: email }); },
      setPin: function (email, code, pin) { return call("staff/setPin", { email: email, code: code, pin: pin }); },
      login: function (email, pin) { return call("staff/login", { email: email, pin: pin }); },
      adminLogin: function (email, password) { return call("staff/adminLogin", { email: email, password: password }); },
      logout: function () { return authed("staff/logout"); },
      me: function () { return authed("staff/me"); },
      summary: function () { return authed("staff/summary"); },
      listStudents: function (filters) { return authed("staff/listStudents", filters || {}); },
      approveStudent: function (studentId) { return authed("staff/approveStudent", { studentId: studentId }); },
      approveAllPending: function (classLevel) { return authed("staff/approveAllPending", classLevel ? { classLevel: classLevel } : {}); },
      setStudentStatus: function (studentId, status) { return authed("staff/setStudentStatus", { studentId: studentId, status: status }); },
      resendApproval: function (studentId) { return authed("staff/resendApproval", { studentId: studentId }); },
      updateStudent: function (studentId, fields) { var p = { studentId: studentId }; Object.keys(fields).forEach(function (k) { p[k] = fields[k]; }); return authed("staff/updateStudent", p); },
      resetStudentPin: function (studentId) { return authed("staff/resetStudentPin", { studentId: studentId }); },
      listTeachers: function () { return authed("staff/listTeachers"); },
      createTeacher: function (fullName, email, assignments) { return authed("staff/createTeacher", { fullName: fullName, email: email, assignments: assignments }); },
      updateTeacher: function (teacherId, fields) { var p = { teacherId: teacherId }; Object.keys(fields).forEach(function (k) { p[k] = fields[k]; }); return authed("staff/updateTeacher", p); },
      issueOptions: function () { return authed("staff/issueOptions"); },
      listIssues: function (studentId) { return authed("staff/listIssues", studentId ? { studentId: studentId } : {}); },
      addIssue: function (fields) { return authed("staff/addIssue", fields); },
      addAction: function (fields) { return authed("staff/addAction", fields); },
      setIssueStatus: function (issueId, status) { return authed("staff/setIssueStatus", { issueId: issueId, status: status }); },
      updateIssue: function (issueId, fields) { var p = { issueId: issueId }; Object.keys(fields).forEach(function (k) { p[k] = fields[k]; }); return authed("staff/updateIssue", p); },
      voidIssue: function (issueId) { return authed("staff/voidIssue", { issueId: issueId }); },
      listFeedback: function (status) { return authed("staff/listFeedback", status ? { status: status } : {}); },
      reviewFeedback: function (feedbackId, decision) { return authed("staff/reviewFeedback", { feedbackId: feedbackId, decision: decision }); }
    }
  };
})();
