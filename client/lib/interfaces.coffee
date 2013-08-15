# Functions to manage NDN Interfaces, register prefixes, and express interests
repo = require './repository.coffee'

window.interfaces = {}
interfaces.faces = {}
interfaces.list = []
interfaces.active = []

interestHandler = (face, upcallInfo) ->
  #logic goes here 
  console.log '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',face, upcallInfo.interest.name
  contentStore = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length])
  console.log contentStore
  if contentStore == 'page'
    console.log 'getting page'
    slug = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1])
    repo.getPage(slug, (pages) ->
      interest = upcallInfo.interest
      signed = new SignedInfo()
      sent = false
      for page in pages
        if interest.matches_name(new Name(interest.name.to_uri() + '/' + page.version)) == true && sent == false
          console.log page.version, interest.excludes
          co = new ContentObject(new Name(upcallInfo.interest.name.to_uri() + '/' + page.version), signed, JSON.stringify(page), new Signature())
          console.log co
          co.signedInfo.freshnessSeconds = 604800
          co.sign()
          upcallInfo.contentObject = co
          face.transport.send(encodeToBinaryContentObject(upcallInfo.contentObject))
    )

interfaces.registerFace = (url) ->
  face = new NDN({host: url})
  hostPrefix = ''
  hostComponents = url.split('.')
  for component in hostComponents
    if component != 'www' && component != 'http://www' && component != 'http://'
      hostPrefix = "/#{component}" + hostPrefix
  prefix = new Name(hostPrefix)
  face.prefixURI = hostPrefix
  face.prefix = prefix
  interfaces.faces[hostPrefix] = face
  interfaces.faces[hostPrefix].registerPrefix(prefix, (new interfaceClosure(face, interestHandler)))
  interfaces.list.push(hostPrefix)
  interfaces.active.push(interfaces.faces[hostPrefix])



