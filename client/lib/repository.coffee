### Page Mirroring with IndexedDB ###
# For Offline mode, we mirror all pages in the browsers IndexedDB using IDBWrapper (https://github.com/jensarps/IDBWrapper)

IDBStore = require 'idb-wrapper'

module.exports = repo = {}

hostPrefix = '/'
hostComponents = location.host.split(':')[0].split('.')
for component in hostComponents
  if component != 'www'
    hostPrefix = "/#{component}" + hostPrefix
store = ''

repo.ready = false


jsonToContentObject = (json) ->
  uri = hostPrefix + wiki.asSlug(json.title)
  name = new Name(uri)
  content = {}
  content.object = new ContentObject(name, new SignedInfo(), json, new Signature())
  content.uri = uri
  return content


  
repositoryOpts = {
  dbVersion: 1,
  storeName: "repo",
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
          console.log json
          content = jsonToContentObject(json)
          onSuccess = () ->
            console.log "new page from Server added to Repository"
          onError = () ->
            console.log "page from server already in IndexedDB"
          repository.put(content, onSuccess, onError )
        )
    )       
}

repository = new IDBStore (repositoryOpts)

repo.update = (json) ->
  content = jsonToContentObject(json)
  inserted = false
  onmatch = (object, cursor, transaction) ->
    if content.uri == object.uri
      content.id = object.id
      console.log content
      cursor.update(content)
      inserted = true
      console.log "content updated"
  repository.iterate(onmatch, {
    index: 'uri'
    writeAccess: true
    onEnd: ()->
      if inserted == false
        console.log "content not inserted"
        repository.put(content)
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
