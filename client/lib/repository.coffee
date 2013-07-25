### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

revision = require './revision.coffee'
plugin = require('./plugin.coffee')
module.exports = repo = {}

pageToContentObject = (json) ->
  slug = wiki.asSlug(json.title) + '.json' # include json for easy MIME interpretation
  name = new Name(slug)
  signed = new SignedInfo()
  content = {}
  content.object= new ContentObject(name, signed, json, new Signature())
  content.object.sign()
  content.page = slug
  return content


repo.ready = false

#Define the repository Object Store  
pageOpts = {
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
repository = new IDBStore(pageOpts)

#Check to see if a page is in the repository, and perform the appropriate callback
repo.check = (pageInformation, ifCallback, elseCallback) ->
  repository = new IDBStore pageOpts, () ->
    found = false
    onItem = (content) ->
      if content.page == pageInformation.slug + '.json'
        #onsole.log content
        found = true
        page = content
        #console.log pageInformation
        page = revision.create pageInformation.rev, page if pageInformation.rev
        ifCallback(page, 'local')
    onCheckEnd = () ->
      done = true
      if found == false
        #console.log "page not found in Repository"
        elseCallback()
      else
        #console.log "page found in Repository"
    repository.iterate(onItem, {
      index: 'page'
      onEnd: onCheckEnd        
    })
    

repo.update = (json) ->
  new IDBStore pageOpts, () ->
    content = json
    inserted = false
    onmatch = (object, cursor, transaction) ->
      if content.page == object.page
        content.id = object.id
        #console.log content
        cursor.update(content)
        inserted = true
        #console.log "content found and updated"
    onEnding = ()->
        if inserted == false
          #console.log "content not not found; inserted"
          repository.put(content)
    repository.iterate(onmatch, {
      index: 'page'
      writeAccess: true
      onEnd: onEnding
    })

repo.getPage = (slug, callback) ->
  repository = new IDBStore(pageOpts, () ->
    found = false
    page = null
    console.log  'getting page ', slug
    onItem = (content, cursor, transaction) ->
      console.log content
      if content.page == slug
        console.log content
        found = true
        page = content
    onCheckEnd = () ->
      done = true
      if found == false
        console.log "page not found in Repository"
      else
        console.log "page found in Repository"
        callback(page)
    console.log repository.iterate(onItem, {
      index: 'page'
      onEnd: onCheckEnd        
    })
    
  )
    
###

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
