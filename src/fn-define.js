
/**
 * @fileoverview Module authoring format.
 */

(function(util, data, fn) {

  /**
   * Defines a module.
   * @param {string=} id The module canonical id.
   * @param {Array.<string>=} deps The module dependencies.
   * @param {function()|Object} factory The module factory function.
   */
  fn.define = function(id, deps, factory) {

    // Overloads arguments.
    if (util.isArray(id)) {
      factory = deps;
      deps = id;
      id = '';
    }
    else if (!util.isString(id)) {
      factory = id;
      if (util.isFunction(factory)) {
        deps = parseDependencies(factory.toString());
      }
      id = '';
    }

    checkPotentialErrors(factory.toString());

    var mod = { id: id, dependencies: deps || [], factory: factory };
    var uri;

    if (util.isOldIE) {
      // For IE6-8 browsers, the script onload event may not fire right
      // after the the script is evaluated. Kris Zyp found that it
      // could query the script nodes and the one that is in "interactive"
      // mode indicates the current script. Ref: http://goo.gl/JHfFW
      var script = util.getInteractiveScript();
      if (script) {
        uri = util.getScriptAbsoluteSrc(script);
      }

      // NOTE: If the id-deriving methods above is failed, then falls back
      // to use onload event to get the module uri.
    }

    if (uri) {
      util.memoize(uri, mod);
    } else {
      // Saves information for "real" work in the onload event.
      data.pendingMod = mod;
    }

  };


  function checkPotentialErrors(code) {
    if (code.search(/\sexports\s*=\s*\w/) !== -1) {
      throw 'Invalid code: exports = ...';
    }
  }


  function parseDependencies(code) {
    var pattern = /\brequire\s*\(\s*['"]?([^'")]*)/g;
    var ret = [], match;

    while ((match = pattern.exec(code))) {
      if (match[1]) {
        ret.push(match[1]);
      }
    }

    return ret;
  }

})(seajs._util, seajs._data, seajs._fn);