// main.js
import { connect, requestPage } from './websocket.js';
import { initNavigation, initPopState } from './navigation.js';

const contentEl = document.getElementById('content');

function onPageLoaded() {
    const attachLinkInterceptors = initNavigation(contentEl, requestPage);
    attachLinkInterceptors();
}

initPopState();
connect(contentEl, onPageLoaded);
