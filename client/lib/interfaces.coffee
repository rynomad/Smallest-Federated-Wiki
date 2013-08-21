# Functions to manage NDN Interfaces, register prefixes, and express interests
repo = require './repository.coffee'

window.interfaces = {}
interfaces.faces = {}
interfaces.list = []
interfaces.active = []

interestHandler = (face, upcallInfo) ->
  #logic goes here
  sendData = (data) ->
    signed = new SignedInfo()
    sent = false
    console.log data
    if interest.matches_name(new Name(interest.name.to_uri() + '/' + data.version)) == true && sent == false
      console.log data
      string = JSON.stringify(data)
      console.log string
      co = new ContentObject(new Name(upcallInfo.interest.name.to_uri() + '/' + data.version), signed, string, new Signature())
      console.log co
      co.signedInfo.freshnessSeconds = 604800
      co.sign()
      upcallInfo.contentObject = co
      face.transport.send(encodeToBinaryContentObject(upcallInfo.contentObject))
  contentStore = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length])
  interest = upcallInfo.interest
  
  if contentStore == 'page'
    pI = {}
    if DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1]) == 'update'
      withJson = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 2])
      pI.slug = withJson.slice(0, -5)
      console.log pI.slug
      repo.getPage(pI , sendData)
      slug = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 2])
      updateURIchunks = upcallInfo.interest.name.getName().split('/update')
      pageURI = updateURIchunks[0] + updateURIchunks[1]
      name = new Name(pageURI)
      interest = new Interest(name)
      closure = new ContentClosure(face, name, interest, repo.updatePageFromPeer)
      face.expressInterest(name, closure)     
    else
      pI = {}
      if (upcallInfo.interest.name.components.length - face.prefix.components.length) == 3 # interest has version number
        console.log "getting page requested with version"
        pI.version = parseInt(DataUtils.toString(upcallInfo.interest.name.components[upcallInfo.interest.name.components.length - 1]))
      withJson = DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1])
      pI.slug = withJson.slice(0, -5)
      console.log pI.slug
      repo.getPage(pI , sendData)
  else if contentStore == 'system'
    if DataUtils.toString(upcallInfo.interest.name.components[face.prefix.components.length + 1]) == 'sitemap.json'
      repo.getSitemap(sendData)
      
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
  open = () ->
    console.log(new Date())
    express = () ->
      console.log(new Date())
      name = new Name(hostPrefix + '/page/welcome-visitors.json')
      interest = new Interest(name)
      interest.childSelector = 1
      template = {}
      template.childSelector = 1
      closure = new ContentClosure(face, name, interest, repo.updatePage)
      face.expressInterest(name, closure, template)
    setTimeout(express, 300)
  face.onopen = open()
