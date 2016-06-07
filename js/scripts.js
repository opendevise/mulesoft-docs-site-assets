var SCREEN_SMALL_MAX = 992;
$.fn.reverse = Array.prototype.reverse;

$(function() {
    initSubHeader();
    // QUESTION should initSiteNav come before initSubHeader? Keep in mind, initSubHeader collapses nav
    initSiteNav();
    initContentToc();
    fixEncoding();
    $('body').show();
});

$(window).load(function() {
    initFancyBox();
});

function initFancyBox () {

    $(document).bind('page:change', function(){
        $('.fancybox').fancybox({ parent: "body"})
    });

    $(".article-content span.image").each(function(index, value) {
        var natImgWidth = $(this).find('img').get(0).naturalWidth;
        if ( natImgWidth > 500 ) {
            var imgSrc = $(this).find('img').attr('src');
            $(this).replaceWith('<span class="image"><a class="fancybox" href="'+imgSrc+'"><img src="'+imgSrc+'"/></a></span>');
        }
    });
    $(".fancybox").fancybox();
}

function initSubHeader() {
    var header = $('.header'),
        subHeader = $('.sub-header'),
        container = $('.container'),
        footer = $('.footer'),
        treeIcon = $('.tree-icon'),
        searchField = $('.search-field'),
        updateSubHeaderWidth = function() {
            subHeader.css('width', container.css('width'));
            if (isSmallScreen() && !treeIcon.hasClass('tree-closed')) toggleSiteNav();
        };

    treeIcon.click(toggleSiteNav);

    updateSubHeaderWidth();
    $(window).resize(updateSubHeaderWidth);

    // NOTE we must use functions since header and footer height change on small screens
    subHeader.affix({ offset: {
        top: function() { return header.height(); },
        bottom: function() { return footer.outerHeight(); }
    }});
    container.toggleClass('affixed-sub-header', !subHeader.hasClass('affix-top'));
    // NOTE capture transition between static and fixed positioning of sub-header
    subHeader.on('affixed-top.bs.affix affixed.bs.affix', function(e) {
        container.toggleClass('affixed-sub-header', e.type !== 'affixed-top');
    });

    searchField.data('placeholder', searchField.attr('placeholder'));
    searchField.focus(function() {
        searchField.attr('placeholder', '');
    });
    searchField.blur(function() {
        searchField.attr('placeholder', searchField.data('placeholder'));
    });
}

function initContentToc() {
    var toc = $('.scroll-menu');
    if (!toc.length) return;

    var header = $('.header'),
        footer = $('.footer'),
        tocMarginT = parseFloat(toc.css('margin-top')),
        tocMarginB = parseFloat(toc.css('margin-bottom')),
        flowTocHeight = function(force) {
            if (!(force || toc.hasClass('affix-top'))) return; // guards against race condition w/ scroll event
            toc.css('max-height', window.innerHeight - (toc.offset().top - $(window).scrollTop()) - tocMarginB);
        },
        fixTocHeight = function() {
           toc.css('max-height', window.innerHeight - $('.sub-header').height() - tocMarginT - tocMarginB);
        },
        updateTocHeight = function(e) {
            if (!toc.is(':visible')) return;
            var type = e ? e.type : 'resize';
            if (type === 'affixed-top' || (type === 'resize' && toc.hasClass('affix-top'))) {
                $(window).off('scroll', flowTocHeight).scroll(flowTocHeight);
                flowTocHeight(true);
            }
            else {
                $(window).off('scroll', flowTocHeight);
                fixTocHeight();
            } 
        }
        // TODO might be nicer to scroll only when necessary to bring element into view
        scrollToActiveLink = function(scrollTo) {
            if (toc.data('scrolling-to') === scrollTo) return;
            toc.stop('fx.toc.scroll', true).data('scrolling-to', scrollTo).animate({ scrollTop: scrollTo }, {
                queue: 'fx.toc.scroll',
                duration: 250,
                complete: function() { $(this).removeData('scrolling-to'); }
            }).dequeue('fx.toc.scroll');
        };

    // NOTE we must use functions since header and footer height change on small screens
    toc.affix({ offset: {
        top: function() { return header.height(); },
        bottom: function() { return footer.outerHeight() + tocMarginB; }
    }});
    updateTocHeight();
    toc.on('affixed-top.bs.affix affixed.bs.affix', updateTocHeight);
    $(window).resize(function(e) {
        updateTocHeight(e);
        // NOTE call deferred handler 2 times to correct affix-bottom positioning when toggling between small & large screen
        for (var i = 0; i < 2; i++) toc.trigger('click.bs.affix.data-api');
    });

    // TODO update active link on resize as well
    // TODO disable while page is being scrolled to target of clicked item
    $(window).scroll(function() {
        if (!toc.is(':visible')) return;
        var links = toc.find('.scroll-menu-link'),
            windowScrollY = $(this).scrollTop(),
            // QUESTION is there a more stable way to calculate cushion?
            cushion = parseFloat($('.sub-header + .row').css('margin-top')) + 20,
            scrollMax = toc[0].scrollHeight - toc.height(),
            scrollable = scrollMax > 0,
            matchFound, linkTop;
        links.removeClass('active').reverse().each(function() {
            var target = $(this.hash);
            if (target.length && windowScrollY >= target.offset().top - cushion) {
                $(this).addClass('active');
                if (scrollable && (linkTop = $(this).position().top)) {
                    var scrollFrom = toc.scrollTop(),
                        scrollTo = scrollFrom + linkTop;
                    if (scrollTo < scrollMax || (scrollTo >= scrollMax && scrollFrom < scrollMax)) {
                        scrollToActiveLink(scrollTo);
                    }
                }
                return !(matchFound = true);
            }
        });
        if (!matchFound && links.length) {
            if (scrollable && toc.scrollTop()) scrollToActiveLink(0);
            // NOTE enable the following line to highlight first element if no element is matched
            //links.last().addClass('active');
        }
    });

    toc.find('.scroll-menu-link').click(function(e) {
        e.preventDefault();
        var target = $(this.hash);
        if (target.length) {
            // NOTE we assume that any amount of scrolling pushes us to a fixed sub-header
            $('html, body').animate({ scrollTop: target.offset().top - $('.sub-header').height() }, 250);
            history.pushState({}, '', this.hash);
        }
    });
}

function toggleSiteNav(e) {
    if (e) e.preventDefault();
    (e ? $(this) : $('.tree-icon')).toggleClass('tree-closed');
    var navColumn = $('.sidebar-nav'),
        nav = navColumn.find('nav');
        isNavOpen = navColumn.is(':visible'),
        toc = $('.scroll-menu'),
        tocContainer = null,
        articleContentColumn = $('.article-content'),
        articleCols = isNavOpen ? { from: 'col-md-7', to: 'col-md-10' } : { from: 'col-md-10', to: 'col-md-7' },
        speed = 250;
    if (isSmallScreen()) {
        navColumn.toggle();
        articleContentColumn.removeClass(articleCols.from).addClass(articleCols.to);
        if (!isNavOpen) place_scroll_marker(nav.find('li.active'), 'active-marker');
        return;
    }
    // NOTE keep toc from jumping while width of sidebar transitions
    if (toc.length) {
        var tocContainerOffset = (tocContainer = toc.parent()).offset();
        tocContainer.css({ position: 'absolute', top: tocContainerOffset.top, left: tocContainerOffset.left });
        if (toc.hasClass('affix')) toc.css('left', toc.offset().left);
    }
    if (!isNavOpen) { // opening
        navColumn.show();
        nav.trigger('resize');
        navColumn.hide();
    }
    var fromContentWidth = articleContentColumn[0].getBoundingClientRect().width;
    articleContentColumn.removeClass(articleCols.from).addClass(articleCols.to);
    var toContentWidth = articleContentColumn[0].getBoundingClientRect().width;
    articleContentColumn.css('width', fromContentWidth);
    navColumn.animate({ width: 'toggle', opacity: 'toggle' }, {
        queue: 'fx.sidebar',
        duration: speed,
        // NOTE set overflow to visible to prevent nav in fixed position from disappearing in WebKit
        start: function() { navColumn.css('overflow', 'visible'); },
        // NOTE keep toc position synchronized throughout animation (used primarily when near bottom of page)
        progress: function() { toc.trigger('scroll.bs.affix.data-api'); },
        complete: function() {
            if (toc.length) {
                tocContainer.css({ position: '', top: '', left: '' })
                toc.css('left', '');
            }
            toc.trigger('scroll.bs.affix.data-api');
            // FIXME think about whether we can skip this step in certain cases; perhaps first time only?
            if (!isNavOpen) place_scroll_marker(nav.find('li.active'), 'active-marker');
        }
    });
    articleContentColumn.animate({ width: toContentWidth }, {
        queue: 'fx.sidebar',
        duration: speed,
        complete: function() {
            articleContentColumn.css('width', '');
            toc.trigger('scroll.bs.affix.data-api');
        }
    });
    $([navColumn[0], articleContentColumn[0]]).dequeue('fx.sidebar');
}

function initSiteNav() {
    var nav = $('.sidebar-nav nav'),
        header = $('.header'),
        subHeader = $('.sub-header'),
        footer = $('.footer'),
        flowNavHeight = function(force) {
            if (!(force || nav.hasClass('affix-top'))) return; // guards against race condition w/ scroll event
            nav.css('max-height', window.innerHeight - (nav.offset().top - $(window).scrollTop()));
        },
        fixNavHeight = function() {
            nav.css('max-height', window.innerHeight - subHeader.height());
        },
        updateNavWidth = function() {
            nav.css('width', Math.floor(nav.parent()[0].getBoundingClientRect().width));
        },
        updateNavDimensions = function(e) {
            var type = e ? e.type : 'resize';
            if (isSmallScreen() || !nav.is(':visible')) {
                if (type === 'resize') {
                    $(window).off('scroll', flowNavHeight);
                    nav.css({ 'width': '', 'max-height': '' });
                }
                return;
            }
            if (type === 'affixed-top' || (type === 'resize' && nav.hasClass('affix-top'))) {
                $(window).off('scroll', flowNavHeight).scroll(flowNavHeight);
                flowNavHeight(true);
            }
            else {
                $(window).off('scroll', flowNavHeight);
                fixNavHeight();
            }
            // NOTE set width even when affix-top as it corrects bleed in WebKit caused by scrollbar
            if (type === 'resize') updateNavWidth();
        };

    // NOTE we must use functions since header and footer height change on small screens
    nav.affix({ offset: {
        top: function() { return header.height(); },
        bottom: function() { return footer.outerHeight(); }
    }});
    nav.on('affixed-top.bs.affix affixed.bs.affix resize', updateNavDimensions).trigger('resize');
    $(window).resize(updateNavDimensions);

    //Collapse all lists
    nav.find('li:has(ul)').addClass('parent_li');
    openExpandedSubtree();

    // FIXME can we make it work without this setTimeout?
    if (isNotSmallScreen()) setTimeout(function() { place_scroll_marker(nav.find('li.active'), 'active-marker'); }, 0);

    nav.find('li.parent_li > i').click(function(e) {
        e.preventDefault();
        var parent = $(this).parent(),
            children = parent.find('> ul');

        place_scroll_marker(parent, 'marker');

        // Show/hide a sublist
        if (children.is(':visible')) {
            children.slideUp('fast');
            $(this).removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');

            /* Remove active trail from the node to the childrens */
            parent.removeClass('expanded').find('li.expanded').removeClass('expanded');

            // Hide active-marker
            if (children.find('.active').length) {
                $('.active-marker').animate({ width: 'toggle', opacity: 'toggle' }, 100);
            }
        }
        else {
            children.slideDown('fast');
            $(this).removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
            parent.addClass('expanded');

            if (children.find('.active').is(':visible')){
                $('.active-marker').animate({ width: 'toggle', opacity: 'toggle' }, 250);
            }
        }
    });

    nav.find('li').hover(function() {
        $('.marker').show();
        place_scroll_marker($(this), 'marker');
    }, function() {
        if (!$('.tree').is(':hover')) $('.marker').hide();
    });

    function openExpandedSubtree() {
        nav.find('li.parent_li > ul').hide(0);
        nav.find('li.parent_li > i').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
        nav.find('li.parent_li.expanded > ul').show(0);
        nav.find('li.parent_li.expanded > i').removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
    }
}

function place_scroll_marker(elem, markerClass) {
    if (!elem.length) return;
    var offsetTop = elem.offset().top,
        offsetLeft = $('.tree').left,
        height = 0,
        link = elem.find('> a'),
        height = link.innerHeight() + parseInt(elem.css('padding-top'), 10) + parseInt(elem.css('padding-bottom'), 10);
    $('.sidebar-nav .' + markerClass).show();
    $('.sidebar-nav .' + markerClass).offset({top: offsetTop, left: offsetLeft});
    $('.sidebar-nav .' + markerClass).height(height);
}

function isSmallScreen() {
    return window.innerWidth <= SCREEN_SMALL_MAX;
}

function isNotSmallScreen() {
    return window.innerWidth > SCREEN_SMALL_MAX;
}

function fixEncoding(){
    $('.article-content .listingblock .CodeRay .entity').each(function(){
        var curCont = $(this).text();
        $(this).html(curCont.replace('&amp;', '&'));
    });
}
