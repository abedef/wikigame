// import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import PocketBase from "pocketbase";

const pb = new PocketBase(
  true ? "http://100.77.33.133:8088" : "https://pocketbase.genieindex.ca"
);

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
