/**
 * 通用图片代理脚本 - 直接代理版
 * 完全阻止原始图片加载，所有请求直接通过代理服务器
 * 版本：4.1.0 - 直接加载增强版
 */
(function() {
    // 配置项
    const config = {
        proxyPrefix: 'https://images.weserv.nl/?url=',
        preventOriginalLoad: true,       // 完全阻止原始图片加载
        aggressiveIntercept: true,       // 激进拦截模式
        interceptPreload: true,          // 拦截预加载请求
        processCssBackgrounds: true,
        processDynamicImages: true,
        processXHRFetch: true,
        excludeDomains: [],
        debug: false
    };

    // 拦截锁定机制
    if (window._imageProxyHandler) return;
    window._imageProxyHandler = { initialized: true };
    const processedUrls = new Set();

    // 调试输出
    function debugLog(...args) {
        config.debug && console.log('📸 [Proxy]', ...args);
    }

    // 强化URL检测
    function isImageUrl(url) {
        return /\.(jpe?g|png|gif|webp|bmp|svg|ico)(\?.*)?$/i.test(url) ||
               /\/(images?|img|photos?|avatars?|cover)/i.test(url);
    }

    // 强化代理URL生成
    function getProxyUrl(url) {
        try {
            if (!url || url.startsWith('data:') || url.includes('images.weserv.nl')) return url;
            const fullUrl = new URL(url, window.location.href).href;
            return config.proxyPrefix + encodeURIComponent(fullUrl);
        } catch {
            return config.proxyPrefix + encodeURIComponent(url);
        }
    }

    // 核心拦截方法
    function interceptImageProperty(element, propName, attrName) {
        const descriptor = Object.getOwnPropertyDescriptor(element.prototype, propName);
        if (!descriptor) return;

        Object.defineProperty(element.prototype, propName, {
            set: function(value) {
                if (typeof value === 'string' && isImageUrl(value)) {
                    const proxyUrl = getProxyUrl(value);
                    debugLog(`拦截 ${propName}:`, value.substring(0, 40));
                    processedUrls.add(value);
                    return descriptor.set.call(this, proxyUrl);
                }
                return descriptor.set.call(this, value);
            },
            get: descriptor.get,
            configurable: true
        });
    }

    // 拦截所有图片相关属性
    function interceptImageElements() {
        // 拦截标准属性
        interceptImageProperty(HTMLImageElement, 'src', 'data-original-src');
        interceptImageProperty(HTMLImageElement, 'srcset', 'data-original-srcset');
        interceptImageProperty(HTMLMediaElement, 'poster', 'data-original-poster');

        // 拦截自定义数据属性
        const dataAttributes = ['data-src', 'data-srcset', 'data-poster'];
        dataAttributes.forEach(attr => {
            const handler = {
                set: function(target, prop, value) {
                    if (prop === attr && typeof value === 'string' && isImageUrl(value)) {
                        const proxyUrl = getProxyUrl(value);
                        debugLog(`拦截 ${attr}:`, value.substring(0, 40));
                        target.setAttribute(`data-original-${attr}`, value);
                        return Reflect.set(target, prop, proxyUrl);
                    }
                    return Reflect.set(target, prop, value);
                }
            };
            
            HTMLElement.prototype.__defineSetter__(attr, function(value) {
                if (typeof value === 'string' && isImageUrl(value)) {
                    const proxyUrl = getProxyUrl(value);
                    this.setAttribute(`data-original-${attr}`, value);
                    this.setAttribute(attr, proxyUrl);
                } else {
                    this.setAttribute(attr, value);
                }
            });
        });
    }

    // 拦截XHR和Fetch
    function interceptNetworkRequests() {
        // 拦截XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (isImageUrl(url)) {
                url = getProxyUrl(url);
                debugLog('拦截XHR:', url.substring(0, 40));
            }
            return originalXHROpen.apply(this, arguments);
        };

        // 拦截Fetch
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string' && isImageUrl(input)) {
                input = getProxyUrl(input);
                debugLog('拦截Fetch:', input.substring(0, 40));
            }
            return originalFetch(input, init);
        };
    }

    // 拦截预加载
    function interceptPreload() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'LINK' && 
                        node.rel === 'preload' && 
                        node.as === 'image') {
                        const href = node.href;
                        if (isImageUrl(href)) {
                            node.href = getProxyUrl(href);
                            debugLog('拦截预加载:', href.substring(0, 40));
                        }
                    }
                });
            });
        });

        observer.observe(document.head, { childList: true });
    }

    // 处理现有内容
    function processExisting() {
        // 处理图片元素
        document.querySelectorAll('img').forEach(img => {
            ['src', 'srcset'].forEach(attr => {
                if (img[attr] && !processedUrls.has(img[attr])) {
                    img[attr] = getProxyUrl(img[attr]);
                }
            });
        });

        // 处理CSS背景
        if (config.processCssBackgrounds) {
            const replaceBackground = el => {
                const bg = getComputedStyle(el).backgroundImage;
                const matches = bg.match(/url\(["']?(.*?)["']?\)/i);
                if (matches && matches[1]) {
                    el.style.backgroundImage = `url("${getProxyUrl(matches[1])}")`;
                }
            };
            
            document.querySelectorAll('*').forEach(el => {
                if (getComputedStyle(el).backgroundImage !== 'none') {
                    replaceBackground(el);
                }
            });
        }
    }

    // 动态内容处理
    function setupObservers() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches('img')) {
                            node.src = getProxyUrl(node.src);
                        } else {
                            node.querySelectorAll('img').forEach(processImage);
                        }
                    }
                });
            });
        });

        observer.observe(document, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['src', 'srcset']
        });
    }

    // 初始化
    function init() {
        interceptImageElements();
        interceptNetworkRequests();
        if (config.interceptPreload) interceptPreload();
        processExisting();
        setupObservers();
        debugLog('代理系统已激活 - 直接加载模式');
    }

    // 延迟初始化以确保原型修改生效
    setTimeout(init, 0);
})();
