// navigation.js
let requestPageCallback = null;

export function initNavigation(contentEl, requestPage) {
    requestPageCallback = requestPage;

    function attachLinkInterceptors(){
        const links = contentEl.querySelectorAll('a[href]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                requestPage(href);
                history.pushState({path: href}, '', href);
            });
        });
    }

    // dipanggil ulang setiap halaman baru dimuat
    return attachLinkInterceptors;
}

export function initPopState() {
    window.addEventListener('popstate', (e) => {
        const path = e.state ? e.state.path : location.pathname;
        if (requestPageCallback) requestPageCallback(path);
    });
}
