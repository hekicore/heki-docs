var docsVersion = '1.2.6-20260906';

function goHome(event) {
  if (event) {
    event.preventDefault();
  }
  if (window.location.hash === '#/README') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.replace('#/README');
}

function patchHomeLinks() {
  var selectors = [
    '.site-brand',
    '.app-name-link',
    '.app-nav a[title="首页"]',
    '.app-nav a[href*="%2freadme"]',
    '.app-nav a[href*="#/README"]'
  ];

  document.querySelectorAll(selectors.join(',')).forEach(function(link) {
    var isHomeLink = link.classList.contains('site-brand') || link.textContent.trim() === '首页';
    if (!isHomeLink && !link.classList.contains('app-name-link')) {
      return;
    }
    link.setAttribute('href', '#/README');
    link.onclick = goHome;
  });
}

function patchNavActiveState() {
  document.querySelectorAll('.app-nav > ul > li').forEach(function(item) {
    item.classList.remove('nav-parent-active');

    var submenu = Array.from(item.children).find(function(child) {
      return child.tagName === 'UL';
    });
    if (!submenu) {
      return;
    }

    var activeChildLink = submenu.querySelector('a.active');
    if (activeChildLink) {
      item.classList.add('nav-parent-active');
    }
  });
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function closeMobileSidebar() {
  if (!isMobileViewport()) {
    return;
  }
  document.body.classList.remove('close');
}

function shouldAutoCloseSidebar(link) {
  if (!link || !isMobileViewport()) {
    return false;
  }

  var href = (link.getAttribute('href') || '').trim().toLowerCase();
  if (!href) {
    return false;
  }
  if (link.target && link.target !== '_self') {
    return false;
  }
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  return href.startsWith('#') || href.indexOf('?id=') !== -1;
}

function bindMobileSidebarAutoClose() {
  if (document.body.dataset.mobileSidebarBound === 'true') {
    return;
  }
  document.body.dataset.mobileSidebarBound = 'true';

  document.addEventListener('click', function(event) {
    var link = event.target.closest('.sidebar a, .app-nav a');
    if (!shouldAutoCloseSidebar(link)) {
      return;
    }
    window.setTimeout(closeMobileSidebar, 0);
  });

  var mobileMediaQuery = window.matchMedia('(max-width: 768px)');
  var syncSidebarState = function(event) {
    if (event.matches === false) {
      document.body.classList.remove('close');
    }
  };

  if (typeof mobileMediaQuery.addEventListener === 'function') {
    mobileMediaQuery.addEventListener('change', syncSidebarState);
  } else if (typeof mobileMediaQuery.addListener === 'function') {
    mobileMediaQuery.addListener(syncSidebarState);
  }
}

function normalizeHomeHash() {
  var hash = window.location.hash || '';
  if (!hash || hash === '#' || hash === '#/') {
    window.location.replace('#/README');
    return;
  }

  if (hash.startsWith('#/?id=')) {
    var readmeTarget = '#/README' + hash.slice(2);
    if (hash !== readmeTarget) {
      window.location.replace(readmeTarget);
    }
    return;
  }

  if (hash === '#/README.md') {
    window.location.replace('#/README');
    return;
  }

  if (hash.startsWith('#/README.md?')) {
    window.location.replace('#/README' + hash.slice('#/README.md'.length));
    return;
  }

  var assetRedirectURL = resolveSpecialAssetURL(hash);
  if (assetRedirectURL) {
    window.location.replace(assetRedirectURL);
    return;
  }

  var normalizedLegacyHash = normalizeLegacyDocHash(hash);
  if (normalizedLegacyHash !== hash) {
    window.location.replace(normalizedLegacyHash);
    return;
  }

  var idIndex = hash.indexOf('?id=');
  if (idIndex === -1) {
    return;
  }

  var decodedID = '';
  try {
    decodedID = decodeURIComponent(hash.slice(idIndex + 4)).toLowerCase();
  } catch (error) {
    decodedID = hash.slice(idIndex + 4).toLowerCase();
  }

  if (decodedID === '/readme' || decodedID === 'readme') {
    window.location.replace('#/README');
  }
}

function resolveSpecialAssetURL(hash) {
  if (!hash || !hash.startsWith('#/')) {
    return '';
  }

  var route = hash.slice(1);
  var queryIndex = route.indexOf('?');
  var path = queryIndex === -1 ? route : route.slice(0, queryIndex);

  var assetRouteMap = {
    '/heki-v1.openapi.yaml': 'panel/heki-v1.openapi.yaml',
    '/panel/heki-v1.openapi.yaml': 'panel/heki-v1.openapi.yaml'
  };

  if (!assetRouteMap[path]) {
    return '';
  }

  return assetRouteMap[path];
}

function normalizeLegacyDocHash(hash) {
  if (!hash || !hash.startsWith('#/')) {
    return hash;
  }

  var route = hash.slice(1);
  var queryIndex = route.indexOf('?');
  var path = queryIndex === -1 ? route : route.slice(0, queryIndex);
  var suffix = queryIndex === -1 ? '' : route.slice(queryIndex);

  if (path.endsWith('.md')) {
    path = path.slice(0, -3);
  }

  var legacyRouteMap = {
    '/heki-v1-example-server': '/panel/heki-v1-example-server',
    '/heki-v1-webapi': '/panel/heki-v1-webapi'
  };

  if (!legacyRouteMap[path]) {
    return hash;
  }

  return '#' + legacyRouteMap[path] + suffix;
}

normalizeHomeHash();
bindMobileSidebarAutoClose();
window.addEventListener('hashchange', function() {
  normalizeHomeHash();
  closeMobileSidebar();
});

window.$docsify = {
  name: '⚡ Heki',
  homepage: 'README.md?v=' + docsVersion,
  nameLink: '#/README',
  loadSidebar: '_sidebar.md?v=' + docsVersion,
  loadNavbar: '_navbar.md?v=' + docsVersion,
  coverpage: '_coverpage.md?v=' + docsVersion,
  onlyCover: true,
  auto2top: true,
  subMaxLevel: 2,
  maxLevel: 4,
  mergeNavbar: true,
  notFoundPage: true,
  routerMode: 'hash',
  sidebarDisplayLevel: 1,
  search: {
    placeholder: '搜索文档...',
    noData: '没有找到结果',
    depth: 3
  },
  copyCode: {
    buttonText: '复制',
    errorText: '失败',
    successText: '已复制'
  },
  plugins: [
    function(hook) {
      hook.doneEach(function() {
        normalizeHomeHash();
        patchHomeLinks();
        patchNavActiveState();
      });
      hook.afterEach(function(html) {
        return html + '<div style="text-align:center;padding:2rem 0;margin-top:3rem;border-top:1px solid #eee;color:#999;font-size:13px">Heki © 2026</div>';
      });
    }
  ]
};
