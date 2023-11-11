// import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import PocketBase from "pocketbase";
import { env } from "$env/dynamic/public";

const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

type GameArticle = {
  id: string;
  url: string;
  title: string;
};

export const load: PageServerLoad = async () => {
  const article = await pb
    .collection<GameArticle>("articles")
    .getFirstListItem("", {
      sort: "@random",
      // expand: 'relField1,relField2.subRelField',
    });

  //   throw error(500, "failed to fetch random wikipedia article url");

  return {
    src: article.url.replace("https://en.", "https://en.m."),
    title: article.title,
  };
};
