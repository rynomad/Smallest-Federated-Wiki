CCNx Federated Wiki
===================

This is a rough port of the frontend editor from Ward Cunninghams Smallest Federated Wiki (http://github.com/WardCunningham/Smallest-Federated-Wiki) modified to use PARC's Content Centric Networking (http://www.ccnx.org) as a transport medium for pages via UCLA's NDN-js (http://github.com/named-data/ndn-js). Pages are stored locally in the clients IndexedDB using IDB-Wrapper(http://github.com/jenarps/idb-wrapper) and synced on page update action.

Installation on Debian Based
============================

Prerequisites:

*Install CCNx via UbCCN.sh in /server/express/bin (must run make, and make install seperatelly)
*Install Node.js to run the server (http://nodejs.org)

Installation:

*run npm install in server/express
*run 'npm install node-getopt ws'

for Developers:

*Grunt is used to automate coffeescript compilation of client: "npm install -g grunt-cli" + "grunt watch" in client directory
*"npm install" in the client directory

Running the Server:

*in bash: 'ccndstart'
*in server/express: node ./bin/server.js

Optional flags: -p (port) default 3000
