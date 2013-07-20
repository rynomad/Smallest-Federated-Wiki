### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

ndn = require './ndn.coffee'
revision = require './revision.coffee'
module.exports = repo = {}

repo.ready = false

#Define the repository Object Store  
repositoryOpts = {
  dbVersion: 1,
  storeName: "page",
  keypath: 'id',
  autoincrement: false,
  indexes: [
    { name: 'uri', unique: true, multiEntry: false }
  ],
  onStoreReady: () ->
    repo.ready = true
    $.get('/system/sitemap.json', (sitemap) ->  
      for entry in sitemap
        $.get("/#{entry.slug}.json", (json) ->
          content = ndn.pageToContentObject(json)
          onSuccess = () ->
            console.log "new page from Server added to Repository"
          onError = () ->
            console.log "page from server already in IndexedDB"
          repository.put(content, onSuccess, onError )
        )
    )       
}

repository = new IDBStore(repositoryOpts)

#Check to see if a page is in the repository, and perform the appropriate callback
repo.check = (pageInformation, ifCallback, elseCallback) ->
  new IDBStore repositoryOpts, () ->
    found = false
    onItem = (content) ->
      if content.uri == ndn.hostPrefix + 'page/' + pageInformation.slug + '.json/'
        console.log content
        found = true
        page = content.object.content
        console.log pageInformation
        page = revision.create pageInformation.rev, page if pageInformation.rev
        ifCallback(page, 'local')
    onCheckEnd = () ->
      done = true
      if found == false
        console.log "page not found in Repository"
        elseCallback()
      else
        console.log "page found in Repository"
    repository.iterate(onItem, {
      index: 'uri'
      onEnd: onCheckEnd        
    })
    

repo.update = (json) ->
  new IDBStore repositoryOpts, () ->
    content = ndn.pageToContentObject(json)
    inserted = false
    onmatch = (object, cursor, transaction) ->
      if content.uri == object.uri
        content.id = object.id
        console.log content
        cursor.update(content)
        inserted = true
        console.log "content found and updated"
    onEnding = ()->
        if inserted == false
          console.log "content not not found; inserted"
          repository.put(content)
    repository.iterate(onmatch, {
      index: 'uri'
      writeAccess: true
      onEnd: onEnding
    })

repo.page = {}

repo.getPage = (slug) ->
  console.log "repo.ready ==", repo.ready
  done = false
  if repo.ready == false
    return undefined
  else
    found = false
    page = undefined
    onItem = (content, cursor, transaction) ->
      if content.uri == hostPrefix + slug
        console.log content
        found = true
        repo.page = content.object.content
    onCheckEnd = () ->
      done = true
      if found == false
        console.log "page not found in Repository"
      else
        console.log "page found in Repository"
    repository.query(onItem, {
      index: 'uri'
      onEnd: onCheckEnd        
    })
    
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
