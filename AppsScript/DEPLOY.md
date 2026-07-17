# Deploying the Job Tracker bridge

One-time setup in your Google account. Takes about 5 minutes.

1. **Create the Sheet.** Go to sheets.google.com → Blank spreadsheet. Name it
   anything (e.g. "Job Tracker"). You don't need to add headers — the script
   creates a `Tracker` tab with headers automatically on first use.

2. **Open the script editor.** In the Sheet: Extensions → Apps Script.

3. **Paste the code.** Delete the placeholder `Code.gs` content and paste in
   the contents of `Code.gs` from this folder.

4. **Set your secret.** Replace `REPLACE_WITH_YOUR_OWN_SECRET` at the top with
   a random string only you know (e.g. a password-generator string — doesn't
   need to be memorable, just unguessable). Save the project (Ctrl/Cmd+S).

5. **Deploy as a Web App.**
   - Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → **Web app**.
   - Description: anything (e.g. "job tracker bridge").
   - **Execute as: Me**.
   - **Who has access: Anyone**.
   - Click **Deploy**.
   - Google will prompt you to authorize the script (it's your own script
     acting on your own Sheet) — click through **Authorize access → your
     account → Advanced → Go to (project name) → Allow**.
   - Copy the **Web app URL** it gives you (ends in `/exec`). That's the
     `APPS_SCRIPT_URL`.

6. **Send me two things:**
   - The Web app URL from step 5
   - The secret you chose in step 4

   I'll wire both into the dashboard config and the scheduled task, then
   deploy the dashboard.

Notes:
- If you ever edit `Code.gs` again, you must create a **new deployment**
  (or use "Manage deployments" → edit → new version) for changes to take
  effect at the same URL.
- The token is a shared secret, not real auth — anyone with the URL *and*
  the token can read/write the sheet. Fine for a personal tool with
  low-sensitivity data (job listings), just don't post the URL/token
  publicly.
