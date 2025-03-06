(function() {
    // 获取页面中所有的图片元素
    const images = document.querySelectorAll('img');

    // 获取当前页面的完整URL
    const baseUrl = window.location.origin;

    // 遍历所有图片元素
    images.forEach(img => {
        // 获取图片的src属性
        let src = img.getAttribute('src');

        // 判断是否是本地路径（不以http://或https://开头）
        if (!src.startsWith('http://') && !src.startsWith('https://')) {
            // 如果是本地路径，拼接完整URL
            src = baseUrl + src;
        }

        // 添加https://images.weserv.nl/?url=前缀
        src = 'https://images.weserv.nl/?url=' + encodeURIComponent(src);

        // 更新图片的src属性
        img.setAttribute('src', src);
    });
})();
