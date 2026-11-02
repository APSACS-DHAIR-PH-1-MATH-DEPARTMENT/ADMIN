/* config.js — the ONLY file you edit after deploying the backend.
   API_BASE_URL is already filled. Put the STAFF key in API_KEY below
   (Apps Script > Project Settings > Script Properties > STAFF_API_KEY, it starts with apsf_).
   It is NOT the student key (apsk_). The key is not a secret (anyone can see it in the browser);
   the real protection is the staff login. */
window.APS_CONFIG = {
  APP_NAME: "Staff Portal",
  DEPARTMENT: "APSACS DHA-I R Phase 1 Mathematics Department",

  // Apps Script web app URL — it ends with /exec  (NOT /dev)
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbwzWi1Sif7TvHR-0xmCjmdrP2xJZ_aWCcJrQvLqQQbdo9qYS-Esdq3abHxRy8wuARt9qw/exec",

  API_KEY: "apsf_4549616ec964469a9155b3cbe198e364bdf2d14d",

  REQUEST_TIMEOUT_MS: 25000   // Apps Script can take 6-8 s to wake up
};
