#!/usr/bin/env node

var shell = require('rdf-shell')
var $rdf = require('rdflib')
var util = shell.util

/**
 * list the contents of a directory
 * @param  {[type]} argv [description]
 * @return {[type]}      [description]
 */
function bin (argv) {
  var uri = argv[2] || 'https://melvin.solid.live/inbox/'
  if (!uri) {
    console.error('uri is required')
  }
  console.log('Scanning inbox:', uri)
  shell.ls(uri, function (err, arr) {
    if (!err) {
      for (var i = 0; i < arr.length; i++) {
        var file = arr[i]
        shell.cat(file, processResult(file))
      }
    } else {
      console.error(err)
    }
  })
}

function processResult (file) {
  return function (err, res) {
    if (!err) {
      var g = $rdf.graph()

      var pt = util.primaryTopic(g, file)
      var SIOC = $rdf.Namespace('http://rdfs.org/sioc/ns#')

      var isPost = util.is(g, pt, SIOC('Post').uri)
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
