import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    return await fetch('/wikipedia', { mode: 'same-origin' }).then(res => {
        if (!res.ok) {
            throw error(500, "failed to fetch random wikipedia article url");
        }
        return res.text();
    }).then(src => {
        return { src };
    }).catch(err => {
        console.log(`Failed to fetch and return random Wikipedia page content: ${err}`);
        return { src: "" };
    });
}