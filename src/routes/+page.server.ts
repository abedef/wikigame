// import * as db from '$lib/server/database';
import type { PageServerLoad } from './$types';

let count = -0.5;

export const load: PageServerLoad = async ({ params }) => {
    count += 0.5;
    return {
        name: "ABED",
        count,
        // post: await db.getPost(params.slug)
    };
}