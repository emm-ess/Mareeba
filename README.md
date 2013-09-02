#Mareeba#

Mareeba is a framework for browserbased peer-to-peer networks developed by and for [Petrogale](http://www.petrogale.org). Per default it creates a distributed hash table using a hybrid p2p-network structure. The use of WebRTC’s peer-to-peer-connections makes the hybrid network design necessary, but just for connecting to the network.

Like "per default" suggests other networks are possible. One fundamental design goal of Mareeba is to be highly felexible, making it easy to change different modules and adding stuff. Already in those very early days you could:

* change the routing-table and routing
* add own services and corresponding messages
* send/receive text-based document

Mareeba (or better just parts of it) can make building server/client-applications easier by using Mareeba's connections. In that way you can use WebSocket based connections if available and AJAX as a fallback.

##More Information##
More information can be found on http://mareeba.petrogale.org (like an [API-description](http://mareeba.petrogale.org/api/) and a [Wiki](http://mareeba.petrogale.org/wiki/)), 
the code is on [github](https://github.com/madenet/Mareeba)

##external Resources##

Mareeba uses the following libraries:

* JavaScript BigInteger library version 0.9 [http://silentmatt.com/biginteger/]
* CryptoJS v3.1.2 [http://code.google.com/p/crypto-js]