(function() {
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        const images = document.querySelectorAll('img');
        const baseUrl = document.querySelector('base')?.href || window.location.origin;
        
        images.forEach(img => {
            let src = img.getAttribute('src');
            if (!src || src.trim() === '') return; // 跳过无src或空src的图片

            // 跳过已经是代理URL的图片
            if (/^https?:\/\/images\.weserv\.nl\/\?url=/i.test(src)) return;

            // 处理相对路径
            if (!/^https?:\/\//i.test(src)) {
                try {
                    src = new URL(src, baseUrl).href;
                } catch(e) {
                    console.warn('Invalid image URL:', src);
                    return; // 跳过无效URL
                }
            }
            
            // 生成代理URL并更新
            img.src = 'https://images.weserv.nl/?url=' + 
                     encodeURIComponent(src.replace(/^https?:\/\//, ''));
        });
    });
})();
