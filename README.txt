FIR SECTION SUGGESTION SYSTEM - CITIZEN AND POLICE PORTAL

ABOUT THIS PROJECT
==================
FIR stands for First Information Report. This project is an academic incident
reporting and review portal inspired by an FIR workflow. Citizens can record
incidents in their own accounts, and authorized police administrators can
review those records from a shared police dashboard.

The system suggests preliminary review topics using simple keyword and
category rules. It does NOT officially register an FIR, establish an offence,
determine guilt, or replace police investigation or professional legal review.
Use fictional test data, not real confidential reports or emergency requests.
For an actual emergency, contact the appropriate local emergency service.

CONTENTS
========
1. Purpose and usefulness
2. Roles and privacy
3. Requirements and startup
4. Citizen guide
5. Police administrator guide
6. Case status, saving and archiving
7. How suggestions work
8. Example demonstration
9. Access rules
10. Security and storage
11. Configuration
12. Troubleshooting
13. Project files and architecture
14. API overview
15. Verification
16. Operations and data preservation
17. Important limitations

1. PURPOSE AND USEFULNESS
========================
- Citizens have one place to save their incident details and read the police
	review of their own reports, instead of maintaining separate loose notes.
- Police administrators can review all active reports, identify the reporting
	account, add notes, and communicate a case status through the portal.
- Structured fields help capture incident dates, locations, categories,
	descriptions, and reported weapon, threat, injury or property information.
- Search and category filtering help locate saved reports.
- Rule-based prompts provide a starting checklist for manual review. They
	may help identify topics worth examining, but cannot assess legal validity.
- Account isolation demonstrates why sensitive records need server-enforced
	permissions rather than merely hiding buttons in the browser.
- The project is useful for academic demonstrations of authentication,
	authorization, CRUD operations, persistent storage and review workflows.

2. ROLES AND PRIVACY
===================
CITIZEN
An ordinary user registers through Create account. The user can see only
their own active cases and the police reviews attached to those cases.
Registering does not grant access to other citizens' reports.

POLICE ADMINISTRATOR
A trusted server operator creates this account using npm run create-admin.
The account can view all active cases, including reports created by police
accounts, and can save review notes and case status changes.
The internal role name is admin; the interface calls it Police administrator.

SERVER OPERATOR
The trusted person who installs and runs the application, provisions police
accounts, protects the database, and manages deployment and backups. This is
an operational responsibility, not a third selectable role in the application.

There is no public case directory. Visitors who are not signed in cannot
access case data. All police administrators currently have access to all
active reports; there is no station, district or assigned-officer restriction.
Police access is granted by operator provisioning, not by an email domain or
by choosing a role on the registration page.

3. REQUIREMENTS AND STARTUP
==========================
1. Install Node.js 24.5 or newer. No external packages are required.
2. In this directory, run: npm run create-admin
3. Enter the authorized police administrator's name, email and password in
	 your terminal. Password entry is hidden; use 12-128 characters.
	 The command never promotes an existing citizen account. Each police
	 officer should have their own provisioned account, not a shared password.
4. Run: npm start
5. Open http://localhost:3000 (not the HTML file or a Live Server URL).
6. Citizens use Create account. Police use the same Login form with their
	 provisioned account. There are no default administrator credentials.

Only a trusted server operator should have shell access and be allowed to
run create-admin. Verify police identity before issuing access. Do not share
database files, passwords, or server access with ordinary users.

DETAILED FIRST-TIME SETUP
Open this project folder in VS Code, then choose Terminal > New Terminal.
Run these commands from the folder containing package.json:

  node --version
  npm --version
  npm run create-admin

The first two commands confirm that Node.js and npm are installed. The last
command starts an interactive prompt; it does not start the website.

At "Police administrator name:", type the person's name and press Enter.
At the email prompt, enter the login email and press Enter.
At the password prompt, enter 12-128 characters and press Enter. No characters
or asterisks appear while typing. Enter the same password again to confirm.
Do not paste passwords into source files, chat messages or shell commands.

Only after "Police administrator created: ..." appears is creation confirmed.
An exit back to the terminal without that message is not enough to confirm it.
There is no built-in administrator email or password, and test credentials
used during development are not accounts in your application database.

Next, start the website:

  npm start

Keep that terminal running. Open http://localhost:3000 in your browser.
If the server is already running, use its displayed URL rather than starting
a second copy on the same port. Use a separate terminal for create-admin.
To stop a server you started, press Ctrl+C in its terminal. Run npm start
again to restart it; saved database records remain available.

This project has no external npm dependencies or frontend build step, so
npm install is not required for the current version. It is not a static-only
site: opening index.html directly or using VS Code Live Server will not run
the authentication API. Node may display an experimental SQLite warning;
see Troubleshooting below.

4. CITIZEN GUIDE
===============
CREATE AN ACCOUNT
1. Open the portal and choose Create account.
2. Enter your full name and email address.
3. Choose a password of 12-128 characters and confirm it.
4. Accept the academic-demo acknowledgement and submit the form.
5. Wait for "Citizen account created. You can now log in."
6. Select Login and enter the same email and password.

Registration creates a citizen account only. Email addresses are normalized
to lowercase; an email already registered in this database cannot be reused
for a second account. Email ownership is not verified in this version.

SAVE A NEW INCIDENT
After login, the page heading is "My incident records".
1. Complete Incident details:
	- Case reference: optional, up to 100 characters. It is a user-entered
	  label, not an official FIR number and not a unique database identifier.
	- Incident date: required, valid and not in the future. The server uses
	  the current UTC date for the future-date check.
	- Incident location: required, 2-300 characters.
	- Incident category: choose one of the listed categories.
	- Weapon reported / Threats reported: Yes, No or Unknown.
	- Incident description: required, 10-10,000 characters. Describe facts
	  rather than assumptions or conclusions.
	- Injury / property details: optional, up to 2,000 characters.
2. Select Analyze incident to see the summary and preliminary prompts.
3. Check the summary, then select Save case.
4. Wait for "Case saved to your account." The saved case appears in
	My saved cases and becomes available to police administrators.

Analyze incident alone does NOT save or submit a record. Unsaved form details
are not automatically backed up and may be lost on refresh, logout or closing
the page. There is no attachment upload in this version.

FIND AND UPDATE YOUR CASE
- Use My saved cases to find your saved reports. Search matches case reference,
  location, description or category; the category filter narrows the list.
- Select Load to retrieve the latest saved record and its police review.
- While the status is Submitted, you can change the incident details.
- After changing details, select Analyze incident again, then Save case.
  This updates the same record; it does not create a duplicate.
- Clear form starts a fresh draft. It does not delete an existing saved case,
  but it does discard unsaved changes currently in the form.
- To create a separate report after loading one, select Clear form first.
- Once police set Under police review or Closed, your report becomes read-only.

READ A POLICE REVIEW
Select Load on your case to see its latest status, selected review prompts,
and police notes. Citizen accounts cannot edit those notes or change status.
The portal does not send email, SMS or push alerts and does not update the
case list live. Refresh the dashboard or load the case to check for changes.

PRINT AND SIGN OUT
Print report opens the browser print dialog for the displayed report. You can
print it or choose Save as PDF if your browser supports that destination.
An analyzed but unsaved draft can also be printed; printing does not save it
to the server and does not make it an official FIR. Handle printouts and PDFs
carefully because they contain the displayed report information.
Use Log out when finished, especially on a shared device. Remember me extends
the session duration; avoid enabling it on shared computers.

5. POLICE ADMINISTRATOR GUIDE
============================
1. Obtain an individually provisioned account from the trusted operator.
	Do not register through Create account expecting police permissions.
2. Log in through the same Login form used by citizens.
3. Confirm the page says "Police case dashboard" and the signed-in label
	identifies you as a Police administrator.
4. Find a report in All citizen and police cases using search and the category
	filter. The list shows the reporting account's name and email.
5. Select Load. Read the original report and preliminary suggestions.
6. Mark relevant prompts for officer review and add review notes as needed.
	Each note can contain up to 2,000 characters.
7. Select a Police case status and choose Save police review.
8. Wait for "Police review saved." The reporter can see the saved review
	when they next load their report.

Review notes are visible to the reporting citizen. Do not treat these fields
as confidential, police-only investigation notes. A checkbox is a manual
review marker, not confirmation that an offence occurred.

Police cannot edit the saved original incident fields, even for reports they
created themselves. They may create a new report through the incident form;
after its first save, subsequent saves are police reviews, not detail edits.
Police-created reports belong to that police account. There is no workflow
to assign ownership to a citizen or transfer a case to another account.

6. CASE STATUS, SAVING AND ARCHIVING
==================================
UNSAVED DRAFT
Exists in the current page only. Analyze incident generates a preview.
Save case is required to store the report on the server.

SUBMITTED
The default status after saving. The citizen owner may still edit or archive
the report. Submitted means saved in this project, not officially registered
with a police authority. Review notes alone do not lock a case if police leave
its status as Submitted.

UNDER POLICE REVIEW
Set by a police administrator. The citizen can read the report and review,
but cannot edit or archive the report.

CLOSED
Set by a police administrator. The citizen can still read the report and
review, but cannot edit or archive it. This is an application status, not a
legal determination or proof that an official investigation has concluded.

Police may change between all three saved statuses. Setting a citizen report
back to Submitted makes its incident details editable by its owner again.
There is no enforced one-way approval sequence or separate reopening process.

ARCHIVE
Archive removes a report from all active lists after confirmation. Its data
remains in the database with an archive timestamp and audit event. Citizens
can archive only their own Submitted reports; police can archive any active
report. Archived records cannot be loaded through the normal case API.
There is currently no archive browsing or restore button. Archive only after
checking the record; there is no permanent or bulk delete in the interface.

CONCURRENT CHANGES
Every saved record has a version. If another session changes the record before
your save, the server rejects the stale update instead of overwriting it.
Reload the case, check the latest version, and reapply your changes carefully.
Unsaved changes are not automatically merged or retained by reloading.

CASE OVERVIEW COUNTERS
Saved cases counts active records visible to the signed-in account.
Marked for review counts selected review prompts across those saved records,
not the number of cases under review. Unsaved checkbox changes do not change
the saved totals. Police see totals for all active cases; citizens see only
their own totals.

7. HOW SUGGESTIONS WORK
======================
The rules run in dashboard.js in the browser. This is a deterministic rule
system, not a trained AI model, a legal search service or an official database.

The analyzer normalizes the description to lowercase, replaces punctuation
with spaces, and looks for configured words or phrases with space boundaries.
A rule can match either the selected category or a configured phrase.

Categories include theft, assault, cheating, robbery, threats, trespassing,
property damage, and Other / uncertain. Selecting Other does not by itself
create a specific offence prompt. Reporting a weapon creates a contextual
review prompt. Reporting threats can add a threat prompt even without a
matching phrase in the description.

Each result contains a topic, the reason it appeared, matched terms or context,
and a reminder to verify legal provisions. The system does not supply verified
IPC/BNS section numbers, legal citations, evidence assessments or confidence
scores. Saved review markers and notes are stored; suggestions are generated
again from the incident details when the case is loaded.

Rules can miss synonyms, spelling errors or non-English descriptions. They do
not understand negation, intent, credibility or legal context. For example,
"no weapon was used" is not interpreted semantically by the keyword engine;
the separate Weapon reported field supplies that contextual flag.
No matching rule does not mean that no offence occurred. A match does not
mean an offence is established. A qualified human must review the facts and
current official legal sources before taking any real action.

8. EXAMPLE DEMONSTRATION
========================
Use fictional names, non-sensitive passwords and a date in the past.
1. Provision one police administrator using the terminal command.
2. Register Citizen A through the website and log in.
3. Enter reference DEMO-001, a past date, location "Test market", category
	Theft, and description "My mobile phone was stolen near the test market."
	Set weapon and threats to No.
4. Analyze the incident, inspect the prompts, and save the case.
5. Log out. Register and log in as Citizen B with a different email.
	Citizen B should see zero cases until they save their own report.
6. Log out and sign in as the provisioned police administrator.
	DEMO-001 should be visible with Citizen A's name and email.
7. Load it, mark a prompt, enter "Demo report reviewed", set Under police
	review, and select Save police review.
8. Log back in as Citizen A and load DEMO-001. Confirm the note and status
	are visible and the original incident fields are no longer editable.

For simultaneous role testing, use separate browser profiles or a private
window. Ordinary tabs in the same browser profile share a login cookie;
signing in as another account changes the session for that profile.
Demo accounts created this way are real records in your local project database;
they are not automatically removed. npm test instead uses an isolated database.

9. ACCESS RULES
===============
- Public registration always creates a citizen account, never a police role.
- Citizens can list, load and print only their own cases and police reviews.
- Citizens can update or archive their own submitted cases. Once a case is
	under police review or closed, citizens cannot alter or archive it.
- Police administrators can view all active cases with reporter identity,
	mark review prompts, save review notes, update status and archive cases.
- Police cannot rewrite a citizen's original incident details. They can also
	create their own reports, which become read-only after saving.
- Review notes are visible to the reporting citizen, not private police notes.
- Loading and saving a case updates the same record instead of duplicating it.
- Archiving hides a case from active lists, retaining the record and an audit
	event on the server. There is no permanent or bulk delete in the interface.
- Concurrent edits use a version check; reload a conflicting record before saving.

10. SECURITY AND STORAGE
========================
- server.js enforces authorization for every case endpoint. UI visibility is
	not used as a security boundary. Client-provided ownership is ignored.
- Passwords use salted scrypt hashes. Random session tokens are stored as
	hashes server-side and issued in HttpOnly, SameSite=Strict cookies.
- Sessions expire after 8 hours, or 7 days with Remember me. Logout revokes
	the current session. Account changes refresh other open portal tabs.
- API writes require same-origin requests and JSON. Responses are not cached.
	The server restricts static files and applies a Content Security Policy.
- Login and signup are limited to 30 attempts per IP per 15 minutes. This
	development limiter is in memory and resets on restart.
- Input lengths, required fields, dates and categories are validated server-side.
- SQLite persists accounts, cases, sessions and basic audit events in
	data/fir.sqlite. Back up the database securely. It is not served as a URL.
- The SQLite database is permission-restricted but NOT encrypted at rest.
- Old localStorage demo accounts and cases are ignored, not deleted or imported.
	Their roles and ownership cannot be trusted. Register fresh accounts.
	Old plaintext browser data remains until its owner removes it in browser settings.

11. CONFIGURATION
=================
- PORT: defaults to 3000. Example: PORT=3001 npm start
- HOST: defaults to 127.0.0.1; development binds to this machine only.
- APP_ORIGIN: exact browser origin; defaults to http://localhost:<PORT>.
	HTTPS origins enable Secure cookies. Use HTTPS for any non-local deployment.
	A reverse proxy must preserve the configured Host header and use appropriate
	request-size limits and a shared rate limiter; forwarded IPs are not trusted.
- FIR_DB_PATH: custom SQLite file path. Use the same setting when provisioning
	police accounts and starting the server.

Set environment variables in the shell before the relevant command. There
is no automatic .env file loader in the current npm start command.
Examples for macOS/Linux terminals:

	PORT=3001 npm start

Then open http://localhost:3001. Port numbers are part of the browser origin.
Use the same browser URL consistently, including localhost versus 127.0.0.1.

For an existing database in a custom location, specify the same path for both
account provisioning and the server, for example:

	FIR_DB_PATH=/absolute/path/to/fir.sqlite npm run create-admin
	FIR_DB_PATH=/absolute/path/to/fir.sqlite npm start

Changing the database path does not migrate records. A new path creates a new,
empty database, which can make existing accounts appear to be missing.
Setting APP_ORIGIN to an HTTPS URL does not create a TLS server or certificate;
HTTPS termination must be configured separately, usually through a reverse
proxy. Do not expose the development server publicly without security review.

12. TROUBLESHOOTING
===================
"ExperimentalWarning: SQLite is an experimental feature"
This is a Node.js warning, not a failed account creation. It can appear after
"Police administrator name:" and visually interrupt the prompt. Type the name
and press Enter, then continue with the email and password prompts. Do not
mistake the warning for a request to enter another command.

"Nothing appears when I type the password"
Hidden password entry is intentional. Type the password and press Enter,
then type it again at the confirmation prompt. Never share it in chat.

"Email or password incorrect"
Use the credentials of an account created in the currently configured server
database. Old frontend-demo accounts do not automatically work here. Citizens
must register; police must complete create-admin and see its success message.
Check for typing mistakes and confirm that the server and create-admin use
the same FIR_DB_PATH. No password reset command or self-service recovery flow
exists yet. Contact the trusted operator; do not edit password hashes manually.
The error deliberately does not reveal whether a particular email exists.

"An account with this email already exists"
Use that account's login or a different email for a separate account. The
create-admin command does not convert an existing citizen into a police admin.
There is no role-promotion screen in this version.

"Cannot reach the server" or the site will not open
Run npm start from the project folder and leave the server terminal open.
Use the URL printed by that server, normally http://localhost:3000. Do not use
file://, a Live Server port, or a temporary browser-test address. Old development
test servers may have been stopped and their in-memory accounts do not persist.

"EADDRINUSE"
The requested port is already in use. Use the existing portal if it is yours,
or start on another port with PORT=3001 npm start. Do not stop unrelated services.

"Unrecognized host" or "Cross-origin requests are not allowed"
The browser URL must match APP_ORIGIN, including scheme, hostname and port.
The default URL uses localhost, not 127.0.0.1. Keep pages and API on the same
origin; do not disable the security checks to make a different URL work.

"Too many authentication attempts"
Login and registration share an IP-based limit. Wait for the 15-minute window
to expire before trying again. Repeated guessing is not a recovery mechanism.

"Your session has expired" or an unexpected return to Login
Log in again. Sessions last 8 hours, or 7 days with Remember me. A logout or
account change in another tab can also invalidate the current view. Do not
use browser storage edits to attempt to restore or elevate a session.

"This case changed. Reload it before saving."
Another session saved a newer version. Load the case again, compare the latest
details, then reapply your changes. Reloading discards your unsaved page edits.

"Save case is disabled" or "I cannot edit the report"
After editing a draft, analyze it again before saving. A citizen's saved case
is read-only when its status is Under police review or Closed. Police edit
review fields, not saved original incident details.

"No matching saved cases" or a record appears missing
Check the signed-in account, clear the search, select All categories, and
refresh. Confirm that you selected Save case, not only Analyze incident.
Archived cases are intentionally absent from active lists. A different
FIR_DB_PATH can also point to a different database. Do not delete any database
to troubleshoot missing records.

"My previous browser-demo data is missing"
The older version stored accounts, plaintext passwords and a shared case list
in localStorage. The current version ignores those keys; it does not delete
or automatically import them. Data may still exist in the original browser
profile at the original file/site address, unless someone cleared it.
Changing browser, profile, hostname or port can expose different storage.
Do not clear browser data while attempting recovery. There is no automated
migration tool. A trusted operator must plan a backup and ownership review
before any import: the old shared records have no trustworthy account owner.
Simply registering with the same email does not restore those old cases.

13. PROJECT FILES AND ARCHITECTURE
================================
- package.json: Node version requirement and start, create-admin, test commands.
- index.html: shared login and citizen registration page.
- auth.css: login and registration styling.
- auth.js: authentication forms and calls to the server API.
- api.js: shared fetch helper, session-change handling and account identity header.
- dashboard.html: incident form, summary, review controls and saved-case list.
- dashboard.css: dashboard, mobile and print styling.
- dashboard.js: incident rules, role-aware UI, search, loading, saving and review.
- server.js: HTTP server, static file allowlist, validation, authentication,
	authorization, SQLite persistence, session management and basic audit events.
- create-admin.js: trusted local command for provisioning police accounts.
- tests/access.test.js: automated API access-control regression test.
- data/fir.sqlite: default runtime database, created when the store is opened.
- .gitignore: excludes runtime database files, data/, .env and node_modules/.
- README.txt: setup, usage, security and operating instructions.

REQUEST FLOW
Browser form -> same-origin /api request -> server session and permission
checks -> SQLite query or update -> JSON response -> updated browser view.
The browser never receives other citizens' reports for client-side filtering.
Server-side checks select which records it can receive in the first place.

DATABASE TABLES
users stores account identity, role, password salt and password hash.
sessions stores hashed session tokens, linked account IDs and expiration times.
cases stores owner IDs, report data, review data, status, version and timestamps.
audit stores basic actor/action/case/time events for registration, login and
case mutations. It is not a full version history or a record of every read.

Case references entered by users are labels; the server assigns a UUID as the
actual record ID. Timestamps and ownership come from the server. Database
constraints and parameterized queries support integrity and avoid constructing
SQL from user text. Authorization is still explicitly checked for each case.

14. API OVERVIEW
================
This section is for developers. Normal users should use the website.
Responses are JSON. Mutation requests use application/json and must have the
configured Origin. Protected endpoints require a valid fir_session cookie.

POST   /api/register          Create a citizen; name, email, password.
POST   /api/login             Sign in; email, password, optional remember.
GET    /api/me                Return the signed-in account's public identity.
POST   /api/logout            Revoke the current session; send an empty object.
GET    /api/cases             List active cases permitted for the current role.
POST   /api/cases             Create a report owned by the signed-in account.
GET    /api/cases/:id         Load a permitted active report and its review.
PUT    /api/cases/:id         Update own Submitted report as a citizen.
PATCH  /api/cases/:id/review  Save review entries and status as police admin.
DELETE /api/cases/:id         Archive a permitted report; not a hard delete.

PUT, PATCH and DELETE require the current numeric version in the JSON body.
Review requests also include status and a review array. Status values are
submitted, under_review and closed. Review entries contain id, selected and
note. The current limit is 20 review entries per request. Report creation and
update use the incident fields described in the citizen guide.

The frontend sends X-FIR-User for protected requests to detect a stale page
after an account switch. This header is not authentication and cannot grant
permissions. Cookies and server-side authorization remain authoritative.
There is no public admin-creation or role-change API.

Typical errors: 400 invalid input, 401 missing/invalid session or bad login,
403 forbidden operation/origin, 404 unavailable or inaccessible case,
409 duplicate account or record conflict, 413 oversized body, 415 non-JSON
mutation payload, 429 too many authentication attempts. Inaccessible case IDs
return 404 so callers cannot use them to enumerate other citizens' records.

15. VERIFICATION
================
Run: npm test
Tests use an isolated database and cover role escalation, ownership spoofing,
cross-account access, police review permissions, stale updates, archiving,
expired sessions, logout, CSRF rejection and private-file protection.

The automated test uses Node's built-in test runner and an in-memory SQLite
database. It does not create police users in your normal application database
or remove your saved reports. Its synthetic credentials are for tests only.
For an end-to-end manual check, follow Example demonstration above.
The current automated suite is API-focused, not a full browser automation or
independent security audit. Browser behavior should also be checked after UI
changes on desktop and mobile, including print output and session changes.

16. OPERATIONS AND DATA PRESERVATION
===================================
- Keep the database on durable, access-controlled storage. Moving source files
	without the database does not move accounts or cases.
- Before upgrades or manual database work, make and verify a backup. Use a
	SQLite-aware backup process for a live database, or stop the application
	and any provisioning commands before making a consistent offline backup.
	Do not blindly copy a changing database and assume the copy is consistent.
- Encrypt and restrict backups; they contain report data and account records.
	Test recovery separately before relying on a backup for real operations.
- Do not publish data/fir.sqlite, .env files or exported case reports. Git ignore
	rules prevent accidental additions in common workflows but are not access
	control and do not protect files already tracked or manually shared.
- Never remove the database or clear browser storage just to fix a login error.
	Check the account, original storage location and configured database first.
- Keep police accounts individual. There is currently no account-disable,
	deletion, promotion or password-recovery interface. Plan these controls
	before allowing any real police or citizen information into the system.
- The default server is accessible from this computer only. Giving another
	person http://localhost:3000 points to their own computer, not yours.
	Multi-device use needs a deliberately configured deployment, HTTPS and a
	reachable hostname, not just sharing the local development URL.
- The UI loads Google Fonts when available. Account and case handling is local
	to the configured server; font requests go to an external font provider.
	Review or self-host those assets before a privacy-sensitive deployment.

17. IMPORTANT LIMITATIONS
=========================
This remains an academic project, not a certified police records system. Use
test data only. The keyword suggestions are manual-review prompts, not legal
determinations, and the app does not officially register an FIR.
Before handling real records, obtain an independent security/legal review and
add police identity verification, MFA, account revocation and secure recovery,
encrypted storage/backups, retention policies, tamper-resistant audit logging,
monitoring and tested operational controls. Self-service password recovery,
archive restoration and email verification are not implemented.

Also not implemented: evidence attachments, official FIR numbers, verified
legal-section lookup, station-based permissions, officer assignment, private
police notes, notifications, real-time updates, pagination for large case lists,
case ownership transfer, complete change history, or an audit-log viewer.
All active visible cases are currently returned together, so this design needs
further work for large deployments.

Password hashing and role checks are important protections, but do not by
themselves make an application production-ready. The current audit table can
be modified by someone with database access; it is not tamper-resistant. The
rate limiter is per process and does not provide distributed abuse protection.
No compliance certification, police integration or legal approval is implied.
