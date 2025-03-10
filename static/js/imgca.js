/**
 * 通用图片代理脚本 - 在任何网页上自动将图片转为images.weserv.nl代理
 * 增强版本：兼容所有网站、浏览器，并具有自适应功能
 * 版本：2.0.0
 */
(function() {
    // 配置项
    const config = {
        proxyPrefix: 'https://images.weserv.nl/?url=',
        processCssBackgrounds: true,   // 是否处理CSS背景图片
        processDynamicImages: true,    // 是否处理动态加载的图片
        processXHRFetch: true,         // 是否拦截XHR和Fetch请求
        preventDuplicateProcessing: true, // 防止重复处理同一URL
        monitorFrequency: 800,         // 监控频率(毫秒)
        debug: false,                  // 是否启用调试日志
        excludeDomains: [],            // 不处理的域名列表
        excludeSelectors: []           // 不处理的元素选择器列表
    };
    
    // 创建一个唯一的命名空间，避免与页面上其他脚本冲突
    window._imageProxyHandler = window._imageProxyHandler || {};
    
    // 如果已经运行过，就不再重复运行
    if (window._imageProxyHandler.initialized) {
        console.log('✅ 图片代理转换已经在运行中');
        return;
    }
    
    // 标记为已初始化
    window._imageProxyHandler.initialized = true;
    
    // 存储已处理过的URL，防止重复处理
    const processedUrls = new Set();
    
    // 当前网站的域名和协议
    const baseUrl = window.location.origin;
    const currentDomain = window.location.hostname;
    
    // 检查当前域名是否在排除列表中
    if (config.excludeDomains.includes(currentDomain)) {
        console.log(`⏭️ 跳过处理图片：${currentDomain} 在排除列表中`);
        return;
    }
    
    // 调试日志函数
    function debugLog(...args) {
        if (config.debug) {
            console.log('📸 [ImgProxy]', ...args);
        }
    }
    
    // 防抖函数，避免频繁执行某个操作
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    // 错误处理函数
    function safeExecute(fn, fallback = null, ...args) {
        try {
            return fn(...args);
        } catch (error) {
            debugLog('执行操作时出错:', error);
            return typeof fallback === 'function' ? fallback(...args) : fallback;
        }
    }
    
    // 初始化函数
    function initialize() {
        debugLog('初始化图片代理系统');
        
        try {
            // 立即执行处理现有图片
            processExistingImages();
            
            // 如果启用了CSS背景处理，则处理背景图片
            if (config.processCssBackgrounds) {
                setTimeout(() => safeExecute(interceptBackgroundImages), 500);
                
                // 定期检查内联样式，使用防抖函数减少性能开销
                const debouncedProcessStyles = debounce(() => {
                    safeExecute(processInlineStyles);
                }, 300);
                
                setInterval(debouncedProcessStyles, 1500);
            }
            
            // 如果启用了动态图片处理，设置DOM观察器
            if (config.processDynamicImages) {
                safeExecute(setupImageObserver);
            }
            
            // 拦截Image对象
            safeExecute(interceptImageElement);
            
            // 拦截XHR和Fetch
            if (config.processXHRFetch) {
                safeExecute(interceptXHRAndFetch);
            }
            
            // 处理特定类型网站的图片加载
            setupSiteSpecificHandlers();
            
            // 设置定期扫描
            setupPeriodicScans();
            
            console.log('✅ 通用图片代理转换已启用：所有图片将通过 images.weserv.nl 加载');
        } catch (error) {
            console.error('❌ 图片代理转换初始化失败:', error);
        }
    }
    
    // 设置网站特定处理程序
    function setupSiteSpecificHandlers() {
        // 音乐播放网站
        setupMusicPlayerObserver();
        
        // 图片库/相册网站
        setupGalleryObserver();
        
        // 社交媒体网站
        setupSocialMediaObserver();
        
        // 电子商务网站
        setupEcommerceObserver();
        
        // 视频网站
        setupVideoSiteObserver();
    }
    
    // 设置定期扫描
    function setupPeriodicScans() {
        // 使用随机间隔，避免被检测为机器人
        const randomInterval = () => 800 + Math.random() * 400;
        
        // 定期扫描图片
        setInterval(() => safeExecute(processExistingImages), randomInterval());
        
        // 定期扫描懒加载图片
        setInterval(() => safeExecute(processLazyLoadImages), randomInterval() * 1.5);
        
        // 定期扫描iframe内的图片
        setInterval(() => safeExecute(processIframeImages), randomInterval() * 2);
        
        // 监听滚动事件，处理可见区域内的新图片，使用防抖减少频率
        const debouncedScrollHandler = debounce(() => {
            safeExecute(processVisibleImages);
        }, 200);
        
        window.addEventListener('scroll', debouncedScrollHandler, { passive: true });
        window.addEventListener('resize', debouncedScrollHandler, { passive: true });
    }
    
    // 检查元素是否应被跳过处理
    function shouldSkipElement(element) {
        // 检查元素是否匹配排除选择器
        return config.excludeSelectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });
    }
    
    // 使用DOM拦截处理现有图片
    function processExistingImages() {
        // 处理所有当前页面上的图片
        const images = document.querySelectorAll('img');
        let count = 0;
        
        images.forEach(img => {
            if (!shouldSkipElement(img) && processImageSrc(img)) {
                count++;
            }
        });
        
        if (count > 0) {
            debugLog(`处理了${count}个现有图片`);
        }
        
        return count;
    }
    
    // 处理当前可见区域内的图片
    function processVisibleImages() {
        const windowHeight = window.innerHeight;
        const images = document.querySelectorAll('img:not([data-proxy-processed])');
        let count = 0;
        
        images.forEach(img => {
            const rect = img.getBoundingClientRect();
            // 图片在视口内或接近视口
            if (rect.top < windowHeight + 300 && rect.bottom > -300) {
                if (!shouldSkipElement(img) && processImageSrc(img)) {
                    img.setAttribute('data-proxy-processed', 'true');
                    count++;
                }
            }
        });
        
        if (count > 0) {
            debugLog(`处理了${count}个可见区域图片`);
        }
    }
    
    // 处理图片src属性，返回是否进行了处理
    function processImageSrc(img) {
        let processed = false;
        
        try {
            // 如果图片有src但没有data-original属性，表示尚未处理过
            if (img.src && !img.hasAttribute('data-original')) {
                const originalSrc = img.getAttribute('src');
                
                // 如果已经是代理URL或者是data URL或SVG，则跳过
                if (!originalSrc || 
                    originalSrc.includes('images.weserv.nl') || 
                    originalSrc.startsWith('data:') ||
                    originalSrc.startsWith('blob:') ||
                    originalSrc.includes('<svg')) {
                    return false;
                }
                
                // 避免重复处理
                if (config.preventDuplicateProcessing && processedUrls.has(originalSrc)) {
                    return false;
                }
                
                // 保存原始URL
                img.setAttribute('data-original', originalSrc);
                
                // 设置代理URL
                const proxyUrl = getProxyUrl(originalSrc);
                img.setAttribute('src', proxyUrl);
                processedUrls.add(originalSrc);
                processed = true;
                debugLog('处理图片src:', originalSrc.substring(0, 50) + (originalSrc.length > 50 ? '...' : ''));
            }
            
            // 处理懒加载属性 (如data-src, data-lazy-src等)
            const lazyAttributes = [
                'data-src', 'data-lazy-src', 'data-original', 'lazy-src', 
                'data-cover', 'data-thumbnail', 'data-bg', 'data-poster',
                'data-image', 'data-srcset', 'data-defer-src', 'data-origin',
                'data-backdrop', 'data-url', 'data-high-res-src', 'data-low-res-src',
                'data-raw-src', 'data-img', 'data-src-retina'
            ];
            
            lazyAttributes.forEach(attr => {
                if (img.hasAttribute(attr) && !img.hasAttribute(`data-original-${attr}`)) {
                    const originalValue = img.getAttribute(attr);
                    
                    // 跳过已代理或data URL或空值
                    if (!originalValue || 
                        originalValue.includes('images.weserv.nl') || 
                        originalValue.startsWith('data:') ||
                        originalValue.startsWith('blob:')) {
                        return;
                    }
                    
                    // 避免重复处理
                    if (config.preventDuplicateProcessing && processedUrls.has(originalValue)) {
                        return;
                    }
                    
                    // 保存原始值
                    img.setAttribute(`data-original-${attr}`, originalValue);
                    
                    // 设置代理URL
                    const proxyUrl = getProxyUrl(originalValue);
                    img.setAttribute(attr, proxyUrl);
                    processedUrls.add(originalValue);
                    processed = true;
                    debugLog(`处理图片${attr}:`, originalValue.substring(0, 50) + (originalValue.length > 50 ? '...' : ''));
                }
            });
            
            // 处理srcset属性
            if (img.hasAttribute('srcset') && !img.hasAttribute('data-original-srcset')) {
                const originalSrcset = img.getAttribute('srcset');
                
                if (originalSrcset && !originalSrcset.includes('images.weserv.nl')) {
                    // 解析并处理srcset字符串
                    const srcsetParts = originalSrcset.split(',').map(part => part.trim());
                    const newSrcsetParts = srcsetParts.map(part => {
                        const [url, descriptor] = part.split(/\s+/);
                        if (url && !url.includes('images.weserv.nl') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                            return `${getProxyUrl(url)} ${descriptor || ''}`.trim();
                        }
                        return part;
                    });
                    
                    // 保存原始值
                    img.setAttribute('data-original-srcset', originalSrcset);
                    
                    // 设置新的srcset
                    const newSrcset = newSrcsetParts.join(', ');
                    img.setAttribute('srcset', newSrcset);
                    processed = true;
                    debugLog('处理图片srcset');
                }
            }
        } catch (error) {
            debugLog('处理图片时出错:', error);
        }
        
        return processed;
    }
    
    // 处理懒加载图片
    function processLazyLoadImages() {
        // 常见的懒加载类名和属性
        const lazySelectors = [
            '[loading="lazy"]',
            '.lazyload', '.lazy', '.lazy-load', '.b-lazy',
            '[data-lazy]', '[data-lazyload]',
            '.js-lazy-image', '.js-lazy', '.js-lazyload',
            '[data-ll-status]', '[data-src]', '[data-original]'
        ];
        
        const lazyImages = document.querySelectorAll(lazySelectors.join(','));
        let count = 0;
        
        lazyImages.forEach(img => {
            if (img.tagName === 'IMG' && !shouldSkipElement(img)) {
                if (processImageSrc(img)) {
                    count++;
                }
            } else if (img.style && img.style.backgroundImage && !shouldSkipElement(img)) {
                if (processInlineBackground(img)) {
                    count++;
                }
            }
        });
        
        if (count > 0) {
            debugLog(`处理了${count}个懒加载图片`);
        }
    }
    
    // 处理iframe内的图片
    function processIframeImages() {
        const iframes = document.querySelectorAll('iframe');
        let count = 0;
        
        iframes.forEach(iframe => {
            try {
                // 只处理同源iframe
                if (iframe.contentDocument) {
                    const iframeImages = iframe.contentDocument.querySelectorAll('img');
                    iframeImages.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                    
                    // 处理iframe内的背景图片
                    if (config.processCssBackgrounds) {
                        const elementsWithBg = iframe.contentDocument.querySelectorAll('[style*="background-image"]');
                        elementsWithBg.forEach(el => {
                            if (!shouldSkipElement(el) && processInlineBackground(el)) {
                                count++;
                            }
                        });
                    }
                }
            } catch (e) {
                // 跨域iframe无法访问内容，这是预期的错误，不处理
            }
        });
        
        if (count > 0) {
            debugLog(`处理了${count}个iframe内图片`);
        }
    }
    
    // 拦截Image对象的创建
    function interceptImageElement() {
        debugLog('拦截Image对象');
        
        try {
            // 保存原始Image构造函数
            const originalImage = window.Image;
            
            // 创建新的构造函数
            window.Image = function() {
                // 调用原始构造函数
                const img = new originalImage(...arguments);
                
                // 拦截src属性的设置
                try {
                    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
                    
                    Object.defineProperty(img, 'src', {
                        get: originalDescriptor.get,
                        set: function(url) {
                            // 如果不是代理URL且不是data URL，则转换为代理URL
                            if (url && typeof url === 'string' && 
                                !url.includes('images.weserv.nl') && 
                                !url.startsWith('data:') && 
                                !url.startsWith('blob:')) {
                                
                                // 避免重复处理
                                if (config.preventDuplicateProcessing && processedUrls.has(url)) {
                                    originalDescriptor.set.call(this, url);
                                    return;
                                }
                                
                                // 保存原始URL
                                this.setAttribute('data-original', url);
                                
                                // 设置代理URL
                                const proxyUrl = getProxyUrl(url);
                                debugLog('拦截到新Image.src:', url.substring(0, 50) + (url.length > 50 ? '...' : ''));
                                processedUrls.add(url);
                                originalDescriptor.set.call(this, proxyUrl);
                            } else {
                                originalDescriptor.set.call(this, url);
                            }
                        },
                        configurable: true
                    });
                    
                    // 同样拦截srcset
                    if (Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset')) {
                        const originalSrcsetDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'srcset');
                        
                        Object.defineProperty(img, 'srcset', {
                            get: originalSrcsetDescriptor.get,
                            set: function(srcset) {
                                if (srcset && typeof srcset === 'string' && !srcset.includes('images.weserv.nl')) {
                                    // 保存原始srcset
                                    this.setAttribute('data-original-srcset', srcset);
                                    
                                    // 解析并处理srcset字符串
                                    const srcsetParts = srcset.split(',').map(part => part.trim());
                                    const newSrcsetParts = srcsetParts.map(part => {
                                        const [url, descriptor] = part.split(/\s+/);
                                        if (url && !url.includes('images.weserv.nl') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                                            return `${getProxyUrl(url)} ${descriptor || ''}`.trim();
                                        }
                                        return part;
                                    });
                                    
                                    // 设置新的srcset
                                    const newSrcset = newSrcsetParts.join(', ');
                                    originalSrcsetDescriptor.set.call(this, newSrcset);
                                } else {
                                    originalSrcsetDescriptor.set.call(this, srcset);
                                }
                            },
                            configurable: true
                        });
                    }
                } catch (e) {
                    debugLog('设置Image属性拦截时出错:', e);
                }
                
                return img;
            };
            
            // 确保继承原型链
            window.Image.prototype = originalImage.prototype;
            window.Image.prototype.constructor = window.Image;
        } catch (error) {
            debugLog('拦截Image对象时出错:', error);
        }
    }
    
    // 拦截XHR和Fetch请求
    function interceptXHRAndFetch() {
        debugLog('拦截XHR和Fetch请求');
        
        try {
            // 拦截XMLHttpRequest
            const originalXHROpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                // 只拦截GET请求，且URL看起来像图片
                if (method.toUpperCase() === 'GET' && typeof url === 'string' && isImageUrl(url)) {
                    if (!url.includes('images.weserv.nl') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                        const proxyUrl = getProxyUrl(url);
                        debugLog('拦截XHR图片请求:', url.substring(0, 50) + (url.length > 50 ? '...' : ''));
                        return originalXHROpen.call(this, method, proxyUrl, ...rest);
                    }
                }
                return originalXHROpen.call(this, method, url, ...rest);
            };
            
            // 拦截Fetch API
            const originalFetch = window.fetch;
            window.fetch = function(resource, init = {}) {
                if (typeof resource === 'string' && isImageUrl(resource) && 
                    (!init.method || init.method.toUpperCase() === 'GET') &&
                    !resource.includes('images.weserv.nl') && 
                    !resource.startsWith('data:') && 
                    !resource.startsWith('blob:')) {
                    
                    const proxyUrl = getProxyUrl(resource);
                    debugLog('拦截Fetch图片请求:', resource.substring(0, 50) + (resource.length > 50 ? '...' : ''));
                    return originalFetch.call(this, proxyUrl, init);
                }
                return originalFetch.call(this, resource, init);
            };
        } catch (error) {
            debugLog('拦截XHR和Fetch请求时出错:', error);
        }
    }
    
    // 判断URL是否为图片URL
    function isImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // 检查是否以常见图片扩展名结尾
        const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|avif|heic)($|\?)/i;
        
        // 检查URL路径部分
        try {
            const urlObj = new URL(url, window.location.href);
            return imageExtensions.test(urlObj.pathname) || 
                   urlObj.pathname.includes('/image') || 
                   urlObj.pathname.includes('/img/') ||
                   urlObj.search.includes('image') ||
                   urlObj.pathname.includes('/avatar/') ||
                   urlObj.pathname.includes('/thumb');
        } catch (e) {
            // 如果URL解析失败，直接检查字符串
            return imageExtensions.test(url) || 
                   url.includes('/image') || 
                   url.includes('/img/') ||
                   url.includes('image') ||
                   url.includes('/avatar/') ||
                   url.includes('/thumb');
        }
    }
    
    // 拦截CSS背景图片
    function interceptBackgroundImages() {
        debugLog('拦截CSS背景图片');
        
        try {
            // 创建一个样式元素，用于覆盖现有的背景图片
            const styleEl = document.createElement('style');
            styleEl.id = 'weserv-bg-interceptor';
            styleEl.setAttribute('type', 'text/css');
            document.head.appendChild(styleEl);
            
            // 获取所有样式表
            const styleSheets = Array.from(document.styleSheets);
            
            // 处理每个样式表
            styleSheets.forEach(sheet => {
                try {
                    // 跳过跨域样式表
                    if (sheet.href && new URL(sheet.href).origin !== window.location.origin) {
                        return;
                    }
                    
                    // 获取所有CSS规则
                    const rules = Array.from(sheet.cssRules || sheet.rules || []);
                    processRules(rules, styleEl.sheet);
                } catch (e) {
                    // 跳过有访问限制的样式表
                    debugLog('无法访问样式表', e);
                }
            });
            
            // 处理内联样式
            processInlineStyles();
        } catch (error) {
            debugLog('拦截CSS背景图片时出错:', error);
        }
    }
    
    // 处理CSS规则
    function processRules(rules, targetSheet) {
        if (!rules || !targetSheet) return;
        
        rules.forEach(rule => {
            try {
                // 处理样式规则
                if (rule.type === 1) { // CSSStyleRule
                    const bgImage = rule.style.backgroundImage;
                    if (bgImage && bgImage !== 'none' && !bgImage.includes('images.weserv.nl') && !bgImage.startsWith('data:')) {
                        // 提取URL
                        const matches = bgImage.match(/url\(['"]?(.*?)['"]?\)/gi);
                        if (matches) {
                            let newBgImage = bgImage;
                            let changed = false;
                            
                            matches.forEach(match => {
                                const urlMatch = match.match(/url\(['"]?(.*?)['"]?\)/i);
                                if (urlMatch && urlMatch[1]) {
                                    const originalUrl = urlMatch[1];
                                    
                                    if (!originalUrl.includes('images.weserv.nl') && !originalUrl.startsWith('data:') && !originalUrl.startsWith('blob:')) {
                                        const proxyUrl = getProxyUrl(originalUrl);
                                        newBgImage = newBgImage.replace(match, `url("${proxyUrl}")`);
                                        changed = true;
                                    }
                                }
                            });
                            
                            // 只有当背景图片实际改变时才添加规则
                            if (changed) {
                                try {
                                    const newRule = `${rule.selectorText} { background-image: ${newBgImage} !important; }`;
                                    targetSheet.insertRule(newRule, targetSheet.cssRules.length);
                                } catch (e) {
                                    debugLog('添加CSS规则时出错:', e);
                                }
                            }
                        }
                    }
                }
                // 处理@media规则
                else if (rule.type === 4) { // CSSMediaRule
                    processRules(Array.from(rule.cssRules), targetSheet);
                }
                // 处理@import规则
                else if (rule.type === 3) { // CSSImportRule
                    // 尝试处理导入的样式表
                    try {
                        if (rule.styleSheet) {
                            processRules(Array.from(rule.styleSheet.cssRules || []), targetSheet);
                        }
                    } catch (e) {
                        debugLog('无法访问导入的样式表', e);
                    }
                }
                // 处理@keyframes规则
                else if (rule.type === 7) { // CSSKeyframesRule
                    try {
                        const keyframesRules = Array.from(rule.cssRules);
                        keyframesRules.forEach(keyframeRule => {
                            if (keyframeRule.style && keyframeRule.style.backgroundImage) {
                                const bgImage = keyframeRule.style.backgroundImage;
                                if (bgImage && bgImage !== 'none' && !bgImage.includes('images.weserv.nl') && !bgImage.startsWith('data:')) {
                                    // 提取并处理URL，类似于处理普通规则
                                    const matches = bgImage.match(/url\(['"]?(.*?)['"]?\)/gi);
                                    if (matches) {
                                        let newBgImage = bgImage;
                                        let changed = false;
                                        
                                        matches.forEach(match => {
                                            const urlMatch = match.match(/url\(['"]?(.*?)['"]?\)/i);
                                            if (urlMatch && urlMatch[1]) {
                                                const originalUrl = urlMatch[1];
                                                if (!originalUrl.includes('images.weserv.nl') && !originalUrl.startsWith('data:')) {
                                                    const proxyUrl = getProxyUrl(originalUrl);
                                                    newBgImage = newBgImage.replace(match, `url("${proxyUrl}")`);
                                                    changed = true;
                                                }
                                            }
                                        });
                                        
                                        if (changed) {
                                            // 无法直接修改keyframe规则，所以我们为其创建一个覆盖
                                            const keyframeSelector = keyframeRule.keyText; // 如 "0%", "100%"
                                            const newRule = `@keyframes ${rule.name} { ${keyframeSelector} { background-image: ${newBgImage} !important; } }`;
                                            try {
                                                targetSheet.insertRule(newRule, targetSheet.cssRules.length);
                                            } catch (e) {
                                                debugLog('添加keyframe覆盖规则时出错:', e);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    } catch (e) {
                        debugLog('处理@keyframes规则时出错:', e);
                    }
                }
            } catch (e) {
                debugLog('处理CSS规则时出错:', e);
            }
        });
    }
    
    // 处理内联样式
    function processInlineStyles() {
        const elements = document.querySelectorAll('[style*="background-image"]');
        let count = 0;
        
        elements.forEach(el => {
            if (shouldSkipElement(el)) return;
            
            if (processInlineBackground(el)) {
                count++;
            }
        });
        
        if (count > 0) {
            debugLog(`处理了${count}个内联背景样式`);
        }
    }
    
    // 处理单个元素的内联背景
    function processInlineBackground(el) {
        try {
            const style = el.style.backgroundImage;
            if (!style || style === 'none' || style.includes('images.weserv.nl') || style.startsWith('data:') || style.startsWith('blob:')) {
                return false;
            }
            
            // 提取URL
            const matches = style.match(/url\(['"]?(.*?)['"]?\)/i);
            if (matches && matches[1]) {
                const originalUrl = matches[1];
                
                // 避免重复处理
                if (config.preventDuplicateProcessing && processedUrls.has(originalUrl)) {
                    return false;
                }
                
                if (!originalUrl.includes('images.weserv.nl') && !originalUrl.startsWith('data:') && !originalUrl.startsWith('blob:')) {
                    const proxyUrl = getProxyUrl(originalUrl);
                    
                    // 只有在URL确实改变时才修改
                    if (originalUrl !== proxyUrl) {
                        el.style.backgroundImage = `url("${proxyUrl}")`;
                        processedUrls.add(originalUrl);
                        debugLog('处理元素背景图片:', originalUrl.substring(0, 50) + (originalUrl.length > 50 ? '...' : ''));
                        return true;
                    }
                }
            }
        } catch (error) {
            debugLog('处理内联背景时出错:', error);
        }
        
        return false;
    }
    
    // 专门针对音乐播放器的观察器
    function setupMusicPlayerObserver() {
        debugLog('设置音乐播放器观察器');
        
        // 检测页面是否为音乐网站
        const isMusicSite = /(music|song|audio|player|spotify|pandora|deezer|tidal|soundcloud|bandcamp)/i.test(
            document.title + ' ' + window.location.hostname + ' ' + document.body.innerHTML
        );
        
        // 如果不是音乐站点，使用较低频率检查
        const checkInterval = isMusicSite ? 300 : 1000;
        
        // 定期检查常见的播放器元素
        const playerObserver = setInterval(() => {
            try {
                // 处理音乐播放器常见的封面元素
                const coverSelectors = [
                    '.album-cover', '.cover', '.artwork', '.album-art', '.song-cover',
                    '.player-cover', '.cd-cover', '.album-img', '.music-cover',
                    '[class*="cover"]', '[class*="artwork"]', '[class*="album"]',
                    '[id*="cover"]', '[id*="artwork"]', '[id*="album"]',
                    '.aplayer-pic', '.aplayer-cover', '.music-player-cover',
                    'audio[poster]', 'video[poster]', '.track-cover',
                    '.jp-cover', '.now-playing-cover', '.playing-cover',
                    '.musicInfo-cover', '[data-testid="cover-art-image"]',
                    '.cover-art', '.cover-image'
                ];
                
                const coverElements = document.querySelectorAll(coverSelectors.join(','));
                let count = 0;
                
                coverElements.forEach(el => {
                    if (shouldSkipElement(el)) return;
                    
                    // 处理元素背景
                    if (el.style && el.style.backgroundImage) {
                        if (processInlineBackground(el)) {
                            count++;
                        }
                    }
                    
                    // 处理poster属性 (用于audio/video元素)
                    if (el.hasAttribute('poster') && !el.hasAttribute('data-original-poster')) {
                        const posterUrl = el.getAttribute('poster');
                        if (posterUrl && !posterUrl.includes('images.weserv.nl') && !posterUrl.startsWith('data:') && !posterUrl.startsWith('blob:')) {
                            // 避免重复处理
                            if (config.preventDuplicateProcessing && processedUrls.has(posterUrl)) {
                                return;
                            }
                            
                            el.setAttribute('data-original-poster', posterUrl);
                            el.setAttribute('poster', getProxyUrl(posterUrl));
                            processedUrls.add(posterUrl);
                            count++;
                            debugLog('处理播放器封面(poster):', posterUrl.substring(0, 50) + (posterUrl.length > 50 ? '...' : ''));
                        }
                    }
                    
                    // 处理子元素中的图片
                    const coverImages = el.querySelectorAll('img');
                    coverImages.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                });
                
                if (count > 0) {
                    debugLog(`处理了${count}个音乐播放器图像元素`);
                }
            } catch (error) {
                debugLog('处理音乐播放器元素时出错:', error);
            }
        }, checkInterval);
        
        // 存储定时器，便于清理
        window._imageProxyHandler.timers = window._imageProxyHandler.timers || [];
        window._imageProxyHandler.timers.push(playerObserver);
    }
    
    // 为图片库/相册网站设置观察器
    function setupGalleryObserver() {
        debugLog('设置图片库观察器');
        
        // 检测页面是否为图库类型
        const isGallerySite = /(gallery|album|photo|image|picture|slide|carousel)/i.test(
            document.title + ' ' + window.location.hostname + ' ' + document.body.innerHTML
        );
        
        // 如果是图库类型，使用更高频率检查
        const checkInterval = isGallerySite ? 300 : 1000;
        
        // 定期检查常见的相册/轮播图元素
        const galleryObserver = setInterval(() => {
            try {
                const gallerySelectors = [
                    '.gallery', '.carousel', '.slider', '.slideshow', '.album',
                    '[class*="gallery"]', '[class*="carousel"]', '[class*="slider"]',
                    '[id*="gallery"]', '[id*="carousel"]', '[id*="slider"]',
                    '.img-container', '.photo-container', '.picture-container',
                    '.swiper-slide', '.slide-item', '.thumbnail',
                    '[role="listbox"]', '[role="slider"]', '[role="tabpanel"]'
                ];
                
                const galleryElements = document.querySelectorAll(gallerySelectors.join(','));
                let count = 0;
                
                galleryElements.forEach(gallery => {
                    // 处理画廊背景
                    if (gallery.style && gallery.style.backgroundImage && !shouldSkipElement(gallery)) {
                        if (processInlineBackground(gallery)) {
                            count++;
                        }
                    }
                    
                    // 处理画廊内的所有图片
                    const images = gallery.querySelectorAll('img');
                    images.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                    
                    // 处理画廊内的背景图片元素
                    const bgElements = gallery.querySelectorAll('[style*="background-image"]');
                    bgElements.forEach(el => {
                        if (!shouldSkipElement(el) && processInlineBackground(el)) {
                            count++;
                        }
                    });
                });
                
                if (count > 0) {
                    debugLog(`处理了${count}个图库元素`);
                }
            } catch (error) {
                debugLog('处理图库元素时出错:', error);
            }
        }, checkInterval);
        
        // 存储定时器，便于清理
        window._imageProxyHandler.timers = window._imageProxyHandler.timers || [];
        window._imageProxyHandler.timers.push(galleryObserver);
    }
    
    // 为社交媒体网站设置观察器
    function setupSocialMediaObserver() {
        debugLog('设置社交媒体观察器');
        
        // 检测页面是否为社交媒体
        const isSocialSite = /(facebook|twitter|instagram|linkedin|pinterest|reddit|tumblr|weibo|wechat|qq|tiktok)/i.test(
            window.location.hostname
        );
        
        // 如果是社交媒体，使用更高频率检查
        const checkInterval = isSocialSite ? 200 : 1000;
        
        // 定期检查社交媒体特有元素
        const socialObserver = setInterval(() => {
            try {
                const socialSelectors = [
                    '.avatar', '.profile-pic', '.profile-image', '.user-avatar',
                    '[class*="avatar"]', '[class*="profile"]', '[class*="user-pic"]',
                    '.post-image', '.tweet-image', '.status-image',
                    '.story-image', '.feed-item-image', '.timeline-image',
                    '.attachment', '.media-attachment', '.preview-image'
                ];
                
                const socialElements = document.querySelectorAll(socialSelectors.join(','));
                let count = 0;
                
                socialElements.forEach(el => {
                    // 处理元素背景
                    if (el.style && el.style.backgroundImage && !shouldSkipElement(el)) {
                        if (processInlineBackground(el)) {
                            count++;
                        }
                    }
                    
                    // 如果是图片元素
                    if (el.tagName === 'IMG' && !shouldSkipElement(el)) {
                        if (processImageSrc(el)) {
                            count++;
                        }
                    }
                    
                    // 处理子元素内的图片
                    const childImages = el.querySelectorAll('img');
                    childImages.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                });
                
                if (count > 0) {
                    debugLog(`处理了${count}个社交媒体元素`);
                }
            } catch (error) {
                debugLog('处理社交媒体元素时出错:', error);
            }
        }, checkInterval);
        
        // 存储定时器，便于清理
        window._imageProxyHandler.timers = window._imageProxyHandler.timers || [];
        window._imageProxyHandler.timers.push(socialObserver);
    }
    
    // 为电子商务网站设置观察器
    function setupEcommerceObserver() {
        debugLog('设置电子商务观察器');
        
        // 检测页面是否为电商网站
        const isEcommerceSite = /(shop|store|mall|product|buy|cart|checkout|price|order)/i.test(
            document.title + ' ' + window.location.hostname + ' ' + document.body.innerHTML
        );
        
        // 如果是电商网站，使用更高频率检查
        const checkInterval = isEcommerceSite ? 300 : 1000;
        
        // 定期检查电商特有元素
        const ecommerceObserver = setInterval(() => {
            try {
                const ecommerceSelectors = [
                    '.product-image', '.item-image', '.goods-image',
                    '[class*="product"]', '[class*="item-img"]', '[class*="goods-img"]',
                    '.thumbnail', '.preview', '.showcase',
                    '.cart-item-image', '.shop-item-image', '.merchandise-image',
                    '.catalog-image', '.zoom-image', '.magnify-image'
                ];
                
                const ecommerceElements = document.querySelectorAll(ecommerceSelectors.join(','));
                let count = 0;
                
                ecommerceElements.forEach(el => {
                    // 处理元素背景
                    if (el.style && el.style.backgroundImage && !shouldSkipElement(el)) {
                        if (processInlineBackground(el)) {
                            count++;
                        }
                    }
                    
                    // 如果是图片元素
                    if (el.tagName === 'IMG' && !shouldSkipElement(el)) {
                        if (processImageSrc(el)) {
                            count++;
                        }
                    }
                    
                    // 处理子元素内的图片
                    const childImages = el.querySelectorAll('img');
                    childImages.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                });
                
                if (count > 0) {
                    debugLog(`处理了${count}个电商元素`);
                }
            } catch (error) {
                debugLog('处理电商元素时出错:', error);
            }
        }, checkInterval);
        
        // 存储定时器，便于清理
        window._imageProxyHandler.timers = window._imageProxyHandler.timers || [];
        window._imageProxyHandler.timers.push(ecommerceObserver);
    }
    
    // 为视频网站设置观察器
    function setupVideoSiteObserver() {
        debugLog('设置视频网站观察器');
        
        // 检测页面是否为视频网站
        const isVideoSite = /(video|movie|film|tv|show|episode|stream|watch|youtube|vimeo|bilibili)/i.test(
            document.title + ' ' + window.location.hostname + ' ' + document.body.innerHTML
        );
        
        // 如果是视频网站，使用更高频率检查
        const checkInterval = isVideoSite ? 300 : 1000;
        
        // 定期检查视频网站特有元素
        const videoObserver = setInterval(() => {
            try {
                const videoSelectors = [
                    '.thumbnail', '.preview', '.poster', '.video-thumbnail',
                    '[class*="thumbnail"]', '[class*="poster"]', '[class*="preview"]',
                    '.episode-image', '.movie-cover', '.video-cover',
                    'video[poster]', '.recommend-cover', '.related-video-image',
                    '.channel-image', '.playlist-thumbnail'
                ];
                
                const videoElements = document.querySelectorAll(videoSelectors.join(','));
                let count = 0;
                
                videoElements.forEach(el => {
                    // 处理poster属性
                    if (el.hasAttribute('poster') && !el.hasAttribute('data-original-poster') && !shouldSkipElement(el)) {
                        const posterUrl = el.getAttribute('poster');
                        if (posterUrl && !posterUrl.includes('images.weserv.nl') && !posterUrl.startsWith('data:') && !posterUrl.startsWith('blob:')) {
                            // 避免重复处理
                            if (config.preventDuplicateProcessing && processedUrls.has(posterUrl)) {
                                return;
                            }
                            
                            el.setAttribute('data-original-poster', posterUrl);
                            el.setAttribute('poster', getProxyUrl(posterUrl));
                            processedUrls.add(posterUrl);
                            count++;
                            debugLog('处理视频海报:', posterUrl.substring(0, 50) + (posterUrl.length > 50 ? '...' : ''));
                        }
                    }
                    
                    // 处理元素背景
                    if (el.style && el.style.backgroundImage && !shouldSkipElement(el)) {
                        if (processInlineBackground(el)) {
                            count++;
                        }
                    }
                    
                    // 如果是图片元素
                    if (el.tagName === 'IMG' && !shouldSkipElement(el)) {
                        if (processImageSrc(el)) {
                            count++;
                        }
                    }
                    
                    // 处理子元素内的图片
                    const childImages = el.querySelectorAll('img');
                    childImages.forEach(img => {
                        if (!shouldSkipElement(img) && processImageSrc(img)) {
                            count++;
                        }
                    });
                });
                
                if (count > 0) {
                    debugLog(`处理了${count}个视频网站元素`);
                }
            } catch (error) {
                debugLog('处理视频网站元素时出错:', error);
            }
        }, checkInterval);
        
        // 存储定时器，便于清理
        window._imageProxyHandler.timers = window._imageProxyHandler.timers || [];
        window._imageProxyHandler.timers.push(videoObserver);
    }
    
    // 设置MutationObserver监听动态添加的元素
    function setupImageObserver() {
        debugLog('设置DOM变化观察器');
        
        try {
            // 创建一个观察器实例
            const observer = new MutationObserver(mutations => {
                let newImages = [];
                let newBgElements = [];
                let newMediaElements = [];
                
                mutations.forEach(mutation => {
                    // 处理新增的节点
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(node => {
                            try {
                                // 如果是图片元素
                                if (node.nodeName === 'IMG' && !shouldSkipElement(node)) {
                                    newImages.push(node);
                                }
                                
                                // 如果是音频/视频元素
                                if ((node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') && 
                                    node.hasAttribute('poster') && 
                                    !node.hasAttribute('data-original-poster') && 
                                    !shouldSkipElement(node)) {
                                    newMediaElements.push(node);
                                }
                                
                                // 处理子元素中的图片和背景
                                if (node.querySelectorAll) {
                                    // 收集需要处理的元素
                                    const images = Array.from(node.querySelectorAll('img'))
                                        .filter(img => !shouldSkipElement(img));
                                    newImages.push(...images);
                                    
                                    const mediaElements = Array.from(node.querySelectorAll('audio[poster], video[poster]'))
                                        .filter(media => !media.hasAttribute('data-original-poster') && !shouldSkipElement(media));
                                    newMediaElements.push(...mediaElements);
                                    
                                    if (config.processCssBackgrounds) {
                                        const elementsWithBg = Array.from(node.querySelectorAll('[style*="background-image"]'))
                                            .filter(el => !shouldSkipElement(el));
                                        newBgElements.push(...elementsWithBg);
                                    }
                                }
                                
                                // 处理新添加元素的内联背景
                                if (config.processCssBackgrounds && 
                                    node.style && 
                                    node.style.backgroundImage && 
                                    !shouldSkipElement(node)) {
                                    newBgElements.push(node);
                                }
                            } catch (e) {
                                debugLog('处理新增节点时出错:', e);
                            }
                        });
                    }
                    
                    // 处理修改的属性
                    if (mutation.type === 'attributes') {
                        const target = mutation.target;
                        
                        try {
                            // 如果修改的是相关属性且目标是img元素
                            if ((mutation.attributeName === 'src' || 
                                 mutation.attributeName === 'data-src' || 
                                 mutation.attributeName === 'data-lazy-src' ||
                                 mutation.attributeName === 'data-cover' ||
                                 mutation.attributeName === 'srcset') && 
                                target.nodeName === 'IMG' && 
                                !shouldSkipElement(target)) {
                                
                                // 优化：只在属性值确实发生变化时才处理
                                const attrValue = target.getAttribute(mutation.attributeName);
                                const originalAttr = target.getAttribute(`data-original-${mutation.attributeName}`);
                                
                                // 如果属性值变化了且不是我们设置的代理值
                                if (attrValue && (!originalAttr || attrValue !== getProxyUrl(originalAttr))) {
                                    newImages.push(target);
                                }
                            }
                            
                            // 如果修改的是poster属性且目标是audio/video元素
                            if (mutation.attributeName === 'poster' && 
                                (target.nodeName === 'AUDIO' || target.nodeName === 'VIDEO') && 
                                !target.hasAttribute('data-original-poster') && 
                                !shouldSkipElement(target)) {
                                newMediaElements.push(target);
                            }
                            
                            // 如果修改的是style属性且背景图发生变化
                            if (config.processCssBackgrounds && 
                                mutation.attributeName === 'style' && 
                                target.style && 
                                target.style.backgroundImage && 
                                !shouldSkipElement(target)) {
                                newBgElements.push(target);
                            }
                        } catch (e) {
                            debugLog('处理属性变更时出错:', e);
                        }
                    }
                });
                
                // 批量处理收集到的元素，减少页面重绘
                let count = 0;
                
                // 处理图片元素
                if (newImages.length > 0) {
                    newImages.forEach(img => {
                        if (processImageSrc(img)) {
                            count++;
                        }
                    });
                }
                
                // 处理背景图片元素
                if (newBgElements.length > 0) {
                    newBgElements.forEach(el => {
                        if (processInlineBackground(el)) {
                            count++;
                        }
                    });
                }
                
                // 处理媒体元素的海报
                if (newMediaElements.length > 0) {
                    newMediaElements.forEach(media => {
                        const posterUrl = media.getAttribute('poster');
                        if (posterUrl && !posterUrl.includes('images.weserv.nl') && !posterUrl.startsWith('data:') && !posterUrl.startsWith('blob:')) {
                            // 避免重复处理
                            if (config.preventDuplicateProcessing && processedUrls.has(posterUrl)) {
                                return;
                            }
                            
                            media.setAttribute('data-original-poster', posterUrl);
                            media.setAttribute('poster', getProxyUrl(posterUrl));
                            processedUrls.add(posterUrl);
                            count++;
                        }
                    });
                }
                
                if (count > 0) {
                    debugLog(`通过DOM观察器处理了${count}个元素`);
                }
            });
            
            // 配置观察选项，使用防抖减少频繁处理
            const debouncedCallback = observer.callback;
            observer.callback = debounce(debouncedCallback, 100);
            
            const observerConfig = {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: [
                    'src', 'data-src', 'data-lazy-src', 'data-cover', 
                    'poster', 'style', 'srcset', 'data-srcset'
                ]
            };
            
            // 开始观察整个文档
            observer.observe(document, observerConfig);
            
            // 存储观察器，便于清理
            window._imageProxyHandler.observers = window._imageProxyHandler.observers || [];
            window._imageProxyHandler.observers.push(observer);
        } catch (error) {
            debugLog('设置DOM观察器时出错:', error);
        }
    }
    
    // 获取代理URL
    function getProxyUrl(originalUrl) {
        // 如果URL为空，直接返回
        if (!originalUrl || typeof originalUrl !== 'string') {
            return originalUrl;
        }
        
        try {
            // 如果已经是代理URL或者是data URL或blob URL，直接返回
            if (originalUrl.includes('images.weserv.nl') || 
                originalUrl.startsWith('data:') || 
                originalUrl.startsWith('blob:') ||
                originalUrl.startsWith('javascript:')) {
                return originalUrl;
            }
            
            // 判断是否为完整URL（以http://或https://开头）
            if (originalUrl.match(/^https?:\/\//i)) {
                // 直接添加代理前缀
                return config.proxyPrefix + encodeURIComponent(originalUrl);
            } 
            // 判断是否为://开头的协议相对URL
            else if (originalUrl.startsWith('//')) {
                // 添加https:并加上代理前缀
                return config.proxyPrefix + encodeURIComponent('https:' + originalUrl);
            }
            // 判断是否为根路径（以/开头）
            else if (originalUrl.startsWith('/')) {
                // 组合完整URL并添加代理前缀
                return config.proxyPrefix + encodeURIComponent(baseUrl + originalUrl);
            }
            // 相对路径
            else {
                // 获取当前路径
                const currentPath = window.location.pathname;
                // 获取当前路径的目录部分
                const directory = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
                // 组合完整URL并添加代理前缀
                return config.proxyPrefix + encodeURIComponent(baseUrl + directory + originalUrl);
            }
        } catch (error) {
            debugLog('获取代理URL时出错:', error, originalUrl);
            return originalUrl; // 出错时返回原始URL
        }
    }
    
    // 清理函数 - 移除所有计时器和观察器
    function cleanup() {
        try {
            // 清除定时器
            if (window._imageProxyHandler.timers) {
                window._imageProxyHandler.timers.forEach(timer => clearInterval(timer));
            }
            
            // 断开观察器
            if (window._imageProxyHandler.observers) {
                window._imageProxyHandler.observers.forEach(observer => observer.disconnect());
            }
            
            console.log('✅ 图片代理转换已清理');
        } catch (e) {
            console.error('❌ 清理图片代理时出错:', e);
        }
    }
    
    // 提供停止方法，便于用户手动停止
    window._imageProxyHandler.stop = cleanup;
    
    // 启动代理系统
    initialize();
    
    // 确保在页面卸载时清理资源
    window.addEventListener('beforeunload', cleanup);
    
})();
