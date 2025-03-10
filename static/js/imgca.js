/**
 * 自动检测页面中所有图片URL并添加images.weserv.nl代理
 * 优化版本：直接加载代理图片，不加载原始图片
 */
(function() {
    // 配置项
    const config = {
        proxyPrefix: 'https://images.weserv.nl/?url=',
        processCssBackgrounds: true,  // 是否处理CSS背景图片
        processDynamicImages: true    // 是否处理动态加载的图片
    };
    
    // 当前网站的域名和协议
    const baseUrl = window.location.origin;
    
    // 立即执行处理现有图片
    processExistingImages();
    
    // 如果启用了CSS背景处理，则创建拦截样式表
    if (config.processCssBackgrounds) {
        interceptBackgroundImages();
    }
    
    // 如果启用了动态图片处理，设置DOM观察器
    if (config.processDynamicImages) {
        setupImageObserver();
    }
    
    // 拦截未来可能通过JavaScript添加的图片
    interceptImageElement();
    
    // 使用DOM拦截处理现有图片
    function processExistingImages() {
        // 处理所有当前页面上的图片
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            processImageSrc(img);
        });
    }
    
    // 处理图片src属性
    function processImageSrc(img) {
        // 如果图片有src但没有data-original属性，表示尚未处理过
        if (img.src && !img.hasAttribute('data-original')) {
            const originalSrc = img.getAttribute('src');
            
            // 如果已经是代理URL或者是data URL，则跳过
            if (originalSrc.includes('images.weserv.nl') || originalSrc.startsWith('data:')) {
                return;
            }
            
            // 保存原始URL
            img.setAttribute('data-original', originalSrc);
            
            // 设置代理URL
            img.setAttribute('src', getProxyUrl(originalSrc));
        }
        
        // 处理懒加载属性 (如data-src, data-lazy-src等)
        const lazyAttributes = ['data-src', 'data-lazy-src', 'data-original', 'lazy-src'];
        lazyAttributes.forEach(attr => {
            if (img.hasAttribute(attr) && !img.hasAttribute(`data-original-${attr}`)) {
                const originalValue = img.getAttribute(attr);
                
                // 跳过已代理或data URL
                if (originalValue.includes('images.weserv.nl') || originalValue.startsWith('data:')) {
                    return;
                }
                
                // 保存原始值
                img.setAttribute(`data-original-${attr}`, originalValue);
                
                // 设置代理URL
                img.setAttribute(attr, getProxyUrl(originalValue));
            }
        });
    }
    
    // 拦截Image对象的创建
    function interceptImageElement() {
        // 保存原始Image构造函数
        const originalImage = window.Image;
        
        // 创建新的构造函数
        window.Image = function() {
            // 调用原始构造函数
            const img = new originalImage(...arguments);
            
            // 拦截src属性的设置
            const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            Object.defineProperty(img, 'src', {
                get: originalDescriptor.get,
                set: function(url) {
                    // 如果不是代理URL且不是data URL，则转换为代理URL
                    if (!url.includes('images.weserv.nl') && !url.startsWith('data:')) {
                        // 保存原始URL
                        this.setAttribute('data-original', url);
                        // 设置代理URL
                        originalDescriptor.set.call(this, getProxyUrl(url));
                    } else {
                        originalDescriptor.set.call(this, url);
                    }
                }
            });
            
            return img;
        };
        
        // 确保继承原型链
        window.Image.prototype = originalImage.prototype;
    }
    
    // 拦截CSS背景图片
    function interceptBackgroundImages() {
        // 创建一个样式元素，用于覆盖现有的背景图片
        const styleEl = document.createElement('style');
        styleEl.id = 'weserv-bg-interceptor';
        document.head.appendChild(styleEl);
        
        // 获取所有样式表
        const styleSheets = Array.from(document.styleSheets);
        
        try {
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
                    console.warn('Unable to access stylesheet', e);
                }
            });
        } catch (e) {
            console.warn('Error processing CSS background images', e);
        }
        
        // 处理内联样式
        processInlineStyles();
    }
    
    // 处理CSS规则
    function processRules(rules, targetSheet) {
        rules.forEach(rule => {
            try {
                // 处理样式规则
                if (rule.type === 1) { // CSSStyleRule
                    const bgImage = rule.style.backgroundImage;
                    if (bgImage && bgImage !== 'none' && !bgImage.includes('images.weserv.nl') && !bgImage.startsWith('data:')) {
                        // 提取URL
                        const matches = bgImage.match(/url\(['"]?(.*?)['"]?\)/i);
                        if (matches && matches[1]) {
                            const originalUrl = matches[1];
                            const proxyUrl = getProxyUrl(originalUrl);
                            
                            // 创建新规则覆盖原始规则
                            const newRule = `${rule.selectorText} { background-image: url("${proxyUrl}") !important; }`;
                            targetSheet.insertRule(newRule, targetSheet.cssRules.length);
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
                        console.warn('Unable to access imported stylesheet', e);
                    }
                }
            } catch (e) {
                console.warn('Error processing CSS rule', e);
            }
        });
    }
    
    // 处理内联样式
    function processInlineStyles() {
        const elements = document.querySelectorAll('[style*="background-image"]');
        elements.forEach(el => {
            const style = el.style.backgroundImage;
            if (style && style !== 'none' && !style.includes('images.weserv.nl') && !style.startsWith('data:')) {
                // 提取URL
                const matches = style.match(/url\(['"]?(.*?)['"]?\)/i);
                if (matches && matches[1]) {
                    const originalUrl = matches[1];
                    const proxyUrl = getProxyUrl(originalUrl);
                    
                    // 直接设置新的背景图片
                    el.style.backgroundImage = `url("${proxyUrl}")`;
                }
            }
        });
    }
    
    // 设置MutationObserver监听动态添加的元素
    function setupImageObserver() {
        // 创建一个观察器实例
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                // 处理新增的节点
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        // 如果是图片元素
                        if (node.nodeName === 'IMG') {
                            processImageSrc(node);
                        }
                        
                        // 处理子元素中的图片
                        if (node.querySelectorAll) {
                            const images = node.querySelectorAll('img');
                            images.forEach(img => processImageSrc(img));
                        }
                        
                        // 处理新添加元素的内联背景
                        if (config.processCssBackgrounds && node.style && node.style.backgroundImage) {
                            processInlineBackground(node);
                        }
                        
                        // 处理子元素中的内联背景
                        if (config.processCssBackgrounds && node.querySelectorAll) {
                            const elementsWithBg = node.querySelectorAll('[style*="background-image"]');
                            elementsWithBg.forEach(el => processInlineBackground(el));
                        }
                    });
                }
                
                // 处理修改的属性
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    
                    // 如果修改的是src属性且目标是img元素
                    if (mutation.attributeName === 'src' && target.nodeName === 'IMG') {
                        processImageSrc(target);
                    }
                    
                    // 如果修改的是style属性
                    if (config.processCssBackgrounds && mutation.attributeName === 'style') {
                        processInlineBackground(target);
                    }
                }
            });
        });
        
        // 配置观察选项
        const config = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'data-src', 'data-lazy-src', 'style']
        };
        
        // 开始观察整个文档
        observer.observe(document, config);
    }
    
    // 处理单个元素的内联背景
    function processInlineBackground(el) {
        const style = el.style.backgroundImage;
        if (style && style !== 'none' && !style.includes('images.weserv.nl') && !style.startsWith('data:')) {
            // 提取URL
            const matches = style.match(/url\(['"]?(.*?)['"]?\)/i);
            if (matches && matches[1]) {
                const originalUrl = matches[1];
                const proxyUrl = getProxyUrl(originalUrl);
                
                // 直接设置新的背景图片
                el.style.backgroundImage = `url("${proxyUrl}")`;
            }
        }
    }
    
    // 获取代理URL
    function getProxyUrl(originalUrl) {
        // 如果已经是代理URL或者是data URL，直接返回
        if (originalUrl.includes('images.weserv.nl') || originalUrl.startsWith('data:')) {
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
    }
    
    console.log('✅ 图片代理转换已启用：所有图片将通过 images.weserv.nl 加载');
})();
