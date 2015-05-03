(function() {
  "use strict";

  // Constructor for objects representing Site URLs.
  function Site(url) {
    if (!(this instanceof Site)) {
      return new Site(url);
    }
    var url_object = new URL(url);
    var host_components = url_object.hostname.split('.');
    // convert "sub2.sub1.example.com" to "['example.com', 'sub1', 'sub2']"
    this.domain_hierarchy = [host_components.slice(-2).join('.')].concat(
        host_components.slice(0, -2).reverse());
    // convert "/path/to/resource.html" to "['path', 'to', 'resource.html']"
    this.page_hierarchy = url_object.pathname.split('/').filter(
        function(x) { return Boolean(x); });
  }
  Site.build = function(domain_hierarchy, page_hierarchy, protocol) {
    page_hierarchy = typeof page_hierarchy !== 'undefined' ? page_hierarchy
      : [];
    protocol = typeof protocol !== 'undefined' ? protocol : 'http';
    return new Site(protocol + '://' +
                    domain_hierarchy.slice(0).reverse().join('.') + '/' +
                    page_hierarchy.join('/'))
  }

  // Constructor for an object that stores hierarchical data and retrieves the
  // most-specific data available.
  function Hierarchy() {
    if (!(this instanceof Hierarchy)) {
      return new Hierarchy();
    }
    // This is the special key interpreted as the data for a position in the
    // hierarchy, rather than a child name.
    var DATA = '/';

    this.tree = typeof tree !== 'undefined' ? tree : {};

    // Get the closest object in the hierarchy that matches the given chain.
    this.get = function(chain) {
      var selection = this.tree;
      var last_data = this.tree[DATA];
      for (var i = 0; i < chain.length; ++i) {
        if (!(chain[i] in selection)) {
          break;
        }
        selection = selection[chain[i]];
        if (typeof selection[DATA] !== 'undefined') {
          last_data = selection[DATA];
        }
      }
      return last_data;
    };

    // Get the exact object in the hierarchy if it exists.
    this.get_exact = function(chain) {
      var selection = this.tree;
      for (var i = 0; i < chain.length; ++i) {
        if (!(chain[i] in selection)) {
          return undefined;
        }
        selection = selection[chain[i]];
      }
      return selection[DATA];
    };

    // Set a piece of data in the hierarchy
    this.set = function(chain, value) {
      var selection = this.tree;
      for (var i = 0; i < chain.length; ++i) {
        if (typeof selection[chain[i]] !== 'object') {
          selection[chain[i]] = {};
        }
        selection = selection[chain[i]];
      }
      selection[DATA] = value;
    }

    // Remove the object in the hierarchy matching the chain
    this.remove = function(chain) {
      var i = 0;
      var selection = this.tree;
      for (var i = 0; i < chain.length && typeof selection !== 'undefined';
          ++i) {
        selection = selection[chain[i]];
      }
      if (typeof selection !== 'undefined') {
        selection[DATA] = undefined;
      }
    };
  }

  // Constructor for the global Settings object which stores site-specific
  // settings in a hierarchy.
  function Settings() {
    if (!(this instanceof Settings)) {
      return new Settings();
    }

    this.storage = new Hierarchy();

    this.save = function(site, site_settings) {
      // Coerce site to a proper Site object if it's not one already.
      site = site instanceof Site ? site : Site(site);
      var site_domain = this.storage.get_exact(site.domain_hierarchy);
      if (!(site_domain instanceof Hierarchy)) {
        site_domain = new Hierarchy();
        this.storage.set(site.domain_hierarchy, site_domain);
      }
      site_domain.set(site.page_hierarchy, site_settings);
    };

    this.remove = function(site) {
      // Coerce site to a proper Site object if it's not one already.
      site = site instanceof Site ? site : Site(site);
      var site_domain = this.storage.get_exact(site.domain_hierarchy);
      if (!(site_domain instanceof Hierarchy)) {
        return;
      }
      site_domain.remove(site.page_hierarchy);
    };

    this.load = function(site) {
      // Coerce site to a proper Site object if it's not one already.
      site = site instanceof Site ? site : Site(site);
      var site_domain = this.storage.get(site.domain_hierarchy);
      if (site_domain instanceof Hierarchy) {
        return site_domain.get(site.page_hierarchy);
      }
      return site_domain;
    }

    // Helper function for setting the root element
    this.set_site_default = function(site_settings) {
      this.storage.set([], site_settings);
    }
    // Helper function for getting the root element
    this.site_default = function() {
      this.storage.get([]);
    }
  }

  // Export objects to global namespace
  window.Site = Site;
  window.Hierarchy = Hierarchy;
  window.Settings = Settings;
})();

// vim: et ts=2 sts=2 sw=2
