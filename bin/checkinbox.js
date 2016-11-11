#!/usr/bin/env node

var shell = require ('rdf-shell')
$rdf       = require('rdflib')
var util = shell.util

/**
 * list the contents of a directory
 * @param  {[type]} argv [description]
 * @return {[type]}      [description]
 */
function bin(argv) {
  var uri = argv[2] || 'https://melvin.solid.live/inbox/'
  if (!uri) {
    console.error('uri is required')
  }
  console.log('Scanning inbox:', uri)
  shell.ls(uri, function(err, arr) {
    for (i=0; i<arr.length; i++) {
      var file = arr[i]
      shell.cat(file, processResult(file))
    }
  })
}

function processResult(file) {

  return function(err, res) {
    if (!err) {

      var g = $rdf.graph()
      var f = $rdf.fetcher(g, 2000)

      var t = $rdf.parse(res, g, file, 'text/turtle')

      var pt = util.primaryTopic(g, file)
      //console.log('pt', pt)

      var SIOC = $rdf.Namespace('http://rdfs.org/sioc/ns#')

      var isPost = util.is(g, pt, SIOC('Post').uri)
      //console.log('isPost', isPost)
      if (isPost) {
        console.log('SIOC Post found!', pt)
        console.log(res)
      }

    } else {
      console.error(err)
    }
  }

}

// If one import this file, this is a module, otherwise a library
if (require.main === module) {
  bin(process.argv)
}


module.exports = bin
