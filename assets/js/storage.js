/* storage.js — staff session. The token lives in sessionStorage ONLY (gone when the tab closes),
   never localStorage: the student site and this site share one github.io address, and a staff
   token must not outlive the tab. Every access is wrapped in try/catch. */
(function () {
  var TOKEN_KEY = "aps-staff:token";
  var PROFILE_KEY = "aps-staff:profile";
  function get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }
  window.Storage = {
    getToken: function () { return get(TOKEN_KEY); },
    setToken: function (t) { set(TOKEN_KEY, t); },
    getProfile: function () { try { return JSON.parse(get(PROFILE_KEY) || "null"); } catch (e) { return null; } },
    setProfile: function (p) { set(PROFILE_KEY, JSON.stringify(p || null)); },
    clearSession: function () { del(TOKEN_KEY); del(PROFILE_KEY); }
  };
})();
