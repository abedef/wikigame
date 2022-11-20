import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    try {
        const res = await fetch('https://en.wikipedia.org/wiki/Special:Random');
        let html = await res.text();
        let srcRegex = /<link rel="canonical" href="([^"]+)"\/>/;
        let titleRegex = /<meta property="og:title" content="([^"]+)"\/>/;
        let src = html.match(srcRegex)[1];
        let title = html.match(titleRegex)[1];
        return { src, html, title };
    } catch (error) {
        return { error };
    }
}