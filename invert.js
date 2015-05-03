var scheme_prefix;
var imageHandler;

function onEvent(evt) {
  if (evt.keyCode == 122 /* F11 */ &&
      evt.shiftKey) {
    chrome.runtime.sendMessage({'toggle_global': true});
    evt.stopPropagation();
    evt.preventDefault();
    return false;
  }
  if (evt.keyCode == 123 /* F12 */ &&
      evt.shiftKey) {
    chrome.runtime.sendMessage({'toggle_site': true});
    evt.stopPropagation();
    evt.preventDefault();
    return false;
  }
  return true;
}

function containsAny(haystack, needleList) {
  for (var i = 0; i < needleList.length; ++i) {
    if (haystack.indexOf(needleList[i]) >= 0) {
      return true;
    }
  }
  return false;
}

function isAnimatedGif(src, cb) {
  var request = new XMLHttpRequest();
  if (src.indexOf('data:') == 0) {
    return;
  }
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';
  request.addEventListener('load', function () {
    var arr = new Uint8Array(request.response),
      i, len, length = arr.length, frames = 0;

    // make sure it's a gif (GIF8)
    if (arr[0] !== 0x47 || arr[1] !== 0x49 ||
        arr[2] !== 0x46 || arr[3] !== 0x38) {
      cb(false);
      return;
    }

    //ported from php http://www.php.net/manual/en/function.imagecreatefromgif.php#104473
    //an animated gif contains multiple "frames", with each frame having a
    //header made up of:
    // * a static 4-byte sequence (\x00\x21\xF9\x04)
    // * 4 variable bytes
    // * a static 2-byte sequence (\x00\x2C) (some variants may use \x00\x21 ?)
    // We read through the file til we reach the end of the file, or we've found
    // at least 2 frame headers
    for (i=0, len = length - 9; i < len; ++i) {
      if (arr[i] === 0x00 && arr[i+1] === 0x21 &&
          arr[i+2] === 0xF9 && arr[i+3] === 0x04 &&
          arr[i+8] === 0x00 &&
          (arr[i+9] === 0x2C || arr[i+9] === 0x21))
      {
        frames++;
      }
      if (frames > 1) {
        break;
      }
    }

    // if frame count > 1, it's animated
    cb(frames > 1);
  });
  request.send();
}

function markImages(tag) {
  // Too many descendents means this is probably not _just_ an image.
  if (tag.childElementCount > 1) {
    return;
  } else if (tag.querySelectorAll('*').length > 1) {
    return;
  }
  var imageType;
  var bgImage;
  if (tag.tagName == 'CANVAS') {
    imageType = 'canvas';
  } else if (tag.tagName == 'VIDEO') {
    imageType = 'video';
  } else if (tag.tagName == 'EMBED') {
    if (tag.attributes.type.indexOf('pdf') >= 0) {
      imageType = 'pdf';
    } else {
      imageType = 'embed';
    }
  } else if (tag.tagName == 'OBJECT') {
    imageType = 'object';
  } else {
    if (tag.tagName == 'IMG') {
      bgImage = tag.src;
    } else {
      bgImage = window.getComputedStyle(tag)['background-image'];
    }
    if (containsAny(bgImage, ['data:image/png', '.png', '.PNG'])) {
      imageType = 'png';
    } else if (containsAny(bgImage, ['data:image/gif', '.gif', '.GIF'])) {
      imageType = 'gif';
    } else if (containsAny(bgImage,
        ['data:image/jpeg', '.jpg', '.JPG', '.jpeg', '.JPEG'])) {
      imageType = 'jpg';
    } else if (containsAny(bgImage, ['.webp', '.WEBP'])) {
      imageType = 'webp';
    } else if (tag.tagName == 'IMG') {
      imageType = 'other';
    }
  }
  if (imageType) {
    tag.setAttribute('imageType', imageType);
  }
}

function detectAnimatedGif(tag) {
  isAnimatedGif(tag.src, function(isAnimated) {
    if (isAnimated) {
      tag.setAttribute('imageType', 'animated gif');
    }
  });
}

function init() {
  if (window == window.top || !window.top.injected) {
    scheme_prefix = '';
    window.top.injected = true;
  } else {
    scheme_prefix = 'nested_';
  }

  document.addEventListener('keydown', onEvent, false);

  imageHandler = new MutationObserver(function(mutations, obs) {
    for(var i=0; i<mutations.length; ++i) {
      for(var j=0; j<mutations[i].addedNodes.length; ++j) {
        var newTag = mutations[i].addedNodes[j];
        if (newTag.querySelectorAll) {
          Array.prototype.forEach.call(
            newTag.querySelectorAll('*'),
            markImages);
          Array.prototype.forEach.call(
            newTag.querySelectorAll('img[src*=".gif"], img[src*=".GIF"]'),
            detectAnimatedGif);
        }
      }
    }
  });
  Array.prototype.forEach.call(
    document.querySelectorAll('*'),
    markImages);
  Array.prototype.forEach.call(
    document.querySelectorAll('img[src*=".gif"], img[src*=".GIF"]'),
    detectAnimatedGif);
  imageHandler.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

init();
