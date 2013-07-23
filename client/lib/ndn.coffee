# Wrapper functions and closures for ndn-js
repository = require './repository.coffee'

module.exports = ndn = {}

interfaces = []

ndn.newInterface = (hosturl) ->

  face = new NDN({host: hosturl})
  hostPrefix = '/'
  hostComponents = hosturl.split('.')
  for component in hostComponents
    if component != 'www'
      hostPrefix = "/#{component}" + hostPrefix
  prefix = new Name(hostPrefix)
  face.registerPrefix(prefix, new interfaceClosure(face, (upcallInfo) ->
    console.log prefix
  ))
  interfaces.push(face)

# Define an NDN URI from the current host, ignoring 'www' and port number
ndn.hostPrefix = '/'
hostloc = location.host.split(':')[0]
hostComponents = hostloc.split('.')
for component in hostComponents
  if component != 'www'
    ndn.hostPrefix = "/#{component}" + ndn.hostPrefix

ndn.newInterface('localhost')


# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping
ndn.pageToContentObject = (json) ->
  uri = ndn.hostPrefix + 'page/' + wiki.asSlug(json.title) + '.json/' # include json for easy MIME interpretation
  name = new Name(uri)
  signed = new SignedInfo()
  content = {}
  content.object= new ContentObject(name, signed, json, new Signature())
  content.uri = uri
  return content


testndn = new NDN({host: 'localhost'})
testname = new Name('/localhost/page/welcome-visitors.json/')
testinterest = new Interest(testname)
getClosure = new ContentClosure(testndn, testname, testinterest, (data) ->
  console.log data
)
testndn.expressInterest(testname, getClosure)
