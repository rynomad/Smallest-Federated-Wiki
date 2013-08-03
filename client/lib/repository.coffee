### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

revision = require './revision.coffee'
plugin = require('./plugin.coffee')
module.exports = repo = {}

pageToContentObject = (json) ->
  slug = wiki.asSlug(json.title)
  name = new Name(slug)
  signed = new SignedInfo()
  content = {}
  content.object= new ContentObject(name, signed, json, new Signature())
  content.object.sign()
  content.page = slug
  return content

interfaces = []





#Define the page Object Store,  
pageStoreOpts = {
  dbVersion: 1,
  storeName: "page",
  keypath: 'id',
  autoincrement: false,
  indexes: [
    { name: 'page', unique: false, multiEntry: false }
  ],
  onStoreReady: () ->
    repo.ready = true
    $.get('/system/sitemap.json', (sitemap) -> 
        status.get(1, (favicon) ->
          for entry in sitemap
            $.get("/#{entry.slug}.json", (json) ->
              json.favicon = favicon.dataUrl
              content = json
              content.page = wiki.asSlug(json.title) + '.json'
              onSuccess = () ->
                #console.log "new page from Server added to Repository"
              onError = () ->
                #console.log "page from server already in IndexedDB"
              repository.put(content, onSuccess, onError )
            )
        )
    )       
}

statusOpts= {
  dbVersion: 1,
  storeName: "status",
  keypath: 'id',
  autoincrement: true,
  indexes: [
    { name: 'type', unique: false, multiEntry: false }
  ],
  onStoreReady: () ->
    onSuccess = (item) ->
      if item != undefined
        #console.log "favicon found", item
      else
        #console.log "favicon not found, generating..."
        plugin.get 'favicon', (favicon) ->
          favicon.create(status)
    onError = () ->
      #console.log "favicon not found, generating..."
      plugin.get 'favicon', (favicon) ->
        favicon.create(status)
    status.get(1, onSuccess, onError)
}




status = new IDBStore(statusOpts)
repository = new IDBStore(pageStoreOpts)

#Check to see if a page is in the repository, and perform the appropriate callback
repo.check = (pageInformation, whenGotten, whenNotGotten) ->
  repository = new IDBStore pageStoreOpts, () ->
    found = false
    console.log pageInformation.slug
    onItem = (content) ->
      if content.page == pageInformation.slug + '.json'
        #onsole.log content
        found = true
        page = content
        #console.log pageInformation
        page = revision.create pageInformation.rev, page if pageInformation.rev
        whenGotten(page, 'local')
    onCheckEnd = () ->
      if found == false
        console.log "page not found in Repository"
        name = new Name( interfaces[0].prefixURI + 'page/' + pageInformation.slug + '.json')
        interest = new Interest(name)
        getClosure = new ContentClosure(interfaces[0], name, interest, (data) ->
          if data?
            console.log data
            whenGotten(JSON.parse(data), 'local')
          else
            whenNotGotten()
        )
        interfaces[0].expressInterest(name, getClosure)
      else
        console.log "page found in Repository"
    repository.iterate(onItem, {
      index: 'page'
      onEnd: onCheckEnd        
    })

repo.update = (json) ->
  repository = new IDBStore pageStoreOpts, () ->
    content = json
    content.page = wiki.asSlug(json.title) + '.json'
    repository.put(content)

repo.getPage = (slug, callback) ->
  repository = new IDBStore(pageStoreOpts, () ->
    found = false
    pages = []
    console.log  'getting page ', slug
    onItem = (content, cursor, transaction) ->
      if content.page == slug
        console.log content
        found = true
        page = content
        pages.push(content)
    onCheckEnd = () ->
      done = true
      if found == false
        console.log "page not found in Repository"
        callback()
      else
        console.log "page found in Repository"
        console.log pages
        callback(pages)
    repository.iterate(onItem, {
      index: 'page'
      onEnd: onCheckEnd        
    })
  )

repo.interestHandler = (prefix, upcallInfo) ->
  #logic goes here 
  console.log prefix.components.length
  contentStore = DataUtils.toString(upcallInfo.interest.name.components[prefix.components.length])
  if contentStore == 'page'
    slug = DataUtils.toString(upcallInfo.interest.name.components[prefix.components.length + 1])
    repo.getPage(slug, (pages) ->
      console.log pages
      signed = new SignedInfo()
      co = new ContentObject(upcallInfo.interest.name, signed, JSON.stringify(pages[pages.length - 1]), new Signature())
      co.sign()
      upcallInfo.contentObject = co
      interfaces[0].transport.send(encodeToBinaryContentObject(upcallInfo.contentObject))
      interfaces[1].transport.send(encodeToBinaryContentObject(upcallInfo.contentObject))
    )

repo.registerFace = (url) ->
  face = new NDN({host: url})
  hostPrefix = '/'
  hostComponents = url.split('.')
  for component in hostComponents
    if component != 'www'
      hostPrefix = "/#{component}" + hostPrefix
  prefix = new Name(hostPrefix)
  face.prefixURI = hostPrefix
  face.registerPrefix(prefix, new interfaceClosure(face, prefix, repo.interestHandler))
  interfaces.push(face)
  
repo.registerFace('localhost')
repo.registerFace('127.0.0.1')
# Take a page JSON object and convert it to an entry with string uri and NDN contentObject
# TODO: segmentation and timestamping





###
repo.fetchPage = (pageInformation, whenGotten, whenNotGotten)
  repo.getPage(pageInformation.slug, (page) ->
    if page?
      console.log page
    else
      console.log 'no page'
  )

repository.Stores(hostPrefix, () ->
  console.log "Store Ready! " + hostPrefix
)

repository.evalComponent = (components, storePrefix, i) ->
  component = components[i+1]
  repository.Stores(storePrefix, (component) ->
    i++
    storePrefix = storePrefix + '/' + component      
    store.get(component, repository.evalComponent(components, storePrefix, i))
  )

repository.evalInterest = (interest) ->
  i = 0
  components = interest.name.components
  storePrefix = DataUtils.toString(components[i])
  repository.evalComponent(components, storePrefix, i)

repository.ndntest = () ->
  
  name = new Name('/test/uri/for/stuff')
  content = new ContentObject(name, new SignedInfo(), "adflihsdalsdhfklghlfjhaljkghaljlakghaljhaldjfha;dkjfh;asdfhas;dfhasdf", new Signature())
  interest = new Interest(name)
  console.log name, content, interest
  repository.evalInterest(content)
  
repository.addComponent = (storePrefix, components, i) ->
  component = components[i+1]
  if i < (components.length - 1)
    repository.Stores(storePrefix, (component) ->
      i++
      storePrefix = storePrefix + '/' + DataUtils.toString(component)      
      console.log storePrefix
      store.put(components[i], repository.addComponent(storePrefix, components, i))
    )

repository.insert = (contentObject) ->
  i = 0
  components = contentObject.name.components
  storePrefix = '/' + DataUtils.toString(components[i])
  console.log storePrefix, components
  repository.addComponent(storePrefix, components, i)


  $.get('/system/sitemap.json', (sitemap) ->  
         console.log sitemap     
         for entry in sitemap
           $.get("/#{entry.slug}.json", (json) ->
             console.log json
             entry.json = json
             entry.steward = json.steward
             repository.put(entry))
  )
###
