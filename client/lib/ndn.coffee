# Wrapper functions and closures for ndn-js
module.exports = ndn = {}

# Define an NDN URI from the current host, ignoring 'www' and port number
hostPrefix = '/'
hostComponents = location.host.split(':')[0].split('.')
for component in hostComponents
  if component != 'www'
    hostPrefix = "/#{component}" + hostPrefix

# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping
ndn.pageToContentObject = (json) ->
  uri = hostPrefix + 'page/' + wiki.asSlug(json.title) + '.json/' # include json for easy MIME interpretation
  name = new Name(uri)
  content = {}
  content.object= new ContentObject(name, new SignedInfo(), json, new Signature())
  content.uri = uri
  return content
