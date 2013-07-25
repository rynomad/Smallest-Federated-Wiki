# Wrapper functions and closures for ndn-js
repo = require './repository.coffee'

module.exports = ndn = {}

#handler function gets the registered prefix of the incoming message recieved, and the upcallInfo of the closure
handler = (prefix, upcallInfo) ->
  #logic goes here 
  console.log prefix.components.length
  contentStore = DataUtils.toString(upcallInfo.interest.name.components[prefix.components.length])
  if contentStore == 'page'
    slug = DataUtils.toString(upcallInfo.interest.name.components[prefix.components.length + 1])
    console.log repo
    repo.getPage(slug, (pageCO) ->
      signed = new SignedInfo()
      console.log pageCO
      co = new ContentObject(upcallInfo.interest.name, signed, JSON.stringify(pageCO), new Signature())
      co.sign()
      upcallInfo.contentObject = co
      console.log upcallInfo
      console.log 'found page'
      console.log Closure
      interfaces[0].transport.send(encodeToBinaryContentObject(upcallInfo.contentObject))
    )

interfaces = []
hosturl = location.host.split(':')[0]
face = new NDN({host: hosturl})
hostPrefix = '/'
hostComponents = hosturl.split('.')
for component in hostComponents
  if component != 'www'
    hostPrefix = "/#{component}" + hostPrefix
prefix = new Name(hostPrefix)
face.registerPrefix(prefix, new interfaceClosure(face, prefix, handler))
interfaces.push(face)


# Define an NDN URI from the current host, ignoring 'www' and port number
ndn.hostPrefix = '/'
hostloc = location.host.split(':')[0]
hostComponents = hostloc.split('.')
for component in hostComponents
  if component != 'www'
    ndn.hostPrefix = "/#{component}" + ndn.hostPrefix

# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping
testndn = new NDN({host: 'localhost'})
testname = new Name('/localhost/page/welcome-visitors.json/')
testinterest = new Interest(testname)
getClosure = new ContentClosure(testndn, testname, testinterest, (data) ->
  console.log data
)
testndn.expressInterest(testname, getClosure)

