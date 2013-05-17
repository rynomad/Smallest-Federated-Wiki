nei.ghbor.net
=============

This is a basic wiki application which allows users to edit articles.
However, instead of persisting saved changes in a traditional database,
these changes are stored inside the user's browser, using IndexedDB.  Each
user has their own version of the page and users can choose to pull in content
from other users' versions.  The changes occur in real time, via websockets.

Our application is a modified version of [https://github.com/WardCunningham/Smallest-Federated-Wiki](Smallest-Federated-Wiki).

Setting up the CCNX Content Routing Service
=============

CCNX is pretty cool.  Here's the official installation documentation:

> https://www.ccnx.org/wiki/CCNx/InstallingCCNx
